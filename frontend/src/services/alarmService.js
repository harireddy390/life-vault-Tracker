const alarmService = {
  scheduleTaskAlarm: async (task) => {
    try {
      // Check if native Android alarm bridge exists
      if (window.AndroidAlarmManager && typeof window.AndroidAlarmManager.setAlarm === 'function') {
        const reminderTimestamp = parseReminderTime(task.reminderTime);
        await window.AndroidAlarmManager.setAlarm(task._id, task.text, reminderTimestamp);
        console.log(`Native alarm successfully scheduled for: ${task.text}`);
        return true;
      }
      console.warn('Native Android AlarmManager bridge not available. Fallback to web notifications.');
      return false;
    } catch (error) {
      console.error('Failed to schedule native alarm:', error);
      return false;
    }
  },

  cancelTaskAlarm: async (taskId) => {
    try {
      if (window.AndroidAlarmManager && typeof window.AndroidAlarmManager.cancelAlarm === 'function') {
        await window.AndroidAlarmManager.cancelAlarm(taskId);
      }
    } catch (error) {
      console.error('Failed to cancel native alarm:', error);
    }
  }
};

// Helper to convert time string (e.g., "19:00") into a future millisecond timestamp
function parseReminderTime(timeStr) {
  if (!timeStr) return Date.now() + 60000;
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1); // Schedule for tomorrow if time already passed today
  }
  return target.getTime();
}

export default alarmService;