/**
 * Dynamic Greeting & User Display Utilities
 * Centralized client-local time greeting logic.
 */

/**
 * Returns dynamic greeting based on client's local time (hours 0..23):
 * 05:00 - 11:59 -> "Good Morning"
 * 12:00 - 16:59 -> "Good Afternoon"
 * 17:00 - 21:59 -> "Good Evening"
 * 22:00 - 04:59 -> "Good Night"
 */
export function getLocalTimeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good Morning';
  }
  if (hour >= 12 && hour < 17) {
    return 'Good Afternoon';
  }
  if (hour >= 17 && hour < 22) {
    return 'Good Evening';
  }
  return 'Good Night';
}

/**
 * Extracts a safe display name from the authenticated user object.
 * Priority: user.name -> user.username -> user.displayName
 * Uses the first name if multi-word, or full single-word name.
 * Falls back to generic safe fallback if missing.
 */
export function getUserDisplayName(user, fallback = 'Friend') {
  if (!user) return fallback;
  const raw = user.name || user.username || user.displayName;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) {
      const firstName = trimmed.split(/\s+/)[0];
      return firstName || trimmed;
    }
  }
  return fallback;
}

/**
 * Combines dynamic greeting and user display name:
 * e.g. "Good Morning, Hari" or "Good Evening, Friend"
 */
export function getDashboardGreeting(user, date = new Date(), fallback = 'Friend') {
  const greeting = getLocalTimeGreeting(date);
  const name = getUserDisplayName(user, fallback);
  return name ? `${greeting}, ${name}` : greeting;
}
