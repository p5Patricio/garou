import { useCallback, useEffect, useRef, useState } from 'react';
import { getDB, initDB } from '../db';
import type { LoadUnit, ProgressionResult, SetRow, SetState, SetsMap, UiExercise } from '../types/workout';
import { isReadyToIncrease } from '../utils/progression';
import { resolveTodaySession, type SessionEstado, type TodaySession } from '../utils/workoutSession';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

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
}

export function useWorkout(): UseWorkoutReturn {
  const [loading, setLoading] = useState(true);
  const [tipoSesion, setTipoSesion] = useState('');
  const [estado, setEstado] = useState<SessionEstado>('sugerida');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [exercises, setExercises] = useState<UiExercise[]>([]);
  const [sets, setSets] = useState<SetsMap>({});
  const [progressionByExercise, setProgressionByExercise] = useState<Record<number, ProgressionResult>>({});
  const startTimeRef = useRef(Date.now());

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

  const buildSetsMap = useCallback(async (exs: UiExercise[], sessId: number | null): Promise<SetsMap> => {
    const db = getDB();
    const setsMap: SetsMap = {};

    for (const ex of exs) {
      setsMap[ex.id] = {};
      const priorRows = await db.getAllAsync<any>(
        `SELECT sl.num_serie, sl.peso_kg, sl.carga_valor, sl.carga_unidad, sl.reps, sl.rir_real
         FROM set_logs sl
         JOIN workout_sessions ws ON ws.id = sl.session_id
         WHERE sl.exercise_id = ?
           AND ws.id <> ?
           AND sl.completada = 1
         ORDER BY ws.fecha DESC, sl.num_serie ASC`,
        [ex.id, sessId ?? -1]
      );

      const priorBySerie: Record<number, { value: number; unit: LoadUnit; reps: number; rir: number | null }> = {};
      for (const row of priorRows) {
        if (!(row.num_serie in priorBySerie)) {
          priorBySerie[row.num_serie] = {
            value: row.carga_valor ?? row.peso_kg ?? 0,
            unit: (row.carga_unidad ?? ex.unidadPreferida) as LoadUnit,
            reps: row.reps,
            rir: row.rir_real,
          };
        }
      }

      const currentBySerie: Record<number, any> = {};
      if (sessId !== null) {
        const currentRows = await db.getAllAsync<any>(
          `SELECT num_serie, peso_kg, carga_valor, carga_unidad, reps, rir_real, completada
           FROM set_logs
           WHERE session_id = ? AND exercise_id = ?
           ORDER BY num_serie ASC`,
          [sessId, ex.id]
        );
        for (const row of currentRows) {
          currentBySerie[row.num_serie] = row;
        }
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

    return setsMap;
  }, []);

  const computeProgression = useCallback(async (exs: UiExercise[], currentSessionId: number | null, sessionType: string) => {
    const db = getDB();
    const result: Record<number, ProgressionResult> = {};

    for (const ex of exs) {
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
        result[ex.id] = { readyToIncrease: false, reason: 'Sin historial suficiente' };
        continue;
      }

      const sessionSets: SetRow[][] = [];
      for (const sess of recentSessions) {
        const rows = await db.getAllAsync<SetRow>(
          `SELECT id, session_id, exercise_id, num_serie, peso_kg, carga_valor, carga_unidad, reps, rir_real, completada
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
  }, []);

  const hydrate = useCallback(async (t: TodaySession): Promise<void> => {
    const exs = await loadExercises(t.tipo);
    const setsMap = await buildSetsMap(exs, t.sessionId);
    const progression = await computeProgression(exs, t.sessionId, t.tipo);
    setTipoSesion(t.tipo);
    setEstado(t.estado);
    setSessionId(t.sessionId);
    setExercises(exs);
    setSets(setsMap);
    setProgressionByExercise(progression);
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

  const clearTodayNonCompleted = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = today();
    await db.runAsync(
      `DELETE FROM set_logs
       WHERE session_id IN (SELECT id FROM workout_sessions WHERE fecha = ? AND completada = 0)`,
      [fecha]
    );
    await db.runAsync('DELETE FROM workout_sessions WHERE fecha = ? AND completada = 0', [fecha]);
  }, []);

  const completeSet = useCallback(async (exId: number, numSerie: number, state: SetState): Promise<void> => {
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
    const elapsedMin = Math.round((Date.now() - startTimeRef.current) / 60000);
    await getDB().runAsync('UPDATE workout_sessions SET completada = 1, duracion_min = ? WHERE id = ?', [elapsedMin, sessionId]);
    setEstado('completada');
  }, [sessionId]);

  const selectSession = useCallback(async (tipo: string): Promise<void> => {
    await clearTodayNonCompleted();
    const newSessionId = await createTodaySession(tipo);
    startTimeRef.current = Date.now();
    await hydrate({ tipo, estado: 'pendiente', sessionId: newSessionId });
  }, [clearTodayNonCompleted, createTodaySession, hydrate]);

  const markRestDay = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = today();
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
    undoSet,
    updateSet,
    finishSession,
    selectSession,
    markRestDay,
    undoRestDay,
    setExerciseUnit,
    togglePlacas,
  };
}
