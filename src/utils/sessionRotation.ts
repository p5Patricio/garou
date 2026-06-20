import type { SQLiteDatabase } from 'expo-sqlite';

export const SESSION_ROTATION = ['Torso A', 'Pierna A', 'Ligero', 'Torso B', 'Pierna B'] as const;

export async function resolveSessionType(db: SQLiteDatabase): Promise<string> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const sessionToday = await db.getFirstAsync<{ tipo_sesion: string }>(
    `SELECT tipo_sesion FROM workout_sessions WHERE fecha = ? LIMIT 1`,
    [todayStr]
  );
  if (sessionToday) return sessionToday.tipo_sesion;

  const lastCompleted = await db.getFirstAsync<{ tipo_sesion: string }>(
    `SELECT tipo_sesion FROM workout_sessions WHERE completada = 1 ORDER BY fecha DESC, id DESC LIMIT 1`
  );

  if (lastCompleted) {
    const lastIndex = SESSION_ROTATION.indexOf(lastCompleted.tipo_sesion as typeof SESSION_ROTATION[number]);
    if (lastIndex !== -1) return SESSION_ROTATION[(lastIndex + 1) % SESSION_ROTATION.length];
  }

  return 'Torso A';
}
