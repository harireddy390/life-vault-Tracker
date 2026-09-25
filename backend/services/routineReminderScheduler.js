const ScheduleBlock = require('../models/ScheduleBlock');
const PushSubscription = require('../models/PushSubscription');
const RoutineReminderLog = require('../models/RoutineReminderLog');
const User = require('../models/User');
const notificationService = require('./notificationService');

let schedulerTimer = null;
let isProcessing = false;

// Default reminder window: 5 minutes prior to start
const REMINDER_OFFSET_MINUTES = 5;

/**
 * Derives local time components for a given IANA timezone
 */
function getUserLocalTimeParts(timezone = 'Asia/Kolkata', date = new Date()) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const map = {};
    for (const p of parts) map[p.type] = p.value;

    const year = map.year;
    const month = map.month;
    const day = map.day;
    const hour = parseInt(map.hour, 10) % 24;
    const minute = parseInt(map.minute, 10);
    const dateStr = `${year}-${month}-${day}`;
    const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const weekdayFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const weekdayShort = weekdayFormatter.format(date);
    const dayOfWeekMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const dayOfWeek = dayOfWeekMap[weekdayShort] ?? 0;
    const totalMinutes = hour * 60 + minute;

    return { dateStr, timeStr, hour, minute, dayOfWeek, totalMinutes };
  } catch {
    // Fallback to IST if invalid timezone string passed
    const istOffsetMs = (5 * 60 + 30) * 60 * 1000;
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const ist = new Date(utcMs + istOffsetMs);
    const year = ist.getFullYear();
    const month = String(ist.getMonth() + 1).padStart(2, '0');
    const day = String(ist.getDate()).padStart(2, '0');
    const hour = ist.getHours();
    const minute = ist.getMinutes();
    return {
      dateStr: `${year}-${month}-${day}`,
      timeStr: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
      hour,
      minute,
      dayOfWeek: ist.getDay(),
      totalMinutes: hour * 60 + minute,
    };
  }
}

function timeStringToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Evaluates routine reminders for all users with active push subscriptions
 */
async function processReminders(customNow = null) {
  if (isProcessing) return [];
  isProcessing = true;
  const results = [];

  try {
    // 1. Find all distinct users who have active push subscriptions
    const subscribedUserIds = await PushSubscription.distinct('user');
    if (!subscribedUserIds || subscribedUserIds.length === 0) {
      isProcessing = false;
      return results;
    }

    const now = customNow instanceof Date ? customNow : new Date();

    for (const userId of subscribedUserIds) {
      try {
        const user = await User.findById(userId).select('name timezone').lean();
        const userTimezone = user?.timezone || 'Asia/Kolkata';

        const { dateStr, timeStr, dayOfWeek, totalMinutes } = getUserLocalTimeParts(userTimezone, now);

        // 2. Fetch all schedule blocks for this user applicable today
        const blocks = await ScheduleBlock.find({
          user: userId,
          $or: [
            { isRecurring: true, daysOfWeek: dayOfWeek },
            { isRecurring: false, date: dateStr },
          ],
        }).lean();

        for (const block of blocks) {
          // Verify block is not skipped for today
          if (Array.isArray(block.skippedDates) && block.skippedDates.includes(dateStr)) {
            continue;
          }

          const routineStartMinutes = timeStringToMinutes(block.startTime);
          const diffMinutes = routineStartMinutes - totalMinutes;

          // Check if routine starts within the 5-minute reminder window
          // Window: diffMinutes is between 1 and REMINDER_OFFSET_MINUTES (inclusive, default 5)
          if (diffMinutes > 0 && diffMinutes <= REMINDER_OFFSET_MINUTES) {
            const occurrenceKey = `${block._id}_${dateStr}`;

            // 3. Atomically check and create reminder log for idempotency across server restarts
            try {
              const reminderLog = await RoutineReminderLog.create({
                user: userId,
                scheduleBlock: block._id,
                occurrenceKey,
                routineTitle: block.title,
                scheduledStartTime: block.startTime,
                dateStr,
              });

              // If log creation succeeded, send the push notification
              const notificationPayload = {
                title: '🔔 Life Vault Reminder',
                body: `${block.title} starts in ${diffMinutes} minute${diffMinutes === 1 ? '' : 's'}.`,
                data: {
                  url: '/command',
                  blockId: String(block._id),
                  scheduledTime: block.startTime,
                },
                tag: `routine-${block._id}-${dateStr}`,
              };

              const deliveryResult = await notificationService.sendNotificationToUser(
                userId,
                notificationPayload
              );

              // Update devices notified count
              reminderLog.devicesNotified = deliveryResult.successful;
              await reminderLog.save().catch(() => {});

              results.push({
                scheduleBlockId: block._id,
                routineTitle: block.title,
                scheduledStartTime: block.startTime,
                dateStr,
                diffMinutes,
                devicesNotified: deliveryResult.successful,
              });
            } catch (dupErr) {
              // Duplicate key error (code 11000) indicates reminder was already sent for this occurrence
              if (dupErr.code !== 11000) {
                console.error('[Reminder] Error processing reminder log:', dupErr.message);
              }
            }
          }
        }
      } catch (userErr) {
        console.error(`[Reminder] Error processing user ${userId}:`, userErr.message);
      }
    }
    return results;
  } catch (err) {
    console.error('[Reminder] Scheduler run error:', err.message);
    return results;
  } finally {
    isProcessing = false;
  }
}

/**
 * Starts the reminder background interval
 */
function startScheduler(intervalMs = 30000) {
  if (schedulerTimer) clearInterval(schedulerTimer);
  console.log(`⏰ Routine reminder scheduler started (interval: ${intervalMs}ms)`);
  // Run initial check after short initial delay
  setTimeout(() => processReminders(), 3000);
  schedulerTimer = setInterval(processReminders, intervalMs);
}

function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}

module.exports = {
  startScheduler,
  stopScheduler,
  processReminders,
  getUserLocalTimeParts,
  getLocalTimeInZone: getUserLocalTimeParts,
  checkAndSendUpcomingReminders: processReminders,
  REMINDER_OFFSET_MINUTES,
};
