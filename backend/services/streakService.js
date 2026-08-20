/**
 * Streak and Progress Analytics Service
 * 
 * Configurable logic for determining day completion and calculating streaks.
 */

// Format date helper for local dates
const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Parse 'YYYY-MM-DD' into a local Date
const parseDateKey = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Add / subtract days safely
const addDays = (dateStr, days) => {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
};

/**
 * Checks if a task is scheduled on a given dateStr ('YYYY-MM-DD')
 */
const isTaskScheduledOnDate = (task, dateStr) => {
  if (!task.active) return false;
  if (task.startDate && dateStr < task.startDate) return false;
  if (task.endDate && dateStr > task.endDate) return false;

  const dateObj = parseDateKey(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday

  if (task.frequency === 'everyday') return true;
  if (task.frequency === 'weekdays') return dayOfWeek >= 1 && dayOfWeek <= 5;
  if (task.frequency === 'weekends') return dayOfWeek === 0 || dayOfWeek === 6;
  if (task.frequency === 'custom') {
    return Array.isArray(task.daysOfWeek) && task.daysOfWeek.includes(dayOfWeek);
  }
  return true;
};

/**
 * Configurable rule for what counts as a completed day.
 * Mode 'atLeastOne': user completed >= 1 scheduled task
 * Mode 'all': user completed 100% of scheduled tasks
 */
const isDaySuccessful = (completedCount, scheduledCount, mode = 'atLeastOne') => {
  if (scheduledCount === 0) return false;
  if (mode === 'all') {
    return completedCount >= scheduledCount;
  }
  // Default: at least one task completed
  return completedCount > 0;
};

/**
 * Calculates overall streaks from all progress records and active tasks.
 */
const calculateStreaks = (progressRecords = [], tasks = [], options = { mode: 'atLeastOne' }) => {
  const todayStr = formatDateKey(new Date());

  // Group completed progress records by date
  const completedByDate = {};
  progressRecords.forEach((rec) => {
    if (rec.completed) {
      if (!completedByDate[rec.date]) {
        completedByDate[rec.date] = new Set();
      }
      completedByDate[rec.date].add(rec.task.toString());
    }
  });

  // Collect all unique dates with progress
  const uniqueDates = Object.keys(completedByDate).sort();

  // Determine which dates are "successful"
  const successfulDates = new Set();
  uniqueDates.forEach((dateStr) => {
    // Determine how many tasks were scheduled on this date
    const scheduled = tasks.filter((t) => isTaskScheduledOnDate(t, dateStr));
    const completedCount = completedByDate[dateStr] ? completedByDate[dateStr].size : 0;
    
    if (isDaySuccessful(completedCount, scheduled.length > 0 ? scheduled.length : 1, options.mode)) {
      successfulDates.add(dateStr);
    }
  });

  // Calculate Current Streak
  let currentStreak = 0;
  let checkDate = todayStr;

  // If today is completed, start counting from today.
  // If today is not yet completed, check if yesterday was completed so streak isn't lost mid-day.
  if (successfulDates.has(todayStr)) {
    currentStreak = 1;
    checkDate = addDays(todayStr, -1);
  } else {
    checkDate = addDays(todayStr, -1);
    if (!successfulDates.has(checkDate)) {
      currentStreak = 0;
    }
  }

  if (currentStreak > 0 || successfulDates.has(checkDate)) {
    while (successfulDates.has(checkDate)) {
      if (!successfulDates.has(todayStr) && currentStreak === 0) {
        currentStreak = 1;
      } else if (successfulDates.has(todayStr) || currentStreak > 0) {
        if (checkDate !== todayStr) {
          currentStreak++;
        }
      }
      checkDate = addDays(checkDate, -1);
    }
  }

  // Calculate Best Streak across all time
  let bestStreak = 0;
  const sortedDates = Array.from(successfulDates).sort();

  if (sortedDates.length > 0) {
    let tempStreak = 1;
    bestStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];
      const expectedNext = addDays(prev, 1);

      if (curr === expectedNext) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
        }
      } else {
        tempStreak = 1;
      }
    }
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  return {
    currentStreak,
    bestStreak,
    totalActiveDays: successfulDates.size,
    totalCompletions: progressRecords.filter((r) => r.completed).length,
  };
};

/**
 * Calculates metrics for an individual task/habit across time.
 */
const calculateTaskMetrics = (task, taskProgressRecords = []) => {
  const todayStr = formatDateKey(new Date());
  const now = new Date();
  const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYearPrefix = `${now.getFullYear()}-`;

  const completedDates = new Set(
    taskProgressRecords.filter((r) => r.completed).map((r) => r.date)
  );

  // Total completed days
  const totalCompletions = completedDates.size;

  // Streak for this task
  let currentStreak = 0;
  let checkDate = todayStr;

  if (completedDates.has(todayStr)) {
    currentStreak = 1;
    checkDate = addDays(todayStr, -1);
  } else {
    checkDate = addDays(todayStr, -1);
    if (!completedDates.has(checkDate)) {
      currentStreak = 0;
    }
  }

  if (currentStreak > 0 || completedDates.has(checkDate)) {
    while (completedDates.has(checkDate)) {
      if (!completedDates.has(todayStr) && currentStreak === 0) {
        currentStreak = 1;
      } else {
        if (checkDate !== todayStr) currentStreak++;
      }
      checkDate = addDays(checkDate, -1);
    }
  }

  // Best streak for this task
  let bestStreak = 0;
  let bestStreakStart = null;
  let bestStreakEnd = null;
  const sortedDates = Array.from(completedDates).sort();

  if (sortedDates.length > 0) {
    let tempStreak = 1;
    let tempStart = sortedDates[0];
    bestStreak = 1;
    bestStreakStart = sortedDates[0];
    bestStreakEnd = sortedDates[0];

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = sortedDates[i - 1];
      const curr = sortedDates[i];
      if (curr === addDays(prev, 1)) {
        tempStreak++;
        if (tempStreak > bestStreak) {
          bestStreak = tempStreak;
          bestStreakStart = tempStart;
          bestStreakEnd = curr;
        }
      } else {
        tempStreak = 1;
        tempStart = curr;
      }
    }
  }

  // Month & Year completions
  const monthCompletions = Array.from(completedDates).filter((d) => d.startsWith(currentMonthPrefix)).length;
  const yearCompletions = Array.from(completedDates).filter((d) => d.startsWith(currentYearPrefix)).length;

  // Days in month so far / total days in month
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const monthScore = Math.min(100, Math.round((monthCompletions / Math.max(1, dayOfMonth)) * 100));

  // Days in year so far
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
  const yearScore = Math.min(100, Math.round((yearCompletions / Math.max(1, dayOfYear)) * 100));

  // Overall Score (e.g., past 30 days)
  let past30Scheduled = 0;
  let past30Completed = 0;
  for (let i = 0; i < 30; i++) {
    const dStr = addDays(todayStr, -i);
    if (isTaskScheduledOnDate(task, dStr)) {
      past30Scheduled++;
      if (completedDates.has(dStr)) {
        past30Completed++;
      }
    }
  }
  const overallScore = past30Scheduled > 0 ? Math.round((past30Completed / past30Scheduled) * 100) : (totalCompletions > 0 ? 100 : 0);

  return {
    totalCompletions,
    currentStreak,
    bestStreak,
    bestStreakStart,
    bestStreakEnd,
    overallScore,
    monthScore,
    yearScore,
    monthCompletions,
    yearCompletions,
    completedDates: Array.from(completedDates),
  };
};

module.exports = {
  formatDateKey,
  parseDateKey,
  addDays,
  isTaskScheduledOnDate,
  isDaySuccessful,
  calculateStreaks,
  calculateTaskMetrics,
};
