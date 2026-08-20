// Given a habit/task and a 'YYYY-MM-DD' date string, determine whether that
// task was actually scheduled to happen on that date. Pure function, no DB
// calls — cheap to run against every habit for a given day or month.
function isTaskScheduledOnDate(task, dateStr) {
  if (!task.active) return false;
  if (task.startDate && dateStr < task.startDate) return false;
  if (task.endDate && dateStr > task.endDate) return false;

  // Pinning the time avoids the date rolling over due to timezone parsing quirks
  const day = new Date(dateStr + 'T00:00:00').getDay(); // 0=Sun..6=Sat
  switch (task.frequency) {
    case 'daily': return true;
    case 'weekdays': return day >= 1 && day <= 5;
    case 'weekends': return day === 0 || day === 6;
    case 'custom': return Array.isArray(task.daysOfWeek) && task.daysOfWeek.includes(day);
    default: return true;
  }
}

module.exports = { isTaskScheduledOnDate };