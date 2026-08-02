import type { SQLiteDatabase } from 'expo-sqlite';
import { todayLocal } from './date';

export const ROUTINE_SESSIONS = ['Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B'] as const;
export type SessionType = (typeof ROUTINE_SESSIONS)[number];

// State of today's gym day:
// - sugerida:   no row for today yet; this is the suggested session based on the weekday
// - pendiente:  a session is in progress (at least one set logged)
// - completada: the session was finished (fully or early)
// - descanso:   the day was marked as a rest day
export type SessionEstado = 'sugerida' | 'pendiente' | 'completada' | 'descanso';

export interface TodaySession {
  tipo: string;
  estado: SessionEstado;
  sessionId: number | null;
}

/**
 * Returns the suggested routine session type based on the day of the week.
 * - Monday (1)    -> Torso A
 * - Tuesday (2)   -> Pierna A
 * - Wednesday (3) -> Ligero
 * - Thursday (4)  -> Torso B
 * - Friday (5)    -> Pierna B
 * - Saturday (6) / Sunday (0) -> descanso
 */
export function getSuggestedRoutine(date: Date): string {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mapping = ['descanso', 'Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B', 'descanso'];
  return mapping[day] || 'descanso';
}

/**
 * Resolve the state of today's gym day: an existing row (pendiente / completada
 * / descanso) or, when there's no row yet, the suggested session based on the weekday.
 */
export async function resolveTodaySession(db: SQLiteDatabase): Promise<TodaySession> {
  const row = await db.getFirstAsync<{
    id: number;
    tipo_sesion: string;
    completada: number;
    es_descanso: number;
  }>(
    `SELECT id, tipo_sesion, completada, es_descanso
     FROM workout_sessions
     WHERE fecha = ?
     ORDER BY id DESC LIMIT 1`,
    [todayLocal()]
  );

  if (!row) {
    return { tipo: getSuggestedRoutine(new Date()), estado: 'sugerida', sessionId: null };
  }
  if (row.es_descanso === 1) {
    return { tipo: row.tipo_sesion, estado: 'descanso', sessionId: row.id };
  }
  if (row.completada === 1) {
    return { tipo: row.tipo_sesion, estado: 'completada', sessionId: row.id };
  }
  return { tipo: row.tipo_sesion, estado: 'pendiente', sessionId: row.id };
}
