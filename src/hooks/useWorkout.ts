import { useState, useEffect, useRef, useCallback } from 'react';
import { initDB, getDB } from '../db';
import { isReadyToIncrease } from '../utils/progression';
import type {
  UiExercise,
  SetState,
  SetsMap,
  SetRow,
  ProgressionResult,
} from '../types/workout';

// Default session type for Phase 1 — no rotation algorithm yet.
export const DEFAULT_TIPO_SESION = 'Pierna A';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// Map DB exercise row to the UI shape consumed by train.tsx
function mapExercise(row: {
  id: number;
  nombre: string;
  grupo_muscular: string;
  equipo: string;
  sesion: string;
  series_objetivo: number;
  reps_min: number;
  reps_max: number;
  rir_objetivo: number;
  descanso_seg: number;
  notas_tecnica: string | null;
}): UiExercise {
  return {
    id: row.id,
    nombre: row.nombre,
    grupoMuscular: row.grupo_muscular,
    equipo: row.equipo,
    sesion: row.sesion,
    series: row.series_objetivo,
    reps: [row.reps_min, row.reps_max],
    rir: row.rir_objetivo,
    descansoSeg: row.descanso_seg,
    notasTecnica: row.notas_tecnica,
    esBodyweight: row.equipo === 'libre' && row.grupo_muscular === 'Abdomen',
  };
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseWorkoutReturn {
  loading: boolean;
  sessionId: number | null;
  tipoSesion: string;
  exercises: UiExercise[];
  sets: SetsMap;
  progressionByExercise: Record<number, ProgressionResult>;
  sessionComplete: boolean;
  completeSet: (exId: number, numSerie: number, state: SetState) => Promise<void>;
  updateSet: (exId: number, numSerie: number, field: keyof SetState, value: number | boolean) => void;
  finishSession: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkout(tipoSesion: string = DEFAULT_TIPO_SESION): UseWorkoutReturn {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<UiExercise[]>([]);
  const [sets, setSets] = useState<SetsMap>({});
  const [progressionByExercise, setProgressionByExercise] = useState<Record<number, ProgressionResult>>({});

  // Track session start time to compute duracion_min on finish
  const startTimeRef = useRef<number>(Date.now());

  // --------------------------------------------------------------------------
  // Session resolution: resume-or-create
  // --------------------------------------------------------------------------
  const resolveSession = useCallback(async (): Promise<number> => {
    const db = getDB();
    const fecha = today();

    // Look for an incomplete session for today
    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0
       LIMIT 1`,
      [fecha, tipoSesion]
    );

    if (existing) {
      return existing.id;
    }

    // Create a new session (INSERT OR IGNORE guards against duplicates)
    await db.runAsync(
      `INSERT OR IGNORE INTO workout_sessions (fecha, tipo_sesion, completada)
       VALUES (?, ?, 0)`,
      [fecha, tipoSesion]
    );

    const created = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0
       LIMIT 1`,
      [fecha, tipoSesion]
    );

    if (!created) {
      throw new Error('Failed to create workout session');
    }

    startTimeRef.current = Date.now();
    return created.id;
  }, [tipoSesion]);

  // --------------------------------------------------------------------------
  // Load exercises for the session's tipo_sesion
  // --------------------------------------------------------------------------
  const loadExercises = useCallback(async (): Promise<UiExercise[]> => {
    const db = getDB();
    const rows = await db.getAllAsync<{
      id: number;
      nombre: string;
      grupo_muscular: string;
      equipo: string;
      sesion: string;
      series_objetivo: number;
      reps_min: number;
      reps_max: number;
      rir_objetivo: number;
      descanso_seg: number;
      notas_tecnica: string | null;
    }>(
      `SELECT id, nombre, grupo_muscular, equipo, sesion,
              series_objetivo, reps_min, reps_max, rir_objetivo,
              descanso_seg, notas_tecnica
       FROM exercises
       WHERE sesion = ?
       ORDER BY id ASC`,
      [tipoSesion]
    );
    return rows.map(mapExercise);
  }, [tipoSesion]);

  // --------------------------------------------------------------------------
  // Build initial SetsMap from prior session data + current session's logs
  // --------------------------------------------------------------------------
  const buildSetsMap = useCallback(
    async (exs: UiExercise[], sessId: number): Promise<SetsMap> => {
      const db = getDB();
      const setsMap: SetsMap = {};

      for (const ex of exs) {
        setsMap[ex.id] = {};

        // Pre-fill from most recent prior completed session (any session type)
        const priorRows = await db.getAllAsync<{
          num_serie: number;
          peso_kg: number;
          reps: number;
          rir_real: number | null;
        }>(
          `SELECT sl.num_serie, sl.peso_kg, sl.reps, sl.rir_real
           FROM set_logs sl
           JOIN workout_sessions ws ON ws.id = sl.session_id
           WHERE sl.exercise_id = ?
             AND ws.id <> ?
             AND sl.completada = 1
           ORDER BY ws.fecha DESC, sl.num_serie ASC`,
          [ex.id, sessId]
        );

        // Build a map of the most recent weight/reps per serie index
        const priorByNumSerie: Record<number, { peso_kg: number; reps: number; rir_real: number | null }> = {};
        for (const row of priorRows) {
          // priorRows is ordered by fecha DESC — first hit wins (most recent)
          if (!(row.num_serie in priorByNumSerie)) {
            priorByNumSerie[row.num_serie] = {
              peso_kg: row.peso_kg,
              reps: row.reps,
              rir_real: row.rir_real,
            };
          }
        }

        // Check if this session already has logged sets (auto-resume)
        const currentRows = await db.getAllAsync<{
          num_serie: number;
          peso_kg: number;
          reps: number;
          rir_real: number | null;
          completada: number;
        }>(
          `SELECT num_serie, peso_kg, reps, rir_real, completada
           FROM set_logs
           WHERE session_id = ? AND exercise_id = ?
           ORDER BY num_serie ASC`,
          [sessId, ex.id]
        );

        const currentBySerie: Record<number, { peso_kg: number; reps: number; rir_real: number | null; completada: number }> = {};
        for (const row of currentRows) {
          currentBySerie[row.num_serie] = row;
        }

        // Populate each set slot (num_serie is 0-indexed in the UI)
        for (let i = 0; i < ex.series; i++) {
          const current = currentBySerie[i];
          if (current) {
            // Already logged in this session — restore its state
            setsMap[ex.id][i] = {
              weight: current.peso_kg,
              reps: current.reps,
              rir: current.rir_real ?? ex.rir,
              done: current.completada === 1,
            };
          } else {
            // Pre-fill from prior session or use defaults
            const prior = priorByNumSerie[i];
            setsMap[ex.id][i] = {
              weight: prior ? prior.peso_kg : 0,
              reps: prior ? prior.reps : ex.reps[0],
              rir: prior?.rir_real != null ? prior.rir_real : ex.rir,
              done: false,
            };
          }
        }
      }

      return setsMap;
    },
    []
  );

  // --------------------------------------------------------------------------
  // Compute progression for all exercises
  // --------------------------------------------------------------------------
  const computeProgression = useCallback(
    async (exs: UiExercise[], currentSessionId: number): Promise<Record<number, ProgressionResult>> => {
      const db = getDB();
      const result: Record<number, ProgressionResult> = {};

      for (const ex of exs) {
        // Fetch the 2 most recent prior COMPLETED sessions with the same tipo_sesion
        const recentSessions = await db.getAllAsync<{ id: number }>(
          `SELECT ws.id
           FROM workout_sessions ws
           WHERE ws.completada = 1
             AND ws.tipo_sesion = ?
             AND ws.id <> ?
           ORDER BY ws.fecha DESC
           LIMIT 2`,
          [tipoSesion, currentSessionId]
        );

        if (recentSessions.length < 2) {
          result[ex.id] = {
            readyToIncrease: false,
            reason: 'Sin historial suficiente — se necesitan 2 sesiones completadas',
          };
          continue;
        }

        const sessionSets: SetRow[][] = [];
        for (const sess of recentSessions) {
          const rows = await db.getAllAsync<SetRow>(
            `SELECT id, session_id, exercise_id, num_serie, peso_kg, reps, rir_real, completada
             FROM set_logs
             WHERE session_id = ? AND exercise_id = ?
             ORDER BY num_serie ASC`,
            [sess.id, ex.id]
          );
          sessionSets.push(rows);
        }

        result[ex.id] = isReadyToIncrease(sessionSets, {
          repsMax: ex.reps[1],
          rirObjetivo: ex.rir,
          seriesObjetivo: ex.series,
        });
      }

      return result;
    },
    [tipoSesion]
  );

  // --------------------------------------------------------------------------
  // Initial load
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await initDB();
        const sessId = await resolveSession();
        const exs = await loadExercises();
        const setsMap = await buildSetsMap(exs, sessId);
        const progression = await computeProgression(exs, sessId);

        if (!cancelled) {
          setSessionId(sessId);
          setExercises(exs);
          setSets(setsMap);
          setProgressionByExercise(progression);
        }
      } catch (err) {
        console.error('[useWorkout] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tipoSesion, resolveSession, loadExercises, buildSetsMap, computeProgression]);

  // --------------------------------------------------------------------------
  // completeSet — UPSERT to DB, then update local state
  // --------------------------------------------------------------------------
  const completeSet = useCallback(
    async (exId: number, numSerie: number, state: SetState): Promise<void> => {
      if (sessionId === null) return;
      const db = getDB();

      await db.runAsync(
        `INSERT INTO set_logs (session_id, exercise_id, num_serie, peso_kg, reps, rir_real, completada)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(session_id, exercise_id, num_serie)
         DO UPDATE SET
           peso_kg    = excluded.peso_kg,
           reps       = excluded.reps,
           rir_real   = excluded.rir_real,
           completada = excluded.completada`,
        [sessionId, exId, numSerie, state.weight, state.reps, state.rir]
      );

      setSets((prev) => ({
        ...prev,
        [exId]: {
          ...prev[exId],
          [numSerie]: { ...state, done: true },
        },
      }));
    },
    [sessionId]
  );

  // --------------------------------------------------------------------------
  // updateSet — in-memory only, no DB write
  // --------------------------------------------------------------------------
  const updateSet = useCallback(
    (exId: number, numSerie: number, field: keyof SetState, value: number | boolean): void => {
      setSets((prev) => ({
        ...prev,
        [exId]: {
          ...prev[exId],
          [numSerie]: { ...prev[exId][numSerie], [field]: value },
        },
      }));
    },
    []
  );

  // --------------------------------------------------------------------------
  // sessionComplete derived value
  // --------------------------------------------------------------------------
  const sessionComplete =
    !loading &&
    exercises.length > 0 &&
    exercises.every((ex) => {
      const exSets = sets[ex.id];
      if (!exSets) return false;
      return Array.from({ length: ex.series }).every((_, i) => exSets[i]?.done === true);
    });

  // --------------------------------------------------------------------------
  // finishSession — mark workout_sessions.completada = 1 and record duration
  // --------------------------------------------------------------------------
  const finishSession = useCallback(async (): Promise<void> => {
    if (sessionId === null) return;
    const db = getDB();
    const elapsedMin = Math.round((Date.now() - startTimeRef.current) / 60000);

    await db.runAsync(
      `UPDATE workout_sessions
       SET completada = 1, duracion_min = ?
       WHERE id = ?`,
      [elapsedMin, sessionId]
    );
  }, [sessionId]);

  return {
    loading,
    sessionId,
    tipoSesion,
    exercises,
    sets,
    progressionByExercise,
    sessionComplete,
    completeSet,
    updateSet,
    finishSession,
  };
}
