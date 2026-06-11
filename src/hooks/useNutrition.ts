import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { calculateMacros, sumMacros } from '../utils/macros';
import { MEAL_NAMES } from '../constants/meals';
import type {
  DayType,
  Food,
  NutritionEntry,
  MealGroup,
  NutritionTotals,
  NutritionTarget,
} from '../types/nutrition';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const FALLBACK_TARGET: NutritionTarget = {
  tipoDia: 'descanso',
  kcal: 2300,
  p: 160,
  c: 265,
  f: 70,
};

const EMPTY_TOTALS: NutritionTotals = { kcal: 0, p: 0, c: 0, f: 0 };

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface UseNutritionReturn {
  loading: boolean;
  dayType: DayType;
  target: NutritionTarget;
  totals: NutritionTotals;
  meals: MealGroup[];
  waterMl: number;
  /** Water reference target in ml — always 3000 ml. */
  waterTarget: number;
  addFood(numComida: number, foodId: number, gramos: number): Promise<void>;
  removeFood(logId: number): Promise<void>;
  addWater(ml: number): Promise<void>;
  searchFoods(term: string): Promise<Food[]>;
  refresh(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNutrition(): UseNutritionReturn {
  const [loading, setLoading] = useState(true);
  const [dayType, setDayType] = useState<DayType>('descanso');
  const [target, setTarget] = useState<NutritionTarget>(FALLBACK_TARGET);
  const [totals, setTotals] = useState<NutritionTotals>(EMPTY_TOTALS);
  const [meals, setMeals] = useState<MealGroup[]>([]);
  const [waterMl, setWaterMl] = useState(0);

  // --------------------------------------------------------------------------
  // refresh — re-derive all state from the DB (day type, targets, logs, water)
  // --------------------------------------------------------------------------
  const refresh = useCallback(async (): Promise<void> => {
    const db = getDB();
    const fecha = today();

    // 1. Resolve day type: completed workout today → 'entreno', otherwise 'descanso'
    const workoutRow = await db.getFirstAsync<{ id: number }>(
      `SELECT 1 AS id FROM workout_sessions WHERE fecha = ? AND completada = 1 LIMIT 1`,
      [fecha]
    );
    const resolvedDayType: DayType = workoutRow ? 'entreno' : 'descanso';

    // 2. Load nutrition targets for the resolved day type
    const targetRow = await db.getFirstAsync<{
      tipo_dia: string;
      kcal_objetivo: number;
      proteina_g: number;
      carbos_g: number;
      grasa_g: number;
    }>(
      `SELECT tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g
       FROM nutrition_targets
       WHERE tipo_dia = ?`,
      [resolvedDayType]
    );

    const resolvedTarget: NutritionTarget = targetRow
      ? {
          tipoDia: resolvedDayType,
          kcal: targetRow.kcal_objetivo,
          p: targetRow.proteina_g,
          c: targetRow.carbos_g,
          f: targetRow.grasa_g,
        }
      : { ...FALLBACK_TARGET, tipoDia: resolvedDayType };

    // 3. Load today's nutrition logs (num_comida 1–3) joined with foods
    const logRows = await db.getAllAsync<{
      logId: number;
      num_comida: number;
      gramos: number;
      food_id: number;
      nombre: string;
      kcal_100g: number;
      proteina_100g: number;
      carbos_100g: number;
      grasa_100g: number;
    }>(
      `SELECT nl.id AS logId, nl.num_comida, nl.gramos, nl.food_id,
              f.nombre, f.kcal_100g, f.proteina_100g, f.carbos_100g, f.grasa_100g
       FROM nutrition_logs nl
       JOIN foods f ON f.id = nl.food_id
       WHERE nl.fecha = ? AND nl.num_comida IN (1, 2, 3)
       ORDER BY nl.num_comida ASC, nl.id ASC`,
      [fecha]
    );

    // 4. Map rows → NutritionEntry and group by num_comida
    const entriesByMeal: Record<number, NutritionEntry[]> = { 1: [], 2: [], 3: [] };

    for (const row of logRows) {
      const food: Food = {
        id: row.food_id,
        nombre: row.nombre,
        kcal100g: row.kcal_100g,
        proteina100g: row.proteina_100g,
        carbos100g: row.carbos_100g,
        grasa100g: row.grasa_100g,
      };
      const entry: NutritionEntry = {
        logId: row.logId,
        foodId: row.food_id,
        nombre: row.nombre,
        gramos: row.gramos,
        macros: calculateMacros(food, row.gramos),
      };
      entriesByMeal[row.num_comida].push(entry);
    }

    // 5. Build MealGroup array (always all 3 meals, even when empty)
    const mealGroups: MealGroup[] = ([1, 2, 3] as const).map((numComida) => {
      const entries = entriesByMeal[numComida];
      return {
        numComida,
        nombre: MEAL_NAMES[numComida],
        entries,
        totals: sumMacros(entries.map((e) => e.macros)),
      };
    });

    // 6. Compute daily totals from all entries across all meals
    const allEntryMacros = mealGroups.flatMap((m) => m.entries.map((e) => e.macros));
    const dailyTotals: NutritionTotals = sumMacros(allEntryMacros);

    // 7. Water total for today
    const waterRow = await db.getFirstAsync<{ ml: number }>(
      `SELECT COALESCE(SUM(ml), 0) AS ml FROM water_logs WHERE fecha = ?`,
      [fecha]
    );
    const resolvedWaterMl = waterRow ? waterRow.ml : 0;

    // Commit all state at once to avoid partial renders
    setDayType(resolvedDayType);
    setTarget(resolvedTarget);
    setMeals(mealGroups);
    setTotals(dailyTotals);
    setWaterMl(resolvedWaterMl);
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
        console.error('[useNutrition] load error', err);
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
  // Re-derive on screen focus (catches workout-after-meals dayType flip)
  // --------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refresh().catch((err) => console.error('[useNutrition] focus refresh error', err));
      }
    }, [loading, refresh])
  );

  // --------------------------------------------------------------------------
  // addFood — INSERT into nutrition_logs, then refresh
  // --------------------------------------------------------------------------
  const addFood = useCallback(
    async (numComida: number, foodId: number, gramos: number): Promise<void> => {
      const db = getDB();
      await db.runAsync(
        `INSERT INTO nutrition_logs (fecha, num_comida, food_id, gramos) VALUES (?, ?, ?, ?)`,
        [today(), numComida, foodId, gramos]
      );
      await refresh();
    },
    [refresh]
  );

  // --------------------------------------------------------------------------
  // removeFood — DELETE from nutrition_logs by log id, then refresh
  // --------------------------------------------------------------------------
  const removeFood = useCallback(
    async (logId: number): Promise<void> => {
      const db = getDB();
      await db.runAsync(`DELETE FROM nutrition_logs WHERE id = ?`, [logId]);
      await refresh();
    },
    [refresh]
  );

  // --------------------------------------------------------------------------
  // addWater — INSERT into water_logs, then refresh
  // --------------------------------------------------------------------------
  const addWater = useCallback(
    async (ml: number): Promise<void> => {
      const db = getDB();
      await db.runAsync(`INSERT INTO water_logs (fecha, ml) VALUES (?, ?)`, [today(), ml]);
      await refresh();
    },
    [refresh]
  );

  // --------------------------------------------------------------------------
  // searchFoods — LIKE query on foods.nombre; returns empty array for blank term
  // --------------------------------------------------------------------------
  const searchFoods = useCallback(async (term: string): Promise<Food[]> => {
    const trimmed = term.trim();
    if (trimmed.length === 0) return [];

    const db = getDB();
    const rows = await db.getAllAsync<{
      id: number;
      nombre: string;
      kcal_100g: number;
      proteina_100g: number;
      carbos_100g: number;
      grasa_100g: number;
    }>(
      `SELECT id, nombre, kcal_100g, proteina_100g, carbos_100g, grasa_100g
       FROM foods
       WHERE nombre LIKE ?
       ORDER BY nombre ASC
       LIMIT 20`,
      [`%${trimmed}%`]
    );

    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      kcal100g: row.kcal_100g,
      proteina100g: row.proteina_100g,
      carbos100g: row.carbos_100g,
      grasa100g: row.grasa_100g,
    }));
  }, []);

  return {
    loading,
    dayType,
    target,
    totals,
    meals,
    waterMl,
    waterTarget: 3000,
    addFood,
    removeFood,
    addWater,
    searchFoods,
    refresh,
  };
}
