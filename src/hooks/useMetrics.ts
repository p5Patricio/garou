import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { weeklyAverage, trendDirection, groupWeeklyAverages } from '../utils/stats';
import type {
  WeightEntry,
  WaistEntry,
  BodyMetricRow,
  StrengthExercise,
  StrengthPoint,
  WeeklyBucket,
  MetricsTrend,
  UseMetricsReturn,
} from '../types/metrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMetrics(): UseMetricsReturn {
  const [loading, setLoading] = useState(true);
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [waistEntries, setWaistEntries] = useState<WaistEntry[]>([]);
  const [weeklyWeight, setWeeklyWeight] = useState<WeeklyBucket[]>([]);
  const [weeklyWaist, setWeeklyWaist] = useState<WeeklyBucket[]>([]);
  const [weightAvg, setWeightAvg] = useState(0);
  const [weightTrend, setWeightTrend] = useState<MetricsTrend>('stable');
  const [strengthExercises, setStrengthExercises] = useState<StrengthExercise[]>([]);
  const [strengthByExercise, setStrengthByExercise] = useState<Record<number, StrengthPoint[]>>({});
  const [defaultExerciseId, setDefaultExerciseId] = useState<number | null>(null);
  const [lastMetric, setLastMetric] = useState<BodyMetricRow | null>(null);

  // --------------------------------------------------------------------------
  // refresh — re-derive all metrics state from the DB
  // --------------------------------------------------------------------------
  const refresh = useCallback(async (): Promise<void> => {
    const db = getDB();

    // 1. Load all body_metrics rows with peso_kg, ordered ASC for charts
    const weightRows = await db.getAllAsync<{
      id: number;
      fecha: string;
      peso_kg: number;
    }>(
      `SELECT id, fecha, peso_kg
       FROM body_metrics
       WHERE peso_kg IS NOT NULL
       ORDER BY fecha ASC`
    );
    const resolvedWeightEntries: WeightEntry[] = weightRows.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      pesoKg: r.peso_kg,
    }));

    // 2. Load all body_metrics rows with cintura_cm, ordered ASC
    const waistRows = await db.getAllAsync<{
      id: number;
      fecha: string;
      cintura_cm: number;
    }>(
      `SELECT id, fecha, cintura_cm
       FROM body_metrics
       WHERE cintura_cm IS NOT NULL
       ORDER BY fecha ASC`
    );
    const resolvedWaistEntries: WaistEntry[] = waistRows.map((r) => ({
      id: r.id,
      fecha: r.fecha,
      cinturaCm: r.cintura_cm,
    }));

    // 3. Derive weekly weight buckets for the chart
    const resolvedWeeklyWeight = groupWeeklyAverages(
      resolvedWeightEntries.map((e) => ({ fecha: e.fecha, value: e.pesoKg }))
    );

    // 4. Derive weekly waist buckets for the chart
    const resolvedWeeklyWaist = groupWeeklyAverages(
      resolvedWaistEntries.map((e) => ({ fecha: e.fecha, value: e.cinturaCm }))
    );

    // 5. Current 7-day weight average (days 0–6 back, i.e. today to today-6)
    const resolvedWeightAvg = weeklyAverage(
      resolvedWeightEntries.map((e) => ({ fecha: e.fecha, value: e.pesoKg })),
      7
    );

    // 6. Previous 7-day weight average (days 7–13 back)
    //    Build a shifted dataset by adjusting fecha strings to look like they're
    //    "today" relative to the window function.
    const prevWindowStart = daysAgo(13);
    const prevWindowEnd = daysAgo(7);
    const prevEntries = resolvedWeightEntries
      .filter((e) => e.fecha >= prevWindowStart && e.fecha <= prevWindowEnd)
      .map((e) => ({
        // Shift dates forward 7 days so weeklyAverage's "last 7 days" window
        // covers them as if they were the current week.
        fecha: shiftDate(e.fecha, 7),
        value: e.pesoKg,
      }));
    const resolvedPrevAvg = weeklyAverage(prevEntries, 7);
    const resolvedWeightTrend = trendDirection(resolvedWeightAvg, resolvedPrevAvg);

    // 7. Load strength exercises (only those with at least one completed set)
    const exerciseRows = await db.getAllAsync<{ id: number; nombre: string }>(
      `SELECT DISTINCT e.id, e.nombre
       FROM exercises e
       JOIN set_logs sl ON sl.exercise_id = e.id
       WHERE sl.completada = 1
       ORDER BY e.nombre ASC`
    );
    const resolvedExercises: StrengthExercise[] = exerciseRows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
    }));

    // 8. Load strength data: max peso_kg per ISO week per exercise
    //    DATE(ws.fecha, 'weekday 0', '-6 days') returns the ISO Monday for any input date.
    //    weekday 0 = Sunday; advancing to Sunday then back 6 days always lands on Monday.
    //    This matches toISOWeekStart() in stats.ts: both yield the same Monday for any date.
    const strengthRows = await db.getAllAsync<{
      exercise_id: number;
      week_start: string;
      max_peso: number;
    }>(
      `SELECT
         sl.exercise_id,
         DATE(ws.fecha, 'weekday 0', '-6 days') AS week_start,
         MAX(sl.peso_kg) AS max_peso
       FROM set_logs sl
       JOIN workout_sessions ws ON ws.id = sl.session_id
       WHERE sl.completada = 1
       GROUP BY sl.exercise_id, week_start
       ORDER BY week_start ASC`
    );

    const resolvedStrengthByExercise: Record<number, StrengthPoint[]> = {};
    for (const row of strengthRows) {
      const point: StrengthPoint = {
        weekStart: row.week_start,
        maxPesoKg: row.max_peso,
      };
      if (!resolvedStrengthByExercise[row.exercise_id]) {
        resolvedStrengthByExercise[row.exercise_id] = [];
      }
      resolvedStrengthByExercise[row.exercise_id].push(point);
    }

    // 9. Default exercise: most recently logged
    const defaultRow = await db.getFirstAsync<{ exercise_id: number }>(
      `SELECT exercise_id FROM set_logs WHERE completada = 1 ORDER BY rowid DESC LIMIT 1`
    );
    const resolvedDefaultExerciseId = defaultRow?.exercise_id ?? null;

    // 10. Last body_metrics row for modal pre-fill
    const lastRow = await db.getFirstAsync<{
      fecha: string;
      peso_kg: number | null;
      cintura_cm: number | null;
      foto_uri: string | null;
    }>(
      `SELECT fecha, peso_kg, cintura_cm, foto_uri
       FROM body_metrics
       ORDER BY fecha DESC
       LIMIT 1`
    );
    const resolvedLastMetric: BodyMetricRow | null = lastRow
      ? {
          fecha: lastRow.fecha,
          pesoKg: lastRow.peso_kg,
          cinturaCm: lastRow.cintura_cm,
          fotoUri: lastRow.foto_uri,
        }
      : null;

    // Commit all state atomically to avoid partial renders
    setWeightEntries(resolvedWeightEntries);
    setWaistEntries(resolvedWaistEntries);
    setWeeklyWeight(resolvedWeeklyWeight);
    setWeeklyWaist(resolvedWeeklyWaist);
    setWeightAvg(resolvedWeightAvg);
    setWeightTrend(resolvedWeightTrend);
    setStrengthExercises(resolvedExercises);
    setStrengthByExercise(resolvedStrengthByExercise);
    setDefaultExerciseId(resolvedDefaultExerciseId);
    setLastMetric(resolvedLastMetric);
  }, []);

  // --------------------------------------------------------------------------
  // Initial mount load
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await initDB();
        await refresh();
      } catch (err) {
        console.error('[useMetrics] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  // --------------------------------------------------------------------------
  // Re-derive on screen focus (catches metrics logged while screen was inactive)
  // --------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refresh().catch((err) => console.error('[useMetrics] focus refresh error', err));
      }
    }, [loading, refresh])
  );

  // --------------------------------------------------------------------------
  // saveMetric — UPSERT into body_metrics for today, then refresh
  // --------------------------------------------------------------------------
  const saveMetric = useCallback(
    async (data: {
      pesoKg: number;
      cinturaCm: number | null;
      fotoUri: string | null;
    }): Promise<void> => {
      const db = getDB();
      await db.runAsync(
        `INSERT INTO body_metrics (fecha, peso_kg, cintura_cm, foto_uri)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(fecha) DO UPDATE SET
           peso_kg    = excluded.peso_kg,
           cintura_cm = COALESCE(excluded.cintura_cm, body_metrics.cintura_cm),
           foto_uri   = COALESCE(excluded.foto_uri, body_metrics.foto_uri)`,
        [today(), data.pesoKg, data.cinturaCm, data.fotoUri]
      );
      await refresh();
    },
    [refresh]
  );

  return {
    loading,
    weightEntries,
    waistEntries,
    weeklyWeight,
    weeklyWaist,
    weightAvg,
    weightTrend,
    strengthExercises,
    strengthByExercise,
    defaultExerciseId,
    lastMetric,
    saveMetric,
    refresh,
  };
}

// ---------------------------------------------------------------------------
// Internal helper — shift a YYYY-MM-DD date forward by N days
// ---------------------------------------------------------------------------
function shiftDate(fecha: string, days: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}
