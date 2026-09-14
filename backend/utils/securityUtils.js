/**
 * Security utilities for Life Vault
 */

/**
 * Escapes characters with special meaning in regular expressions
 * to prevent ReDoS (Regular Expression Denial of Service).
 */
function escapeRegex(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Sanitizes CSV cell values to prevent CSV Formula Injection (DDE).
 * Prepend a single quote (') if the field starts with =, +, -, @, tab, or carriage return.
 */
function sanitizeCsvValue(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val);
  // Neutralize spreadsheet formula triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  // Escape internal double quotes
  return `"${str.replace(/"/g, '""')}"`;
}

module.exports = {
  escapeRegex,
  sanitizeCsvValue,
};
