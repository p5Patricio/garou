import type { SQLiteDatabase } from 'expo-sqlite';
import { daysAgoLocal } from './date';
import { MUSCLE_GROUPS, normalizeMuscleGroup, type MuscleGroup } from '../constants/muscleRegions';

export type MuscleWindow = 7 | 30 | 0; // 0 = all time

export type MuscleLevel = 0 | 1 | 2 | 3 | 4;

/**
 * "Effective sets" per muscle group: a straight count of completed, non-warmup
 * sets (num_serie >= 0) whose exercise's grupo_muscular matches, in the window.
 * Garou's exercises carry a single grupo_muscular (no primary/secondary split
 * like openGym's dataset), so unlike openGym there's no per-exercise weighting
 * to apply — every set counts once, for exactly one muscle group.
 */
export async function getMuscleLoad(
  db: SQLiteDatabase,
  window: MuscleWindow
): Promise<Record<MuscleGroup, number>> {
  const load: Record<MuscleGroup, number> = Object.fromEntries(
    MUSCLE_GROUPS.map((g) => [g, 0])
  ) as Record<MuscleGroup, number>;

  const params: (string | number)[] = [];
  let dateClause = '';
  if (window > 0) {
    dateClause = 'AND ws.fecha >= ?';
    params.push(daysAgoLocal(window - 1));
  }

  const rows = await db.getAllAsync<{ grupo_muscular: string; sets: number }>(
    `SELECT e.grupo_muscular as grupo_muscular, COUNT(*) as sets
     FROM set_logs sl
     JOIN exercises e ON e.id = sl.exercise_id
     JOIN workout_sessions ws ON ws.id = sl.session_id
     WHERE sl.completada = 1 AND sl.num_serie >= 0 ${dateClause}
     GROUP BY e.grupo_muscular`,
    params
  );

  for (const row of rows) {
    const muscle = normalizeMuscleGroup(row.grupo_muscular);
    if (muscle) load[muscle] += row.sets;
  }

  return load;
}

/**
 * Relative bucketing (openGym's "Muscle balance" scheme): the hardest-worked
 * muscle always reads as level 4, everything else scales against it. This
 * deliberately ignores absolute volume — the map answers "where did the work
 * go, relative to itself", not "is this a lot".
 */
export function levelsOf(load: Record<MuscleGroup, number>): Record<MuscleGroup, MuscleLevel> {
  const maxLoad = Math.max(0, ...Object.values(load));
  const levels = {} as Record<MuscleGroup, MuscleLevel>;
  for (const g of MUSCLE_GROUPS) {
    const value = load[g] ?? 0;
    levels[g] = maxLoad === 0 || value === 0 ? 0 : (Math.min(4, Math.ceil((value / maxLoad) * 4)) as MuscleLevel);
  }
  return levels;
}

/** Muscle groups with zero logged sets in the window — the "missed" list. */
export function missedMuscles(load: Record<MuscleGroup, number>): MuscleGroup[] {
  return MUSCLE_GROUPS.filter((g) => (load[g] ?? 0) === 0);
}

/** Muscle groups with at least one set, sorted hardest-worked first. */
export function workedMuscles(load: Record<MuscleGroup, number>): { muscle: MuscleGroup; sets: number }[] {
  return MUSCLE_GROUPS
    .map((g) => ({ muscle: g, sets: load[g] ?? 0 }))
    .filter((e) => e.sets > 0)
    .sort((a, b) => b.sets - a.sets);
}
