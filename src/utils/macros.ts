// ---------------------------------------------------------------------------
// Pure macro calculation utilities — no rounding, no side effects.
// All values are raw floats; rounding happens only at the display layer.
// ---------------------------------------------------------------------------

import type { Food, Macros } from '../types/nutrition';

/**
 * Calculate macros for a given amount of a food.
 * Formula: grams / 100 × macroX_100g — no rounding applied.
 */
export function calculateMacros(food: Food, grams: number): Macros {
  const factor = grams / 100;
  return {
    kcal: food.kcal100g * factor,
    p: food.proteina100g * factor,
    c: food.carbos100g * factor,
    f: food.grasa100g * factor,
  };
}

/**
 * Sum an array of Macros objects into a single Macros total.
 * Returns all-zero Macros for an empty array.
 */
export function sumMacros(items: Macros[]): Macros {
  return items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      p: acc.p + item.p,
      c: acc.c + item.c,
      f: acc.f + item.f,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
}
