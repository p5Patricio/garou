/**
 * Real anatomical body outlines, derived from MuscleMap by Melih Colpan (MIT
 * license) — see NOTICE.md for the full attribution and license text this
 * reuse requires. Not an original Garou illustration.
 *
 * The 12 muscle-group values actually used in src/db/seed.ts (Rutina de
 * Hipertrofia v3). MuscleMap's own 18 slugs are consolidated down to these —
 * e.g. obliques/serratus/hip-flexors all fold into Abdomen — because Garou's
 * exercise catalog only ever tracks one grupo_muscular per exercise, never
 * that fine-grained a breakdown. A custom exercise added via Rutina's
 * free-text "Grupo muscular" field that doesn't match one of these (after
 * normalizing accents/case) simply never lights up on the map — degrades
 * quietly, never crashes.
 */
export const MUSCLE_GROUPS = [
  'Pecho', 'Hombros', 'Biceps', 'Antebrazos', 'Abdomen', 'Cuadriceps', // front-only
  'Trapecio', 'Espalda', 'Triceps', 'Gluteo', 'Isquios', 'Pantorrillas', // back-only
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Accent/case-insensitive match against a raw grupo_muscular DB string. */
export function normalizeMuscleGroup(raw: string): MuscleGroup | null {
  const norm = raw.trim().toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const found = MUSCLE_GROUPS.find(
    (g) => g.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '') === norm
  );
  return found ?? null;
}

export type BodyView = 'front' | 'back';

export interface BodyMapRegion {
  muscle: MuscleGroup | null; // null = inert (head, hair, neck, hands, knees, ankles, feet)
  d: string; // SVG path data
}

export interface BodyMapViewData {
  vb: string; // SVG viewBox, e.g. "0 95 727 1280"
  regions: BodyMapRegion[];
}

interface BodyMapData {
  front: BodyMapViewData;
  back: BodyMapViewData;
}

let _cache: BodyMapData | null = null;

/**
 * Lazy-loaded (require() inside this function, not a top-level import) so
 * this ~45KB JSON is only parsed the first time the Musculos tab is opened,
 * not on every app launch — same reasoning as src/data/exerciseDataset.ts.
 */
export function loadBodyMap(): BodyMapData {
  if (_cache) return _cache;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _cache = require('../../assets/data/body_map.json') as BodyMapData;
  return _cache;
}
