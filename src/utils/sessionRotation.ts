import type { SQLiteDatabase } from 'expo-sqlite';

export const SESSION_ROTATION = ['Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B'] as const;
export type SessionType = (typeof SESSION_ROTATION)[number];

// State of today's gym day:
// - sugerida:   no row for today yet; this is the next session in the rotation
// - pendiente:  a session is in progress (at least one set logged)
// - completada: the session was finished (fully or early)
// - descanso:   the day was marked as "didn't go to the gym"
export type SessionEstado = 'sugerida' | 'pendiente' | 'completada' | 'descanso';

export interface TodaySession {
  tipo: string;
  estado: SessionEstado;
  sessionId: number | null;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * The next session in the rotation, computed from the last COMPLETED non-rest
 * session. Rest days never advance the rotation. With no history, starts at the
 * top of the rotation.
 */
export async function nextInRotation(db: SQLiteDatabase): Promise<string> {
  const lastCompleted = await db.getFirstAsync<{ tipo_sesion: string }>(
    `SELECT tipo_sesion FROM workout_sessions
     WHERE completada = 1 AND es_descanso = 0
     ORDER BY fecha DESC, id DESC LIMIT 1`
  );

  if (lastCompleted) {
    const idx = SESSION_ROTATION.indexOf(lastCompleted.tipo_sesion as SessionType);
    if (idx !== -1) return SESSION_ROTATION[(idx + 1) % SESSION_ROTATION.length];
  }

  return 'Torso A';
}

export function getSuggestedRoutine(date: Date): string {
  const day = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const mapping = ['descanso', 'Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B', 'descanso'];
  return mapping[day] || 'descanso';
}

/**
 * Resolve the state of today's gym day: an existing row (pendiente / completada
 * / descanso) or, when there's no row yet, the suggested next session.
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
    [todayStr()]
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

/** Index of a session type within the rotation (-1 if not found). */
export function rotationIndexOf(tipo: string): number {
  return SESSION_ROTATION.indexOf(tipo as SessionType);
}
