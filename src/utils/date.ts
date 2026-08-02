/**
 * Date helpers that always operate in the device's local timezone.
 * This keeps the app's "today" consistent with the user's clock and avoids
 * UTC date shifts in negative timezones.
 */

/**
 * Returns today's date as YYYY-MM-DD in local time.
 */
export function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * Returns the date N days ago as YYYY-MM-DD in local time.
 */
export function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

/**
 * Parses a YYYY-MM-DD string as a local-date Date object.
 */
export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Formats a YYYY-MM-DD string to a readable Spanish label.
 */
export function formatLocalDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const raw = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Returns the number of days between two YYYY-MM-DD strings (today - target).
 */
export function getDaysBetween(todayStr: string, targetStr: string): number {
  const t = parseLocalDate(todayStr).getTime();
  const e = parseLocalDate(targetStr).getTime();
  return Math.round((t - e) / (24 * 60 * 60 * 1000));
}

/**
 * Shifts a YYYY-MM-DD string forward by N days.
 */
export function shiftLocalDate(dateStr: string, days: number): string {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + days);
  const ny = d.getFullYear();
  const nm = String(d.getMonth() + 1).padStart(2, '0');
  const nd = String(d.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}
