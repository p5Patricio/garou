// ---------------------------------------------------------------------------
// Pure statistical utilities for body metrics and progress charts.
// No React, no SQLite — all inputs/outputs are plain data. Testable in isolation.
// All date math uses LOCAL date parsing (not UTC) to match device locale.
// ---------------------------------------------------------------------------

import type { MetricsTrend, WeeklyBucket } from '../types/metrics';

/**
 * Returns the ISO week Monday (YYYY-MM-DD) for a given date string.
 *
 * ISO week starts on Monday. Sunday is treated as the last day of the
 * previous week (diff = -6).
 *
 * Examples:
 *   toISOWeekStart('2026-06-10') // Wednesday → '2026-06-08' (Monday)
 *   toISOWeekStart('2026-06-08') // Monday    → '2026-06-08'
 *   toISOWeekStart('2026-06-07') // Sunday    → '2026-06-01'
 */
export function toISOWeekStart(fecha: string): string {
  // Parse as local date to avoid UTC midnight-shift on timezones behind UTC
  const [year, month, day] = fecha.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  const dow = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // How many days to subtract to reach the previous (or current) Monday
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + diff);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dt = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}

/**
 * Returns the arithmetic mean of entries whose `fecha` falls within the
 * last `windowDays` calendar days (today − (windowDays − 1) through today).
 *
 * Returns 0 — never NaN — when there are no entries in the window.
 */
export function weeklyAverage(
  entries: { fecha: string; value: number }[],
  windowDays = 7
): number {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const todayMs = new Date(ty, tm - 1, td).getTime();
  const windowMs = (windowDays - 1) * 24 * 60 * 60 * 1000;

  const inWindow = entries.filter((e) => {
    const [ey, em, ed] = e.fecha.split('-').map(Number);
    const eMs = new Date(ey, em - 1, ed).getTime();
    return eMs >= todayMs - windowMs && eMs <= todayMs;
  });

  if (inWindow.length === 0) return 0;

  const sum = inWindow.reduce((acc, e) => acc + e.value, 0);
  return sum / inWindow.length;
}

/**
 * Compares two weekly averages and returns a trend direction.
 * Threshold: ±0.2 kg (or cm) treated as stable to filter noise.
 *
 * Returns 'stable' when previous is 0 (no prior-week data to compare).
 */
export function trendDirection(
  current: number,
  previous: number
): MetricsTrend {
  if (previous === 0) return 'stable';
  const diff = current - previous;
  if (diff > 0.2) return 'up';
  if (diff < -0.2) return 'down';
  return 'stable';
}

/**
 * Groups entries by ISO week Monday and computes the average value per bucket.
 * Returns buckets sorted by weekStart ascending — suitable for line chart data.
 */
export function groupWeeklyAverages(
  entries: { fecha: string; value: number }[]
): WeeklyBucket[] {
  const buckets = new Map<string, number[]>();

  for (const e of entries) {
    const key = toISOWeekStart(e.fecha);
    const existing = buckets.get(key);
    if (existing) {
      existing.push(e.value);
    } else {
      buckets.set(key, [e.value]);
    }
  }

  const result: WeeklyBucket[] = [];
  for (const [weekStart, values] of buckets) {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    result.push({ weekStart, avg });
  }

  result.sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));
  return result;
}
