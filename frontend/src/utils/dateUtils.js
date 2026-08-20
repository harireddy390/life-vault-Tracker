/**
 * Timezone-Safe Calendar and Date Utilities
 * 
 * Ensures all dates map deterministically to the user's local calendar day
 * without UTC drift or timezone conversion offset bugs.
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Formats a Date object to 'YYYY-MM-DD' in user's local timezone.
 */
export const formatDateKey = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Parses 'YYYY-MM-DD' into a local Date object.
 */
export const parseDateKey = (dateStr) => {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Shifts a 'YYYY-MM-DD' string by +/- n days.
 */
export const addDays = (dateStr, days) => {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + days);
  return formatDateKey(d);
};

/**
 * Checks if dateStr is today's local date.
 */
export const isToday = (dateStr) => {
  return dateStr === formatDateKey(new Date());
};

/**
 * Gets day of week name (e.g. 'Monday' or 'Mon').
 */
export const getDayName = (dateStr, short = false) => {
  const d = parseDateKey(dateStr);
  const dayIdx = d.getDay();
  return short ? DAY_SHORT[dayIdx] : DAY_NAMES[dayIdx];
};

/**
 * Gets month name (e.g. 'August' or 'Aug').
 */
export const getMonthName = (monthIndex, short = false) => {
  // monthIndex: 0-11 or 1-12
  const idx = monthIndex > 11 ? monthIndex - 1 : monthIndex;
  return short ? MONTH_SHORT[idx] : MONTH_NAMES[idx];
};

/**
 * Formats date for display: e.g. "17 August 2026", "Monday, 17 August 2026", etc.
 */
export const formatDisplayDate = (dateStr, options = { includeDay: true, shortMonth: false }) => {
  if (!dateStr) return '';
  const d = parseDateKey(dateStr);
  const dayName = getDayName(dateStr, options.shortDay);
  const dayNum = d.getDate();
  const monthName = getMonthName(d.getMonth(), options.shortMonth);
  const year = d.getFullYear();

  if (options.includeDay) {
    return `${dayName}, ${dayNum} ${monthName} ${year}`;
  }
  return `${dayNum} ${monthName} ${year}`;
};

/**
 * Builds the calendar grid matrix for a given year & month (1-12).
 * Returns array of days with padding days from prev/next months for Monday-starting calendar.
 */
export const getCalendarMonthGrid = (year, month) => {
  const firstDayOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Starting day of week: 0 = Sunday, 1 = Monday ... 6 = Saturday
  // We align grid starting on Monday (Mon = 0, Sun = 6)
  let startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sun, 1 is Mon...
  let leadingBlanks = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const days = [];

  // Previous month trailing days
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;

  for (let i = leadingBlanks - 1; i >= 0; i--) {
    const dNum = prevMonthDays - i;
    const dateKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    days.push({
      dateKey,
      dayNumber: dNum,
      isCurrentMonth: false,
      isPrevMonth: true,
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateKey,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: isToday(dateKey),
    });
  }

  // Trailing next month days to complete 7-day rows (up to 35 or 42 cells)
  const remaining = (7 - (days.length % 7)) % 7;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  for (let d = 1; d <= remaining; d++) {
    const dateKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    days.push({
      dateKey,
      dayNumber: d,
      isCurrentMonth: false,
      isNextMonth: true,
    });
  }

  return days;
};
