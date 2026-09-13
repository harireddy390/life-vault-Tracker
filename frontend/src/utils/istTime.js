/**
 * Frontend IST (Indian Standard Time, UTC+05:30) Date & Time Utilities
 * Anchors all schedules strictly to 24-hour string intervals ("HH:mm")
 * and IST calendar dates ("YYYY-MM-DD") to prevent UTC timezone drift.
 */

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

export function getISTDate(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const utcMs = d.getTime() + (d.getTimezoneOffset() * 60 * 1000);
  return new Date(utcMs + IST_OFFSET_MS);
}

export function getISTDateStr(date = new Date()) {
  const ist = getISTDate(date);
  const y = ist.getFullYear();
  const m = String(ist.getMonth() + 1).padStart(2, '0');
  const d = String(ist.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getISTTimeString(date = new Date()) {
  const ist = getISTDate(date);
  const h = String(ist.getHours()).padStart(2, '0');
  const m = String(ist.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function getISTDayOfWeek(date = new Date()) {
  return getISTDate(date).getDay();
}

export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [h, m] = timeStr.split(':').map((v) => parseInt(v, 10) || 0);
  return h * 60 + m;
}

export function minutesToTime(totalMinutes) {
  const normalized = Math.max(0, Math.min(1439, totalMinutes));
  const h = String(Math.floor(normalized / 60)).padStart(2, '0');
  const m = String(normalized % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function getBlockDurationMinutes(startTimeStr, endTimeStr) {
  const start = timeToMinutes(startTimeStr);
  let end = timeToMinutes(endTimeStr);
  if (end < start) end += 24 * 60;
  return end - start;
}

export function format12Hour(time24) {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatISTDisplayDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
}

export const getISTCurrentDateStr = getISTDateStr;
export const getISTCurrentTimeStr = getISTTimeString;

