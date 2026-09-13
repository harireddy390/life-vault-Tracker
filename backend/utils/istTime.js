/**
 * IST (Indian Standard Time, UTC+05:30 / Asia/Kolkata) Date & Time Utilities
 * Eliminates UTC timezone drift by anchoring all schedules to 24-hour string intervals ("HH:mm")
 * and IST calendar dates ("YYYY-MM-DD").
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5 hours 30 mins in ms

/**
 * Returns a new Date object shifted to IST representation
 */
function getISTDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  // UTC timestamp + 5.5 hours
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + IST_OFFSET_MS);
}

/**
 * Returns 'YYYY-MM-DD' in Indian Standard Time
 */
function getISTDateStr(date = new Date()) {
  const ist = getISTDate(date);
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns 'HH:mm' (24-hour) in Indian Standard Time
 */
function getISTTimeString(date = new Date()) {
  const ist = getISTDate(date);
  const hours = String(ist.getHours()).padStart(2, '0');
  const minutes = String(ist.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Returns 0=Sunday, 1=Monday, ..., 6=Saturday in IST
 */
function getISTDayOfWeek(date = new Date()) {
  return getISTDate(date).getDay();
}

/**
 * Converts "HH:mm" to total minutes since midnight (0..1439)
 */
function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

/**
 * Converts total minutes since midnight back to "HH:mm"
 */
function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * Calculates duration between two 24-hour time strings in minutes
 */
function getBlockDurationMinutes(startTimeStr, endTimeStr) {
  const start = timeToMinutes(startTimeStr);
  let end = timeToMinutes(endTimeStr);
  if (end < start) end += 24 * 60; // Crosses midnight
  return end - start;
}

/**
 * Returns rich IST execution context: dateStr, timeStr, dayName, formattedDate, greeting
 */
function getISTCurrentDateTime(date = new Date()) {
  const ist = getISTDate(date);
  const dateStr = getISTDateStr(date);
  const timeStr = getISTTimeString(date);
  const dayOfWeek = ist.getDay();

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayName = days[dayOfWeek];
  const monthName = months[ist.getMonth()];
  const formattedDate = `${dayName}, ${monthName} ${ist.getDate()}, ${ist.getFullYear()}`;

  const currentHour = ist.getHours();
  let greeting = 'Good morning 👋';
  if (currentHour >= 12 && currentHour < 17) {
    greeting = 'Good afternoon ☀️';
  } else if (currentHour >= 17 && currentHour < 22) {
    greeting = 'Good evening 🌙';
  } else if (currentHour >= 22 || currentHour < 5) {
    greeting = 'Time to wind down 🌌';
  }

  return {
    dateStr,
    timeStr,
    dayOfWeek,
    dayName,
    monthName,
    dayOfMonth: ist.getDate(),
    year: ist.getFullYear(),
    formattedDate,
    greeting,
    currentMinutes: currentHour * 60 + ist.getMinutes(),
  };
}

module.exports = {
  getISTDate,
  getISTDateStr,
  getISTTimeString,
  getISTDayOfWeek,
  timeToMinutes,
  minutesToTime,
  getBlockDurationMinutes,
  getISTCurrentDateTime,
};
