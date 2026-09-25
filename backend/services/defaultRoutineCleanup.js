const ScheduleBlock = require('../models/ScheduleBlock');
const RoutineReminderLog = require('../models/RoutineReminderLog');

/**
 * The 22 exact system-generated default routine templates historically seeded by the backend.
 * Each template has a specific combination of title, timing, category, priority, daysOfWeek, and order.
 */
const SEEDED_DEFAULT_ROUTINES = [
  // Weekday templates (order 0..16, daysOfWeek: [1, 2, 3, 4, 5])
  { title: 'Wake', startTime: '07:00', endTime: '07:05', category: 'routine', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5], order: 0 },
  { title: 'Sunlight', startTime: '07:05', endTime: '07:15', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 1 },
  { title: 'Hygiene', startTime: '07:15', endTime: '07:30', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 2 },
  { title: 'Meal preparation', startTime: '07:30', endTime: '07:45', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 3 },
  { title: 'Breakfast / preparation', startTime: '07:45', endTime: '08:30', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 4 },
  { title: 'Commute', startTime: '08:30', endTime: '09:00', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 5 },
  { title: 'College', startTime: '09:00', endTime: '16:30', category: 'college', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5], order: 6 },
  { title: 'Commute back', startTime: '16:30', endTime: '17:00', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 7 },
  { title: 'Gym preparation', startTime: '17:00', endTime: '17:15', category: 'gym', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 8 },
  { title: 'Warm-up', startTime: '17:15', endTime: '17:35', category: 'gym', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 9 },
  { title: 'Gym', startTime: '17:35', endTime: '18:45', category: 'gym', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5], order: 10 },
  { title: 'Walk back', startTime: '18:45', endTime: '19:05', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 11 },
  { title: 'Cooking / shower', startTime: '19:05', endTime: '19:20', category: 'routine', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 12 },
  { title: 'Dinner preparation', startTime: '19:20', endTime: '19:45', category: 'routine', priority: 'medium', daysOfWeek: [1, 2, 3, 4, 5], order: 13 },
  { title: 'Academic work / coding', startTime: '19:45', endTime: '21:30', category: 'study', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5], order: 14 },
  { title: 'Buffer / prepare for next day', startTime: '21:30', endTime: '22:30', category: 'personal', priority: 'low', daysOfWeek: [1, 2, 3, 4, 5], order: 15 },
  { title: 'Lights out', startTime: '22:30', endTime: '23:00', category: 'rest', priority: 'high', daysOfWeek: [1, 2, 3, 4, 5], order: 16 },

  // Weekend templates (order 50..54)
  { title: 'Wake', startTime: '07:00', endTime: '08:00', category: 'routine', priority: 'high', daysOfWeek: [0, 6], order: 50 },
  { title: 'B.Tech coding/projects', startTime: '08:00', endTime: '12:00', category: 'study', priority: 'high', daysOfWeek: [0, 6], order: 51 },
  { title: 'Grocery / meal preparation', startTime: '12:00', endTime: '14:00', category: 'routine', priority: 'medium', daysOfWeek: [0], order: 52 },
  { title: 'Gym rest / recovery', startTime: '17:35', endTime: '18:45', category: 'rest', priority: 'medium', daysOfWeek: [0, 6], order: 53 },
  { title: 'Lights out', startTime: '22:30', endTime: '23:00', category: 'rest', priority: 'high', daysOfWeek: [0, 6], order: 54 },
];

/**
 * Builds the exact Mongo query matching only legacy system-generated default routines.
 * Guaranteed not to match any legitimate user-created routines.
 */
function buildDefaultRoutinesQuery() {
  const orClauses = SEEDED_DEFAULT_ROUTINES.map((t) => ({
    title: t.title,
    startTime: t.startTime,
    endTime: t.endTime,
    category: t.category,
    priority: t.priority,
    order: t.order,
    isRecurring: true,
    daysOfWeek: t.daysOfWeek,
    linkedTask: null,
    linkedGoal: null,
    linkedLearning: null,
    linkedWorkout: null,
  }));

  return { $or: orClauses };
}

/**
 * Safely removes old system-generated default routine blocks across all existing users.
 * Never touches or deletes user-created routines.
 * Idempotent: Can be run multiple times safely.
 */
async function cleanupDefaultRoutines() {
  try {
    const query = buildDefaultRoutinesQuery();

    // Find IDs first so we can also clean any orphaned reminder logs
    const legacyBlocks = await ScheduleBlock.find(query).select('_id').lean();
    if (legacyBlocks.length === 0) {
      return { deletedCount: 0, removedReminderLogs: 0 };
    }

    const legacyBlockIds = legacyBlocks.map((b) => b._id);

    // Delete matching legacy schedule blocks
    const deleteResult = await ScheduleBlock.deleteMany({ _id: { $in: legacyBlockIds } });

    // Clean up any stale reminder logs pointing to those deleted legacy blocks
    const logDeleteResult = await RoutineReminderLog.deleteMany({
      scheduleBlock: { $in: legacyBlockIds },
    });

    console.log(
      `[CLEANUP] Safely removed ${deleteResult.deletedCount} old system-generated default routines and ${logDeleteResult.deletedCount} orphaned reminder logs.`
    );

    return {
      deletedCount: deleteResult.deletedCount,
      removedReminderLogs: logDeleteResult.deletedCount,
    };
  } catch (err) {
    console.error('[CLEANUP ERROR] Failed to clean up default routines:', err);
    throw err;
  }
}

module.exports = {
  SEEDED_DEFAULT_ROUTINES,
  buildDefaultRoutinesQuery,
  cleanupDefaultRoutines,
};
