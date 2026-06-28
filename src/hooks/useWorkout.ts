import { useState, useEffect, useRef, useCallback } from 'react';
import { initDB, getDB } from '../db';
import { isReadyToIncrease } from '../utils/progression';
import { resolveTodaySession, type SessionEstado, type TodaySession } from '../utils/sessionRotation';
import type {
  UiExercise,
  SetState,
  SetsMap,
  SetRow,
  ProgressionResult,
} from '../types/workout';

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
  usa_placas: number;
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
    usaPlacas: row.usa_placas === 1,
  };
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseWorkoutReturn {
  loading: boolean;
  sessionId: number | null;
  tipoSesion: string;
  estado: SessionEstado;
  exercises: UiExercise[];
  sets: SetsMap;
  progressionByExercise: Record<number, ProgressionResult>;
  sessionComplete: boolean;
  completeSet: (exId: number, numSerie: number, state: SetState) => Promise<void>;
  updateSet: (exId: number, numSerie: number, field: keyof SetState, value: number | boolean) => void;
  finishSession: () => Promise<void>;
  selectSession: (tipo: string) => Promise<void>;
  markRestDay: () => Promise<void>;
  undoRestDay: () => Promise<void>;
  togglePlacas: (exId: number) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWorkout(): UseWorkoutReturn {
  const [loading, setLoading] = useState(true);
  const [tipoSesion, setTipoSesion] = useState<string>('');
  const [estado, setEstado] = useState<SessionEstado>('sugerida');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<UiExercise[]>([]);
  const [sets, setSets] = useState<SetsMap>({});
  const [progressionByExercise, setProgressionByExercise] = useState<Record<number, ProgressionResult>>({});

  // Track session start time to compute duracion_min on finish
  const startTimeRef = useRef<number>(Date.now());

  // --------------------------------------------------------------------------
  // Load exercises for the session's tipo_sesion
  // --------------------------------------------------------------------------
  const loadExercises = useCallback(async (sessionType: string): Promise<UiExercise[]> => {
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
      usa_placas: number;
    }>(
      `SELECT id, nombre, grupo_muscular, equipo, sesion,
              series_objetivo, reps_min, reps_max, rir_objetivo,
              descanso_seg, notas_tecnica, usa_placas
       FROM exercises
       WHERE sesion = ?
       ORDER BY id ASC`,
      [sessionType]
    );
    return rows.map(mapExercise);
  }, []);

  // --------------------------------------------------------------------------
  // Build initial SetsMap from prior session data + current session's logs.
  // sessId may be null when no session row exists yet (lazy creation).
  // --------------------------------------------------------------------------
  const buildSetsMap = useCallback(
    async (exs: UiExercise[], sessId: number | null): Promise<SetsMap> => {
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
          [ex.id, sessId ?? -1]
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

        // Check if this session already has logged sets (auto-resume).
        // Skip entirely when there's no session row yet.
        const currentBySerie: Record<number, { peso_kg: number; reps: number; rir_real: number | null; completada: number }> = {};
        if (sessId !== null) {
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
          for (const row of currentRows) {
            currentBySerie[row.num_serie] = row;
          }
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
    async (exs: UiExercise[], currentSessionId: number | null, sessionType: string): Promise<Record<number, ProgressionResult>> => {
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
          [sessionType, currentSessionId ?? -1]
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
    []
  );

  // --------------------------------------------------------------------------
  // hydrate — load exercises/sets/progression for a resolved day state
  // --------------------------------------------------------------------------
  const hydrate = useCallback(
    async (t: TodaySession): Promise<void> => {
      const exs = await loadExercises(t.tipo);
      const setsMap = await buildSetsMap(exs, t.sessionId);
      const progression = await computeProgression(exs, t.sessionId, t.tipo);

      setTipoSesion(t.tipo);
      setEstado(t.estado);
      setSessionId(t.sessionId);
      setExercises(exs);
      setSets(setsMap);
      setProgressionByExercise(progression);
    },
    [loadExercises, buildSetsMap, computeProgression]
  );

  // --------------------------------------------------------------------------
  // Initial load
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await initDB();
        const t = await resolveTodaySession(getDB());
        if (!cancelled) await hydrate(t);
      } catch (err) {
        console.error('[useWorkout] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [hydrate]);

  // --------------------------------------------------------------------------
  // createTodaySession — lazily create today's pending row for a tipo
  // --------------------------------------------------------------------------
  const createTodaySession = useCallback(async (tipo: string): Promise<number> => {
    const db = getDB();
    const fecha = today();

    const existing = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0 AND es_descanso = 0
       LIMIT 1`,
      [fecha, tipo]
    );
    if (existing) return existing.id;

    await db.runAsync(
      `INSERT OR IGNORE INTO workout_sessions (fecha, tipo_sesion, completada, es_descanso)
       VALUES (?, ?, 0, 0)`,
      [fecha, tipo]
    );
    const created = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0 AND es_descanso = 0
       LIMIT 1`,
      [fecha, tipo]
    );
    if (!created) throw new Error('Failed to create workout session');

    startTimeRef.current = Date.now();
    return created.id;
  }, []);

  // --------------------------------------------------------------------------
  // clearTodayNonCompleted — remove today's pending/rest rows and their logs,
  // leaving completed sessions (history) untouched.
  // --------------------------------------------------------------------------
  const clearTodayNonCompleted = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = today();
    await db.runAsync(
      `DELETE FROM set_logs
       WHERE session_id IN (SELECT id FROM workout_sessions WHERE fecha = ? AND completada = 0)`,
      [fecha]
    );
    await db.runAsync(
      `DELETE FROM workout_sessions WHERE fecha = ? AND completada = 0`,
      [fecha]
    );
  }, []);

  // --------------------------------------------------------------------------
  // completeSet — UPSERT to DB, then update local state.
  // Lazily creates today's session row on the first logged set.
  // --------------------------------------------------------------------------
  const completeSet = useCallback(
    async (exId: number, numSerie: number, state: SetState): Promise<void> => {
      const db = getDB();

      let sessId = sessionId;
      if (sessId === null) {
        sessId = await createTodaySession(tipoSesion);
        setSessionId(sessId);
        setEstado('pendiente');
      }

      await db.runAsync(
        `INSERT INTO set_logs (session_id, exercise_id, num_serie, peso_kg, reps, rir_real, completada)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(session_id, exercise_id, num_serie)
         DO UPDATE SET
           peso_kg    = excluded.peso_kg,
           reps       = excluded.reps,
           rir_real   = excluded.rir_real,
           completada = excluded.completada`,
        [sessId, exId, numSerie, state.weight, state.reps, state.rir]
      );

      setSets((prev) => ({
        ...prev,
        [exId]: {
          ...prev[exId],
          [numSerie]: { ...state, done: true },
        },
      }));
    },
    [sessionId, tipoSesion, createTodaySession]
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
    estado !== 'descanso' &&
    exercises.length > 0 &&
    exercises.every((ex) => {
      const exSets = sets[ex.id];
      if (!exSets) return false;
      return Array.from({ length: ex.series }).every((_, i) => exSets[i]?.done === true);
    });

  // --------------------------------------------------------------------------
  // finishSession — mark completada = 1 (works even with unfinished exercises).
  // No-op when nothing was logged (no session row yet).
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
    setEstado('completada');
  }, [sessionId]);

  // --------------------------------------------------------------------------
  // selectSession — switch the day to a chosen session type. Discards today's
  // in-progress (non-completed) work and starts the chosen one fresh.
  // --------------------------------------------------------------------------
  const selectSession = useCallback(
    async (tipo: string): Promise<void> => {
      await clearTodayNonCompleted();
      startTimeRef.current = Date.now();
      await hydrate({ tipo, estado: 'sugerida', sessionId: null });
    },
    [clearTodayNonCompleted, hydrate]
  );

  // --------------------------------------------------------------------------
  // markRestDay — record today as a rest day ("didn't go to the gym").
  // --------------------------------------------------------------------------
  const markRestDay = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = today();
    await clearTodayNonCompleted();

    await db.runAsync(
      `INSERT INTO workout_sessions (fecha, tipo_sesion, completada, es_descanso)
       VALUES (?, ?, 0, 1)`,
      [fecha, tipoSesion]
    );
    const rest = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND es_descanso = 1
       ORDER BY id DESC LIMIT 1`,
      [fecha]
    );
    await hydrate({ tipo: tipoSesion, estado: 'descanso', sessionId: rest?.id ?? null });
  }, [clearTodayNonCompleted, hydrate, tipoSesion]);

  // --------------------------------------------------------------------------
  // undoRestDay — remove today's rest marker and return to the suggested state.
  // --------------------------------------------------------------------------
  const undoRestDay = useCallback(async (): Promise<void> => {
    await clearTodayNonCompleted();
    const t = await resolveTodaySession(getDB());
    await hydrate(t);
  }, [clearTodayNonCompleted, hydrate]);

  // --------------------------------------------------------------------------
  // togglePlacas — flip the kg/placas unit for one exercise, then refresh list
  // --------------------------------------------------------------------------
  const togglePlacas = useCallback(
    async (exId: number): Promise<void> => {
      const db = getDB();
      await db.runAsync(
        `UPDATE exercises
         SET usa_placas = CASE WHEN usa_placas = 1 THEN 0 ELSE 1 END
         WHERE id = ?`,
        [exId]
      );
      const exs = await loadExercises(tipoSesion);
      setExercises(exs);
    },
    [loadExercises, tipoSesion]
  );

  return {
    loading,
    sessionId,
    tipoSesion,
    estado,
    exercises,
    sets,
    progressionByExercise,
    sessionComplete,
    completeSet,
    updateSet,
    finishSession,
    selectSession,
    markRestDay,
    undoRestDay,
    togglePlacas,
  };
}
