import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { todayLocal, daysAgoLocal, shiftLocalDate, parseLocalDate, getDaysBetween } from '../utils/date';
import { weeklyAverage } from '../utils/stats';
import {
  resolveTodaySession,
  type SessionEstado,
} from '../utils/workoutSession';

export interface DashboardData {
  fecha: string; // E.g. "Mié, 17 jun"
  workout: {
    session: string;
    estado: SessionEstado;
    completed: boolean;
    esDescanso: boolean;
    numEjercicios: number;
    numSeries: number;
    duracionEstimada: number;
    musclesLabel: string;
  };
  cardio: {
    minutos: number;
    sesiones: number;
  };
  weight: {
    ultimo: number | null;
    diasAgo: number | null;
    tendencia: number;
  };
}

function formatDashboardDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  const raw = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
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
    const fechaLabel = formatDashboardDate(todayStr);

    // 2. Cardio summary
    const cardioRow = await db.getFirstAsync<{ minutos: number; sesiones: number }>(
      `SELECT COALESCE(SUM(minutos), 0) AS minutos, COUNT(*) AS sesiones
       FROM cardio_logs
       WHERE fecha = ?`,
      [todayStr]
    );

    const cardio = {
      minutos: cardioRow?.minutos ?? 0,
      sesiones: cardioRow?.sesiones ?? 0,
    };

    // 4. Workout session today
    const todaySession = await resolveTodaySession(db);
    const resolvedSessionType = todaySession.tipo;
    const estado = todaySession.estado;
    const completed = estado === 'completada';
    const esDescanso = estado === 'descanso';

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
       WHERE sesion = ? AND activo = 1
       ORDER BY orden ASC, id ASC`,
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
      estado,
      completed,
      esDescanso,
      numEjercicios,
      numSeries,
      duracionEstimada,
      musclesLabel,
    };

    // 5. Weight & Waist metrics
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
      weightDiasAgo = getDaysBetween(todayStr, latestMetric.fecha);
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
          fecha: shiftLocalDate(e.fecha, 7),
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
      cardio,
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
