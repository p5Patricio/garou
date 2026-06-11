// Meal number → display name mapping for the nutrition logger.
// num_comida 4 (Extra) is stored in the schema but not rendered this phase.
export const MEAL_NAMES: Record<1 | 2 | 3, string> = {
  1: 'Desayuno',
  2: 'Comida',
  3: 'Cena',
};

export const MEAL_ICONS: Record<1 | 2 | 3, string> = {
  1: 'sun',
  2: 'fire',
  3: 'moon',
};
