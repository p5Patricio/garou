import { useCallback, useEffect, useRef, useState } from 'react';
import { getDB, initDB } from '../db';
import type { LoadUnit, ProgressionResult, SetRow, SetState, SetsMap, UiExercise } from '../types/workout';
import { todayLocal } from '../utils/date';
import { isReadyToIncrease } from '../utils/progression';
import { resolveTodaySession, type SessionEstado, type TodaySession } from '../utils/workoutSession';

function mapExercise(row: any): UiExercise {
  const unit = (row.unidad_preferida ?? 'kg') as LoadUnit;
  return {
    id: row.id,
    nombre: row.nombre,
    grupoMuscular: row.grupo_muscular,
    equipo: row.equipo,
    sesion: row.sesion,
    series: row.series_objetivo,
    reps: [row.reps_min, row.reps_max],
    rir: row.rir_min ?? row.rir_objetivo ?? 0,
    descansoSeg: row.descanso_seg,
    notasTecnica: row.notas_tecnica,
    esBodyweight: unit === 'bw',
    unidadPreferida: unit,
    usaPlacas: unit === 'placas',
    supersetGroup: row.superset_group ?? null,
  };
}

export interface UseWorkoutReturn {
  loading: boolean;
  sessionId: number | null;
  tipoSesion: string;
  estado: SessionEstado;
  exercises: UiExercise[];
  sets: SetsMap;
  progressionByExercise: Record<number, ProgressionResult>;
  lastLoadByExercise: Record<number, { weight: number; unit: LoadUnit; reps: number }>;
  sessionComplete: boolean;
  completeSet: (exId: number, numSerie: number, state: SetState) => Promise<void>;
  undoSet: (exId: number, numSerie: number) => Promise<void>;
  updateSet: (exId: number, numSerie: number, field: keyof SetState, value: number | boolean | LoadUnit) => void;
  finishSession: () => Promise<void>;
  selectSession: (tipo: string) => Promise<void>;
  markRestDay: () => Promise<void>;
  undoRestDay: () => Promise<void>;
  setExerciseUnit: (exId: number, unit: LoadUnit) => Promise<void>;
  togglePlacas: (exId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useWorkout(): UseWorkoutReturn {
  const [loading, setLoading] = useState(true);
  const [tipoSesion, setTipoSesion] = useState('');
  const [estado, setEstado] = useState<SessionEstado>('sugerida');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<UiExercise[]>([]);
  const [sets, setSets] = useState<SetsMap>({});
  const [progressionByExercise, setProgressionByExercise] = useState<Record<number, ProgressionResult>>({});
  const [lastLoadByExercise, setLastLoadByExercise] = useState<Record<number, { weight: number; unit: LoadUnit; reps: number }>>({});
  const startTimeRef = useRef(Date.now());
  const pendingCompleteSet = useRef<Promise<void> | null>(null);

  const loadExercises = useCallback(async (sessionType: string): Promise<UiExercise[]> => {
    const rows = await getDB().getAllAsync<any>(
      `SELECT id, nombre, grupo_muscular, equipo, sesion,
              series_objetivo, reps_min, reps_max, rir_objetivo, rir_min,
              descanso_seg, notas_tecnica, unidad_preferida, superset_group
       FROM exercises
       WHERE sesion = ? AND activo = 1
       ORDER BY orden ASC, id ASC`,
      [sessionType]
    );
    return rows.map(mapExercise);
  }, []);

  const buildSetsMap = useCallback(async (exs: UiExercise[], sessId: number | null): Promise<{ sets: SetsMap; lastLoad: Record<number, { weight: number; unit: LoadUnit; reps: number }> }> => {
    const db = getDB();
    const setsMap: SetsMap = {};
    const lastLoad: Record<number, { weight: number; unit: LoadUnit; reps: number }> = {};
    const exIds = exs.map((e) => e.id);
    if (exIds.length === 0) return { sets: setsMap, lastLoad };

    const placeholders = exIds.map(() => '?').join(',');

    // Prior sets for each exercise (from completed sessions, excluding the current session).
    const priorRows = await db.getAllAsync<any>(
      `SELECT sl.exercise_id, sl.num_serie, sl.peso_kg, sl.carga_valor, sl.carga_unidad, sl.reps, sl.rir_real
       FROM set_logs sl
       JOIN workout_sessions ws ON ws.id = sl.session_id
       WHERE sl.exercise_id IN (${placeholders})
         AND ws.id <> ?
         AND sl.completada = 1
       ORDER BY ws.fecha DESC, sl.num_serie ASC`,
      [...exIds, sessId ?? -1]
    );

    const priorByExercise: Record<number, Record<number, { value: number; unit: LoadUnit; reps: number; rir: number | null }>> = {};
    for (const row of priorRows) {
      const exId = row.exercise_id;
      if (!priorByExercise[exId]) priorByExercise[exId] = {};
      if (!(row.num_serie in priorByExercise[exId])) {
        const ex = exs.find((e) => e.id === exId);
        priorByExercise[exId][row.num_serie] = {
          value: row.carga_valor ?? row.peso_kg ?? 0,
          unit: (row.carga_unidad ?? ex?.unidadPreferida ?? 'kg') as LoadUnit,
          reps: row.reps,
          rir: row.rir_real,
        };
      }
    }

    // Current session sets for each exercise, in one batch.
    const currentRows = sessId !== null
      ? await db.getAllAsync<any>(
          `SELECT exercise_id, num_serie, peso_kg, carga_valor, carga_unidad, reps, rir_real, completada
           FROM set_logs
           WHERE session_id = ? AND exercise_id IN (${placeholders})
           ORDER BY num_serie ASC`,
          [sessId, ...exIds]
        )
      : [];

    const currentByExercise: Record<number, Record<number, any>> = {};
    for (const row of currentRows) {
      if (!currentByExercise[row.exercise_id]) currentByExercise[row.exercise_id] = {};
      currentByExercise[row.exercise_id][row.num_serie] = row;
    }

    for (const ex of exs) {
      setsMap[ex.id] = {};
      const priorBySerie = priorByExercise[ex.id] ?? {};
      const currentBySerie = currentByExercise[ex.id] ?? {};

      // Last completed load (set 0) from the previous session for the "Última vez" label.
      const priorFirst = priorBySerie[0];
      if (priorFirst) {
        lastLoad[ex.id] = { weight: priorFirst.value, unit: priorFirst.unit, reps: priorFirst.reps };
      }

      for (let i = 0; i < ex.series; i++) {
        const current = currentBySerie[i];
        const prior = priorBySerie[i];
        setsMap[ex.id][i] = current
          ? {
              weight: current.carga_valor ?? current.peso_kg ?? 0,
              unit: (current.carga_unidad ?? ex.unidadPreferida) as LoadUnit,
              reps: current.reps,
              rir: current.rir_real ?? ex.rir,
              done: current.completada === 1,
              dirty: true,
            }
          : {
              weight: prior?.value ?? 0,
              unit: prior?.unit ?? ex.unidadPreferida,
              reps: prior?.reps ?? ex.reps[0],
              rir: prior?.rir ?? ex.rir,
              done: false,
              dirty: false,
            };
      }
    }

    return { sets: setsMap, lastLoad };
  }, []);

  const computeProgression = useCallback(async (exs: UiExercise[], currentSessionId: number | null, sessionType: string) => {
    const db = getDB();
    const result: Record<number, ProgressionResult> = {};
    if (exs.length === 0) return result;

    const exIds = exs.map((e) => e.id);

    // 1. Fetch the last 2 completed sessions for this session type (excluding the current one).
    const recentSessions = await db.getAllAsync<{ id: number }>(
      `SELECT id
       FROM workout_sessions
       WHERE completada = 1
         AND tipo_sesion = ?
         AND id <> ?
       ORDER BY fecha DESC
       LIMIT 2`,
      [sessionType, currentSessionId ?? -1]
    );

    if (recentSessions.length < 2) {
      for (const ex of exs) {
        result[ex.id] = { readyToIncrease: false, reason: 'Sin historial suficiente' };
      }
      return result;
    }

    const sessionIds = recentSessions.map((s) => s.id);
    const placeholders = exIds.map(() => '?').join(',');
    const sessionPlaceholders = sessionIds.map(() => '?').join(',');

    // 2. Fetch all set logs for these exercises in the last 2 sessions in one query.
    const rows = await db.getAllAsync<SetRow>(
      `SELECT id, session_id, exercise_id, num_serie, peso_kg, carga_valor, carga_unidad, reps, rir_real, completada
       FROM set_logs
       WHERE session_id IN (${sessionPlaceholders}) AND exercise_id IN (${placeholders})
       ORDER BY session_id, exercise_id, num_serie ASC`,
      [...sessionIds, ...exIds]
    );

    // 3. Group by exercise and then by session.
    const byExercise: Record<number, Record<number, SetRow[]>> = {};
    for (const row of rows) {
      if (!byExercise[row.exercise_id]) byExercise[row.exercise_id] = {};
      if (!byExercise[row.exercise_id][row.session_id]) byExercise[row.exercise_id][row.session_id] = [];
      byExercise[row.exercise_id][row.session_id].push(row);
    }

    for (const ex of exs) {
      const sessionsMap = byExercise[ex.id] ?? {};
      const sessionSets = recentSessions.map((s) => sessionsMap[s.id] ?? []);
      result[ex.id] = isReadyToIncrease(sessionSets, {
        repsMax: ex.reps[1],
        rirObjetivo: ex.rir,
        seriesObjetivo: ex.series,
      });
    }

    return result;
  }, []);

  const hydrate = useCallback(async (t: TodaySession): Promise<void> => {
    const exs = await loadExercises(t.tipo);
    const { sets: setsMap, lastLoad } = await buildSetsMap(exs, t.sessionId);
    const progression = await computeProgression(exs, t.sessionId, t.tipo);
    setTipoSesion(t.tipo);
    setEstado(t.estado);
    setSessionId(t.sessionId);
    setExercises(exs);
    setSets(setsMap);
    setProgressionByExercise(progression);
    setLastLoadByExercise(lastLoad);

    // Restore session start time for an in-progress session so duration is real.
    if (t.sessionId !== null && t.estado === 'pendiente') {
      try {
        const row = await getDB().getFirstAsync<{ started_at_ms: number | null }>(
          'SELECT started_at_ms FROM workout_sessions WHERE id = ?',
          [t.sessionId]
        );
        startTimeRef.current = row?.started_at_ms ?? Date.now();
      } catch (err) {
        console.error('[useWorkout] hydrate start time error', err);
        startTimeRef.current = Date.now();
      }
    }
  }, [buildSetsMap, computeProgression, loadExercises]);

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

  const createTodaySession = useCallback(async (tipo: string): Promise<number> => {
    const db = getDB();
    const fecha = todayLocal();
    const now = Date.now();
    const existing = await db.getFirstAsync<{ id: number; started_at_ms: number | null }>(
      `SELECT id, started_at_ms FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0 AND es_descanso = 0
       LIMIT 1`,
      [fecha, tipo]
    );
    if (existing) {
      startTimeRef.current = existing.started_at_ms ?? now;
      return existing.id;
    }

    await db.runAsync(
      `INSERT OR IGNORE INTO workout_sessions (fecha, tipo_sesion, completada, es_descanso, started_at_ms)
       VALUES (?, ?, 0, 0, ?)`,
      [fecha, tipo, now]
    );
    const created = await db.getFirstAsync<{ id: number }>(
      `SELECT id FROM workout_sessions
       WHERE fecha = ? AND tipo_sesion = ? AND completada = 0 AND es_descanso = 0
       LIMIT 1`,
      [fecha, tipo]
    );
    if (!created) throw new Error('Failed to create workout session');
    startTimeRef.current = now;
    return created.id;
  }, []);

  const clearTodayNonCompleted = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = todayLocal();
    await db.runAsync(
      `DELETE FROM set_logs
       WHERE session_id IN (SELECT id FROM workout_sessions WHERE fecha = ? AND completada = 0)`,
      [fecha]
    );
    await db.runAsync('DELETE FROM workout_sessions WHERE fecha = ? AND completada = 0', [fecha]);
  }, []);

  const completeSet = useCallback(async (exId: number, numSerie: number, state: SetState): Promise<void> => {
    const promise = (async () => {
      const db = getDB();
      let sessId = sessionId;
      if (sessId === null) {
        sessId = await createTodaySession(tipoSesion);
        setSessionId(sessId);
        setEstado('pendiente');
      }

      await db.runAsync(
        `INSERT INTO set_logs (session_id, exercise_id, num_serie, peso_kg, carga_valor, carga_unidad, reps, rir_real, completada)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
         ON CONFLICT(session_id, exercise_id, num_serie)
         DO UPDATE SET
           peso_kg = excluded.peso_kg,
           carga_valor = excluded.carga_valor,
           carga_unidad = excluded.carga_unidad,
           reps = excluded.reps,
           rir_real = excluded.rir_real,
           completada = excluded.completada`,
        [sessId, exId, numSerie, state.unit === 'kg' ? state.weight : 0, state.weight, state.unit, state.reps, state.rir]
      );

      setSets((prev) => {
        const ex = exercises.find((item) => item.id === exId);
        const currentExerciseSets = prev[exId] ?? {};
        const completed = { ...state, done: true, dirty: true, completedAt: Date.now() };
        const nextExerciseSets = { ...currentExerciseSets, [numSerie]: completed };
        const nextIdx = numSerie + 1;

        if (ex && nextIdx < ex.series) {
          const nextSet = currentExerciseSets[nextIdx];
          if (nextSet && !nextSet.done && !nextSet.dirty) {
            nextExerciseSets[nextIdx] = {
              ...nextSet,
              weight: completed.weight,
              unit: completed.unit,
              reps: completed.reps,
              rir: completed.rir,
              dirty: false,
            };
          }
        }

        return {
          ...prev,
          [exId]: nextExerciseSets,
        };
      });
    })();
    pendingCompleteSet.current = promise;
    try {
      await promise;
    } finally {
      pendingCompleteSet.current = null;
    }
  }, [createTodaySession, exercises, sessionId, tipoSesion]);

  const undoSet = useCallback(async (exId: number, numSerie: number): Promise<void> => {
    if (sessionId !== null) {
      await getDB().runAsync(
        'DELETE FROM set_logs WHERE session_id = ? AND exercise_id = ? AND num_serie = ?',
        [sessionId, exId, numSerie]
      );
    }

    setSets((prev) => {
      const current = prev[exId]?.[numSerie];
      if (!current) return prev;
      return {
        ...prev,
        [exId]: {
          ...prev[exId],
          [numSerie]: { ...current, done: false, dirty: true, completedAt: undefined },
        },
      };
    });
  }, [sessionId]);

  const updateSet = useCallback((exId: number, numSerie: number, field: keyof SetState, value: number | boolean | LoadUnit): void => {
    setSets((prev) => ({
      ...prev,
      [exId]: {
        ...prev[exId],
        [numSerie]: { ...prev[exId][numSerie], [field]: value, dirty: true },
      },
    }));
  }, []);

  const sessionComplete =
    !loading &&
    estado !== 'descanso' &&
    exercises.length > 0 &&
    exercises.every((ex) => {
      const exSets = sets[ex.id];
      return !!exSets && Array.from({ length: ex.series }).every((_, i) => exSets[i]?.done === true);
    });

  const finishSession = useCallback(async (): Promise<void> => {
    if (sessionId === null) return;
    // Wait for any pending set write so the session is fully persisted before completing.
    if (pendingCompleteSet.current) {
      await pendingCompleteSet.current;
    }
    const startedAt = startTimeRef.current ?? sessionId;
    const elapsedMin = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    await getDB().runAsync(
      'UPDATE workout_sessions SET completada = 1, duracion_min = ?, started_at_ms = ? WHERE id = ?',
      [elapsedMin, startedAt, sessionId]
    );
    setEstado('completada');
  }, [sessionId]);

  const selectSession = useCallback(async (tipo: string): Promise<void> => {
    await clearTodayNonCompleted();
    const newSessionId = await createTodaySession(tipo);
    await hydrate({ tipo, estado: 'pendiente', sessionId: newSessionId });
  }, [clearTodayNonCompleted, createTodaySession, hydrate]);

  const markRestDay = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = todayLocal();
    await clearTodayNonCompleted();
    await db.runAsync(
      'INSERT INTO workout_sessions (fecha, tipo_sesion, completada, es_descanso) VALUES (?, ?, 0, 1)',
      [fecha, tipoSesion]
    );
    const rest = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM workout_sessions WHERE fecha = ? AND es_descanso = 1 ORDER BY id DESC LIMIT 1',
      [fecha]
    );
    await hydrate({ tipo: tipoSesion, estado: 'descanso', sessionId: rest?.id ?? null });
  }, [clearTodayNonCompleted, hydrate, tipoSesion]);

  const undoRestDay = useCallback(async (): Promise<void> => {
    await clearTodayNonCompleted();
    await hydrate(await resolveTodaySession(getDB()));
  }, [clearTodayNonCompleted, hydrate]);

  const setExerciseUnit = useCallback(async (exId: number, unit: LoadUnit): Promise<void> => {
    await getDB().runAsync('UPDATE exercises SET unidad_preferida = ? WHERE id = ?', [unit, exId]);
    const exs = await loadExercises(tipoSesion);
    setExercises(exs);
    setSets((prev) => {
      const existing = prev[exId];
      if (!existing) return prev;
      const nextSets = { ...existing };
      Object.keys(nextSets).forEach((idx) => {
        const key = Number(idx);
        if (!nextSets[key].done) nextSets[key] = { ...nextSets[key], unit };
      });
      return { ...prev, [exId]: nextSets };
    });
  }, [loadExercises, tipoSesion]);

  const togglePlacas = useCallback(async (exId: number): Promise<void> => {
    const ex = exercises.find((item) => item.id === exId);
    await setExerciseUnit(exId, ex?.unidadPreferida === 'placas' ? 'kg' : 'placas');
  }, [exercises, setExerciseUnit]);

  const refresh = useCallback(async (): Promise<void> => {
    if (tipoSesion) {
      await hydrate({ tipo: tipoSesion, estado, sessionId });
    } else {
      const t = await resolveTodaySession(getDB());
      await hydrate(t);
    }
  }, [estado, hydrate, sessionId, tipoSesion]);

  return {
    loading,
    sessionId,
    tipoSesion,
    estado,
    exercises,
    sets,
    progressionByExercise,
    lastLoadByExercise,
    sessionComplete,
    completeSet,
    undoSet,
    updateSet,
    finishSession,
    selectSession,
    markRestDay,
    undoRestDay,
    setExerciseUnit,
    togglePlacas,
    refresh,
  };
}
