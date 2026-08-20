// Streak calculation kept in ONE place so the "what counts as a completed
// day" rule can change later without touching route code.
//
// Current rule: a day counts if the user completed at least one scheduled
// task that day. To switch to "100% of scheduled tasks completed", change
// how the caller builds `activeDateStrings` — pass only dates where
// completedCount === totalCount instead of any date with 1+ completion —
// this function itself doesn't need to change either way.

function computeStreaks(activeDateStrings, todayStr) {
  const dates = [...new Set(activeDateStrings)].sort(); // ascending, dedup
  if (dates.length === 0) {
    return { currentStreak: 0, bestStreak: 0, totalActiveDays: 0 };
  }

  const toUTCDate = (s) => new Date(s + 'T00:00:00Z');
  const dayDiff = (a, b) => Math.round((toUTCDate(b) - toUTCDate(a)) / 86400000);

  let bestStreak = 1;
  let run = 1;
  for (let i = 1; i < dates.length; i++) {
    run = dayDiff(dates[i - 1], dates[i]) === 1 ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
  }

  // Current streak only counts if the most recent active day was today or
  // yesterday — otherwise the streak is broken, even if it was long once.
  const lastActive = dates[dates.length - 1];
  const gapFromToday = dayDiff(lastActive, todayStr);

  let currentStreak = 0;
  if (gapFromToday <= 1) {
    currentStreak = 1;
    for (let i = dates.length - 1; i > 0; i--) {
      if (dayDiff(dates[i - 1], dates[i]) === 1) currentStreak += 1;
      else break;
    }
  }

  return { currentStreak, bestStreak, totalActiveDays: dates.length };
}

module.exports = { computeStreaks };