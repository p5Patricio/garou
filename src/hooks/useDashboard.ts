import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { weeklyAverage } from '../utils/stats';
import { resolveSessionType } from '../utils/sessionRotation';

export interface DashboardData {
  fecha: string; // E.g. "Mié, 17 jun"
  workout: {
    session: string;
    completed: boolean;
    numEjercicios: number;
    numSeries: number;
    duracionEstimada: number;
    musclesLabel: string;
  };
  macros: {
    logHoy: {
      kcal: number;
      p: number;
      c: number;
      f: number;
    };
    target: {
      kcal: number;
      p: number;
      c: number;
      f: number;
    };
  };
  water: {
    ml: number;
    target: number;
  };
  weight: {
    ultimo: number | null;
    diasAgo: number | null;
    tendencia: number;
  };
}

function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().slice(0, 10);
}

function daysAgoLocal(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - (offset * 60 * 1000));
  return local.toISOString().slice(0, 10);
}

function shiftDate(fecha: string, days: number): string {
  const [y, m, d] = fecha.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, '0');
  const nd = String(date.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
}

function getDaysAgo(todayStr: string, targetStr: string): number {
  const [ty, tm, td] = todayStr.split('-').map(Number);
  const [ey, em, ed] = targetStr.split('-').map(Number);
  const tDate = new Date(ty, tm - 1, td);
  const eDate = new Date(ey, em - 1, ed);
  const diffMs = tDate.getTime() - eDate.getTime();
  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function formatLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const raw = date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  return raw.charAt(0).toUpperCase() + raw.slice(1).replace(/\./g, '');
}

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);

  const refresh = useCallback(async () => {
    await initDB();
    const db = getDB();
    const todayStr = todayLocal();

    // 1. Format date label
    const fechaLabel = formatLocalDate(todayStr);

    // 2. Nutrition Log
    const nutritionRow = await db.getFirstAsync<{
      kcal: number;
      p: number;
      c: number;
      f: number;
    }>(
      `SELECT COALESCE(SUM(nl.gramos * f.kcal_100g / 100), 0) AS kcal,
              COALESCE(SUM(nl.gramos * f.proteina_100g / 100), 0) AS p,
              COALESCE(SUM(nl.gramos * f.carbos_100g / 100), 0) AS c,
              COALESCE(SUM(nl.gramos * f.grasa_100g / 100), 0) AS f
       FROM nutrition_logs nl
       JOIN foods f ON f.id = nl.food_id
       WHERE nl.fecha = ?`,
      [todayStr]
    );
    const logHoy = {
      kcal: Math.round(nutritionRow?.kcal ?? 0),
      p: Math.round(nutritionRow?.p ?? 0),
      c: Math.round(nutritionRow?.c ?? 0),
      f: Math.round(nutritionRow?.f ?? 0),
    };

    // 3. Water Log
    const waterRow = await db.getFirstAsync<{ ml: number }>(
      `SELECT COALESCE(SUM(ml), 0) AS ml
       FROM water_logs
       WHERE fecha = ?`,
      [todayStr]
    );
    const water = {
      ml: waterRow?.ml ?? 0,
      target: 3000,
    };

    // 4. Workout session today / rotation
    const resolvedSessionType = await resolveSessionType(db);

    // Determine whether today's session (if any) is already completed
    const sessionToday = await db.getFirstAsync<{ completada: number }>(
      `SELECT completada FROM workout_sessions WHERE fecha = ? LIMIT 1`,
      [todayStr]
    );
    const completed = sessionToday?.completada === 1;

    // Query exercises for the resolved session
    const exercises = await db.getAllAsync<{
      id: number;
      nombre: string;
      grupo_muscular: string;
      series_objetivo: number;
      descanso_seg: number;
    }>(
      `SELECT id, nombre, grupo_muscular, series_objetivo, descanso_seg
       FROM exercises
       WHERE sesion = ?
       ORDER BY id ASC`,
      [resolvedSessionType]
    );

    const numEjercicios = exercises.length;
    const numSeries = exercises.reduce((acc, ex) => acc + ex.series_objetivo, 0);
    const duracionEstimada = Math.round(
      exercises.reduce((acc, ex) => acc + (ex.series_objetivo * (ex.descanso_seg + 45)) / 60, 0)
    );

    const uniqueMuscles = Array.from(new Set(exercises.map((ex) => ex.grupo_muscular)));
    const musclesLabel = uniqueMuscles.join(' · ');

    const workout = {
      session: resolvedSessionType,
      completed,
      numEjercicios,
      numSeries,
      duracionEstimada,
      musclesLabel,
    };

    // 5. Daily targets based on completed workout today
    const resolvedDayType = completed ? 'entreno' : 'descanso';
    const targetRow = await db.getFirstAsync<{
      kcal_objetivo: number;
      proteina_g: number;
      carbos_g: number;
      grasa_g: number;
    }>(
      `SELECT kcal_objetivo, proteina_g, carbos_g, grasa_g
       FROM nutrition_targets
       WHERE tipo_dia = ?`,
      [resolvedDayType]
    );

    const target = targetRow
      ? {
          kcal: targetRow.kcal_objetivo,
          p: targetRow.proteina_g,
          c: targetRow.carbos_g,
          f: targetRow.grasa_g,
        }
      : {
          kcal: resolvedDayType === 'entreno' ? 2450 : 2300,
          p: 160,
          c: resolvedDayType === 'entreno' ? 300 : 265,
          f: 70,
        };

    // 6. Weight & Waist metrics
    const latestMetric = await db.getFirstAsync<{
      peso_kg: number | null;
      cintura_cm: number | null;
      fecha: string;
    }>(
      `SELECT peso_kg, cintura_cm, fecha
       FROM body_metrics
       ORDER BY fecha DESC, id DESC
       LIMIT 1`
    );

    let weightUltimoVal: number | null = null;
    let weightDiasAgo: number | null = null;

    if (latestMetric) {
      weightUltimoVal = latestMetric.peso_kg;
      weightDiasAgo = getDaysAgo(todayStr, latestMetric.fecha);
    }

    // Weight trend
    const weightRows = await db.getAllAsync<{ fecha: string; peso_kg: number }>(
      `SELECT fecha, peso_kg
       FROM body_metrics
       WHERE peso_kg IS NOT NULL
       ORDER BY fecha DESC`
    );

    let weightTrendNum = 0;
    if (weightRows.length > 0) {
      // Map to shape expected by stats/weeklyAverage
      const resolvedWeightEntries = weightRows.map((r) => ({
        fecha: r.fecha,
        value: r.peso_kg,
      }));

      // Current week avg
      const avgThisWeek = weeklyAverage(resolvedWeightEntries, 7);

      // Previous week avg
      const prevWindowStart = daysAgoLocal(13);
      const prevWindowEnd = daysAgoLocal(7);
      const prevEntries = resolvedWeightEntries
        .filter((e) => e.fecha >= prevWindowStart && e.fecha <= prevWindowEnd)
        .map((e) => ({
          fecha: shiftDate(e.fecha, 7),
          value: e.value,
        }));
      const avgPrevWeek = weeklyAverage(prevEntries, 7);

      if (avgPrevWeek > 0 && avgThisWeek > 0) {
        weightTrendNum = Number((avgThisWeek - avgPrevWeek).toFixed(1));
      }
    }

    const weight = {
      ultimo: weightUltimoVal,
      diasAgo: weightDiasAgo,
      tendencia: weightTrendNum,
    };

    setData({
      fecha: fechaLabel,
      workout,
      macros: {
        logHoy,
        target,
      },
      water,
      weight,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        await initDB();
        await refresh();
      } catch (err) {
        console.error('[useDashboard] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refresh().catch((err) => console.error('[useDashboard] focus refresh error', err));
      }
    }, [loading, refresh])
  );

  return {
    loading,
    data,
    refresh,
  };
}
