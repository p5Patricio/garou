import type { SQLiteDatabase } from 'expo-sqlite';
import { EXERCISES, type ExerciseSeed } from './seed';

/**
 * Legacy (nombre, sesion) pairs from routine versions before v3, mapped to the v3
 * entry they became. This exists ONLY to preserve set_logs history: when a v3
 * exercise has no row under its own name yet, we adopt the pre-v3 row it descends
 * from instead of inserting a fresh one, so the id — and every set_log and
 * progression reading tied to it — stays linked.
 *
 * A missing or stale entry here is never fatal: the worst case is a new row with
 * no history, not a lost or hidden exercise.
 */
const LEGACY_CONTINUITY: { fromNombre: string; fromSesion: string; toNombre: string; toSesion: string }[] = [
  { fromNombre: 'Press de banca con barra', fromSesion: 'Torso A', toNombre: 'Press de banca con barra', toSesion: 'Torso A' },
  { fromNombre: 'Remo con apoyo en pecho', fromSesion: 'Torso A', toNombre: 'Remo con apoyo en pecho', toSesion: 'Torso A' },
  { fromNombre: 'Press inclinado con mancuernas', fromSesion: 'Torso A', toNombre: 'Press inclinado con mancuernas', toSesion: 'Torso B' },
  { fromNombre: 'Jalon al pecho', fromSesion: 'Torso A', toNombre: 'Jalon al pecho (neutro o supino)', toSesion: 'Torso A' },
  { fromNombre: 'Elevaciones laterales con mancuerna', fromSesion: 'Torso A', toNombre: 'Elevaciones laterales', toSesion: 'Torso A' },
  { fromNombre: 'Curl con barra Z', fromSesion: 'Torso A', toNombre: 'Curl inclinado con mancuernas', toSesion: 'Torso A' },
  { fromNombre: 'Extension de triceps en polea', fromSesion: 'Torso A', toNombre: 'Extension de triceps sobre la cabeza', toSesion: 'Torso A' },

  { fromNombre: 'Sentadilla con barra', fromSesion: 'Pierna A', toNombre: 'Sentadilla con barra alta o hack', toSesion: 'Pierna A' },
  { fromNombre: 'Prensa de pierna', fromSesion: 'Pierna A', toNombre: 'Prensa de pierna', toSesion: 'Pierna A' },
  { fromNombre: 'Extension de cuadriceps', fromSesion: 'Pierna A', toNombre: 'Extension de cuadriceps', toSesion: 'Pierna A' },
  { fromNombre: 'Curl femoral sentado', fromSesion: 'Pierna A', toNombre: 'Curl femoral sentado', toSesion: 'Pierna A' },
  { fromNombre: 'Elevacion de gemelos de pie', fromSesion: 'Pierna A', toNombre: 'Gemelos de pie', toSesion: 'Pierna A' },
  { fromNombre: 'Elevacion de piernas colgado', fromSesion: 'Pierna A', toNombre: 'Crunch en polea', toSesion: 'Pierna A' },

  { fromNombre: 'Elevaciones laterales', fromSesion: 'Ligero', toNombre: 'Elevaciones laterales', toSesion: 'Ligero' },
  { fromNombre: 'Pec deck invertido / pajaros', fromSesion: 'Ligero', toNombre: 'Pec deck invertido', toSesion: 'Ligero' },
  { fromNombre: 'Encogimientos de hombros', fromSesion: 'Ligero', toNombre: 'Encogimientos de hombros', toSesion: 'Ligero' },
  { fromNombre: 'Curl de muneca', fromSesion: 'Ligero', toNombre: 'Curl de muneca con mancuernas', toSesion: 'Ligero' },
  { fromNombre: 'Curl inverso', fromSesion: 'Ligero', toNombre: 'Curl inverso', toSesion: 'Ligero' },
  { fromNombre: 'Elevacion de gemelos sentado', fromSesion: 'Ligero', toNombre: 'Gemelos de pie', toSesion: 'Ligero' },
  { fromNombre: 'Crunch en polea', fromSesion: 'Ligero', toNombre: 'Crunch en polea', toSesion: 'Ligero' },

  { fromNombre: 'Press militar sentado', fromSesion: 'Torso B', toNombre: 'Press militar sentado', toSesion: 'Torso B' },
  { fromNombre: 'Dominadas / Jalon prono', fromSesion: 'Torso B', toNombre: 'Dominadas o jalon prono', toSesion: 'Torso B' },
  { fromNombre: 'Press de pecho en maquina', fromSesion: 'Torso B', toNombre: 'Fondos en paralelas lastrados', toSesion: 'Torso B' },
  { fromNombre: 'Remo en polea baja', fromSesion: 'Torso B', toNombre: 'Remo en polea baja (agarre estrecho)', toSesion: 'Torso B' },
  { fromNombre: 'Curl predicador / inclinado', fromSesion: 'Torso B', toNombre: 'Curl predicador', toSesion: 'Torso B' },
  { fromNombre: 'Press cerrado / extension sobre cabeza', fromSesion: 'Torso B', toNombre: 'Press frances con barra Z', toSesion: 'Torso B' },

  { fromNombre: 'Peso muerto rumano', fromSesion: 'Pierna B', toNombre: 'Peso muerto rumano', toSesion: 'Pierna B' },
  { fromNombre: 'Sentadilla hack o prensa', fromSesion: 'Pierna B', toNombre: 'Sentadilla hack o prensa', toSesion: 'Pierna B' },
  { fromNombre: 'Curl femoral tumbado', fromSesion: 'Pierna B', toNombre: 'Curl femoral sentado', toSesion: 'Pierna B' },
  { fromNombre: 'Empuje de cadera', fromSesion: 'Pierna B', toNombre: 'Empuje de cadera (Hip Thrust)', toSesion: 'Pierna B' },
  { fromNombre: 'Elevacion de gemelos de pie', fromSesion: 'Pierna B', toNombre: 'Gemelos de pie o en prensa', toSesion: 'Pierna B' },
  { fromNombre: 'Encogimientos de hombros', fromSesion: 'Pierna B', toNombre: 'Encogimientos de hombros', toSesion: 'Pierna B' },

  // v3 -> v4.1 (rutina_gimnasio_v4-1.pdf) renames. Separate block, on purpose:
  // fromNombre here must match what a real row is named TODAY (the v3 name the
  // block above already migrated it to), not the original pre-v3 name — a row's
  // nombre only ever holds its most recent value, so continuity has to chain
  // from wherever it actually is now, not from every name it has ever had.
  { fromNombre: 'Gemelos de pie', fromSesion: 'Pierna A', toNombre: 'Gemelos de pie (rodilla recta)', toSesion: 'Pierna A' },
  { fromNombre: 'Gemelos de pie', fromSesion: 'Ligero', toNombre: 'Gemelos de pie (rodilla recta)', toSesion: 'Ligero' },
  { fromNombre: 'Encogimientos de hombros', fromSesion: 'Ligero', toNombre: 'Encogimientos en banco inclinado 45 grados', toSesion: 'Ligero' },
  { fromNombre: 'Curl de muneca con mancuernas', fromSesion: 'Ligero', toNombre: 'Curl de muneca (palmas arriba)', toSesion: 'Ligero' },
  { fromNombre: 'Remo en polea baja (agarre estrecho)', fromSesion: 'Torso B', toNombre: 'Remo en polea (agarre ancho)', toSesion: 'Torso B' },
  { fromNombre: 'Gemelos de pie o en prensa', fromSesion: 'Pierna B', toNombre: 'Gemelos de pie o en prensa (pierna recta)', toSesion: 'Pierna B' },
];

const key = (nombre: string, sesion: string) => `${nombre}|${sesion}`;

interface ExerciseRow {
  id: number;
  nombre: string;
  sesion: string;
  activo: number;
}

export interface ReconcileReport {
  adopted: number; // rows matched to a catalog entry and refreshed
  inserted: number; // catalog entries that had no row at all
  deactivated: number; // rows no longer part of the catalog
}

/**
 * Makes the exercises table match the catalog in seed.ts, from ANY starting state.
 *
 * Written to be idempotent and self-healing rather than to assume a specific prior
 * schema version: two earlier one-shot migrations (11 and 12) each assumed the table
 * was in the exact state they expected, and each corrupted it differently when it
 * wasn't — migration 12 in particular searched by pre-v3 names against rows that
 * migration 11 had already renamed, failed to find them, and deactivated them.
 *
 * The fix is to reconcile by TARGET identity instead of source identity: every
 * catalog entry claims its row (by its own name first, by legacy name second), and
 * only rows that no catalog entry claims are deactivated. Running this twice changes
 * nothing the second time, and running it on a half-migrated table repairs it.
 *
 * Nothing is ever deleted — retired exercises are set activo = 0 so their set_logs
 * history stays intact and reversible.
 */
export async function reconcileExerciseCatalog(db: SQLiteDatabase): Promise<ReconcileReport> {
  // All reads happen up front, outside any write transaction. Reads interleaved
  // inside an open write transaction silently roll back writes in expo-sqlite —
  // that is the defect behind both migration 5 and migration 11.
  const rows = await db.getAllAsync<ExerciseRow>('SELECT id, nombre, sesion, activo FROM exercises');
  const historyRows = await db.getAllAsync<{ exercise_id: number; total: number }>(
    'SELECT exercise_id, COUNT(*) as total FROM set_logs GROUP BY exercise_id'
  );
  const historyByExercise = new Map(historyRows.map((r) => [r.exercise_id, r.total]));

  const rowsByKey = new Map<string, ExerciseRow[]>();
  for (const row of rows) {
    const k = key(row.nombre, row.sesion);
    const list = rowsByKey.get(k);
    if (list) list.push(row);
    else rowsByKey.set(k, [row]);
  }

  // When duplicates share a key, prefer the row carrying the most training history.
  const bestOf = (candidates: ExerciseRow[]): ExerciseRow =>
    [...candidates].sort((a, b) => {
      const diff = (historyByExercise.get(b.id) ?? 0) - (historyByExercise.get(a.id) ?? 0);
      return diff !== 0 ? diff : a.id - b.id;
    })[0];

  const claimedIds = new Set<number>();
  const toUpdate: { row: ExerciseRow; def: ExerciseSeed }[] = [];
  const toInsert: ExerciseSeed[] = [];

  for (const def of EXERCISES) {
    // 1. A row already living under this exercise's own name and session.
    const direct = rowsByKey.get(key(def.nombre, def.sesion))?.filter((r) => !claimedIds.has(r.id)) ?? [];
    if (direct.length > 0) {
      const row = bestOf(direct);
      claimedIds.add(row.id);
      toUpdate.push({ row, def });
      continue;
    }

    // 2. Otherwise adopt the pre-v3 row this exercise descends from, to keep history.
    const legacy = LEGACY_CONTINUITY.find((m) => m.toNombre === def.nombre && m.toSesion === def.sesion);
    if (legacy) {
      const candidates =
        rowsByKey.get(key(legacy.fromNombre, legacy.fromSesion))?.filter((r) => !claimedIds.has(r.id)) ?? [];
      if (candidates.length > 0) {
        const row = bestOf(candidates);
        claimedIds.add(row.id);
        toUpdate.push({ row, def });
        continue;
      }
    }

    // 3. Nothing to adopt — this exercise is genuinely new on this device.
    toInsert.push(def);
  }

  const toDeactivate = rows.filter((r) => !claimedIds.has(r.id) && r.activo === 1);

  // Writes only from here on — no reads inside the transaction.
  await db.withTransactionAsync(async () => {
    for (const { row, def } of toUpdate) {
      await db.runAsync(
        `UPDATE exercises SET nombre=?, grupo_muscular=?, equipo=?, sesion=?, orden=?,
           series_objetivo=?, reps_min=?, reps_max=?, rir_min=?, rir_max=?, rir_objetivo=?,
           descanso_seg=?, notas_tecnica=?, unidad_preferida=?, superset_group=?, activo=1
         WHERE id=?`,
        [
          def.nombre, def.grupo_muscular, def.equipo, def.sesion, def.orden,
          def.series_objetivo, def.reps_min, def.reps_max, def.rir_min, def.rir_max, def.rir_min,
          def.descanso_seg, def.notas_tecnica, def.unidad_preferida, def.superset_group ?? null,
          row.id,
        ]
      );
    }

    for (const def of toInsert) {
      await db.runAsync(
        `INSERT INTO exercises (
          nombre, grupo_muscular, equipo, sesion, orden,
          series_objetivo, reps_min, reps_max, rir_min, rir_max, rir_objetivo,
          descanso_seg, notas_tecnica, unidad_preferida, superset_group, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          def.nombre, def.grupo_muscular, def.equipo, def.sesion, def.orden,
          def.series_objetivo, def.reps_min, def.reps_max, def.rir_min, def.rir_max, def.rir_min,
          def.descanso_seg, def.notas_tecnica, def.unidad_preferida, def.superset_group ?? null,
        ]
      );
    }

    for (const row of toDeactivate) {
      await db.runAsync('UPDATE exercises SET activo = 0 WHERE id = ?', [row.id]);
    }
  });

  return {
    adopted: toUpdate.length,
    inserted: toInsert.length,
    deactivated: toDeactivate.length,
  };
}
