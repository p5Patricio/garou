import type { SQLiteDatabase } from 'expo-sqlite';
import { daysAgoLocal, todayLocal } from './date';

/**
 * Intensity level for a single day in the activity calendar:
 * - 0: no workout that day (no square is rendered)
 * - 1-3: a session exists but wasn't fully completed, bucketed by % of sets done
 * - 4: session fully completed (brightest)
 * Rest days are tracked separately via `esDescanso` and always render in their
 * own distinct color regardless of `level`.
 */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export interface ActivityDay {
  fecha: string; // YYYY-MM-DD
  level: ActivityLevel;
  esDescanso: boolean;
  tipoSesion: string | null;
  pct: number | null; // fraction of sets completed, 0-1, null when there's no session
}

function bucketLevel(completada: boolean, pct: number): ActivityLevel {
  if (completada) return 4;
  if (pct <= 0) return 1; // a session was started but nothing logged yet
  if (pct < 0.5) return 1;
  if (pct < 0.85) return 2;
  return 3;
}

/**
 * Builds one entry per day for the last `days` days (default ~1 year), for
 * rendering a GitHub-style contribution calendar. Days with no workout_sessions
 * row simply carry level 0 / esDescanso false, so the UI can skip drawing them.
 */
export async function getActivityCalendar(db: SQLiteDatabase, days = 371): Promise<ActivityDay[]> {
  const startDate = daysAgoLocal(days - 1);
  const today = todayLocal();

  // One row per date (latest session for that date if there happen to be more than one).
  const sessionRows = await db.getAllAsync<{
    id: number;
    fecha: string;
    tipo_sesion: string;
    completada: number;
    es_descanso: number;
  }>(
    `SELECT id, fecha, tipo_sesion, completada, es_descanso
     FROM workout_sessions
     WHERE fecha >= ? AND fecha <= ?
     ORDER BY fecha ASC, id DESC`,
    [startDate, today]
  );

  // Keep only the first (latest, since ordered id DESC within date) row per date.
  const byDate = new Map<string, (typeof sessionRows)[number]>();
  for (const row of sessionRows) {
    if (!byDate.has(row.fecha)) byDate.set(row.fecha, row);
  }

  const sessionIds = Array.from(byDate.values())
    .filter((r) => r.es_descanso !== 1)
    .map((r) => r.id);

  // Sets completed per session.
  const doneBySession = new Map<number, number>();
  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    const doneRows = await db.getAllAsync<{ session_id: number; done: number }>(
      `SELECT session_id, COUNT(*) as done
       FROM set_logs
       WHERE completada = 1 AND session_id IN (${placeholders})
       GROUP BY session_id`,
      sessionIds
    );
    for (const r of doneRows) doneBySession.set(r.session_id, r.done);
  }

  // Expected sets per session type, from the current active catalog. This is an
  // approximation for sessions logged under an older version of the routine, but
  // it's only used to bucket brightness, not to display exact numbers.
  const expectedRows = await db.getAllAsync<{ sesion: string; expected: number }>(
    `SELECT sesion, COALESCE(SUM(series_objetivo), 0) as expected
     FROM exercises
     WHERE activo = 1
     GROUP BY sesion`
  );
  const expectedBySesion = new Map(expectedRows.map((r) => [r.sesion, r.expected]));

  const result: ActivityDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const fecha = daysAgoLocal(i);
    const row = byDate.get(fecha);

    if (!row) {
      result.push({ fecha, level: 0, esDescanso: false, tipoSesion: null, pct: null });
      continue;
    }

    if (row.es_descanso === 1) {
      result.push({ fecha, level: 0, esDescanso: true, tipoSesion: row.tipo_sesion, pct: null });
      continue;
    }

    const done = doneBySession.get(row.id) ?? 0;
    const expected = expectedBySesion.get(row.tipo_sesion) ?? 0;
    const pct = expected > 0 ? Math.min(1, done / expected) : row.completada === 1 ? 1 : 0;
    const level = bucketLevel(row.completada === 1, pct);

    result.push({ fecha, level, esDescanso: false, tipoSesion: row.tipo_sesion, pct });
  }

  return result;
}
