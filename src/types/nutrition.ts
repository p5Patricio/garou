// ---------------------------------------------------------------------------
// Shared TypeScript types for the nutrition logger domain.
// Mirror the camelCase-over-snake_case convention from types/workout.ts.
// ---------------------------------------------------------------------------

/** Day classification: workout day or rest day. */
export type DayType = 'entreno' | 'descanso';

/**
 * A food item from the `foods` catalog — DB column names mapped to camelCase.
 * Macros are per 100g. Never store calculated kcal; always derive on-the-fly.
 */
export interface Food {
  id: number;
  nombre: string;
  /** kcal_100g */
  kcal100g: number;
  /** proteina_100g */
  proteina100g: number;
  /** carbos_100g */
  carbos100g: number;
  /** grasa_100g */
  grasa100g: number;
}

/**
 * Raw-float macro totals for any amount of food.
 * Rounding happens ONLY at the display layer.
 */
export interface Macros {
  kcal: number;
  /** proteína */
  p: number;
  /** carbohidratos */
  c: number;
  /** grasa */
  f: number;
}

/**
 * One logged food entry inside a meal, enriched with derived macros.
 * Maps to a `nutrition_logs` row joined with its `foods` row.
 */
export interface NutritionEntry {
  /** nutrition_logs.id */
  logId: number;
  /** foods.id */
  foodId: number;
  nombre: string;
  gramos: number;
  /** Derived via calculateMacros — never stored in DB. */
  macros: Macros;
}

/**
 * All entries for a single meal (num_comida), plus their summed macros.
 */
export interface MealGroup {
  /** 1 | 2 | 3 */
  numComida: number;
  /** Display name (Desayuno / Comida / Cena) */
  nombre: string;
  entries: NutritionEntry[];
  /** sumMacros(entries.map(e => e.macros)) */
  totals: Macros;
}

/**
 * Daily macro totals across all meals.
 * Extends Macros so callers can destructure kcal/p/c/f directly.
 */
export interface NutritionTotals extends Macros {}

/**
 * Target macros for a given day type, loaded from `nutrition_targets`.
 */
export interface NutritionTarget {
  /** tipo_dia */
  tipoDia: DayType;
  /** kcal_objetivo */
  kcal: number;
  /** proteina_g */
  p: number;
  /** carbos_g */
  c: number;
  /** grasa_g */
  f: number;
}
