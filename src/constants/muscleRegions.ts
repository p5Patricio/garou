/**
 * The 12 muscle-group values actually used in src/db/seed.ts (Rutina de
 * Hipertrofia v3). A custom exercise added via Rutina's free-text
 * "Grupo muscular" field that doesn't match one of these (after normalizing
 * accents/case) simply never lights up on the map — degrades quietly, never
 * crashes or throws.
 */
export const MUSCLE_GROUPS = [
  'Pecho', 'Hombros', 'Biceps', 'Antebrazos', 'Abdomen', 'Cuadriceps', // front
  'Trapecio', 'Espalda', 'Triceps', 'Gluteo', 'Isquios', 'Pantorrillas', // back
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

interface RegionShape {
  muscle: MuscleGroup | null; // null = inert (head, neck, feet, opposite-view calves...)
  shape:
    | { kind: 'circle'; cx: number; cy: number; r: number }
    | { kind: 'rect'; x: number; y: number; width: number; height: number; rx: number }
    | { kind: 'path'; d: string };
}

// viewBox is 0 0 200 440 for both views — hand-drawn schematic proportions,
// not an anatomical atlas (see commit message / project memory for why: no
// licensed body-map asset, authored fresh to match Garou's own 12-group
// taxonomy exactly, in the same flat/minimal style as src/components/Icon.tsx).
export const BODY_VIEWBOX = '0 0 200 440';

export const FRONT_REGIONS: RegionShape[] = [
  { muscle: null, shape: { kind: 'circle', cx: 100, cy: 28, r: 20 } }, // head
  { muscle: null, shape: { kind: 'rect', x: 90, y: 46, width: 20, height: 16, rx: 0 } }, // neck
  { muscle: 'Hombros', shape: { kind: 'circle', cx: 50, cy: 68, r: 17 } },
  { muscle: 'Hombros', shape: { kind: 'circle', cx: 150, cy: 68, r: 17 } },
  { muscle: 'Pecho', shape: { kind: 'rect', x: 62, y: 62, width: 76, height: 66, rx: 16 } },
  { muscle: 'Abdomen', shape: { kind: 'rect', x: 72, y: 130, width: 56, height: 64, rx: 10 } },
  { muscle: 'Biceps', shape: { kind: 'rect', x: 28, y: 80, width: 26, height: 78, rx: 12 } },
  { muscle: 'Biceps', shape: { kind: 'rect', x: 146, y: 80, width: 26, height: 78, rx: 12 } },
  { muscle: 'Antebrazos', shape: { kind: 'rect', x: 24, y: 160, width: 24, height: 74, rx: 10 } },
  { muscle: 'Antebrazos', shape: { kind: 'rect', x: 152, y: 160, width: 24, height: 74, rx: 10 } },
  { muscle: 'Cuadriceps', shape: { kind: 'rect', x: 64, y: 196, width: 32, height: 104, rx: 14 } },
  { muscle: 'Cuadriceps', shape: { kind: 'rect', x: 104, y: 196, width: 32, height: 104, rx: 14 } },
  { muscle: null, shape: { kind: 'rect', x: 66, y: 304, width: 28, height: 90, rx: 12 } }, // calf (colored on back only)
  { muscle: null, shape: { kind: 'rect', x: 106, y: 304, width: 28, height: 90, rx: 12 } },
  { muscle: null, shape: { kind: 'rect', x: 64, y: 396, width: 30, height: 14, rx: 6 } }, // feet
  { muscle: null, shape: { kind: 'rect', x: 106, y: 396, width: 30, height: 14, rx: 6 } },
];

export const BACK_REGIONS: RegionShape[] = [
  { muscle: null, shape: { kind: 'circle', cx: 100, cy: 28, r: 20 } },
  { muscle: null, shape: { kind: 'rect', x: 90, y: 46, width: 20, height: 16, rx: 0 } },
  { muscle: 'Trapecio', shape: { kind: 'path', d: 'M72 62 L128 62 L118 92 L82 92 Z' } },
  { muscle: 'Espalda', shape: { kind: 'rect', x: 62, y: 90, width: 76, height: 66, rx: 16 } },
  { muscle: 'Triceps', shape: { kind: 'rect', x: 28, y: 80, width: 26, height: 78, rx: 12 } },
  { muscle: 'Triceps', shape: { kind: 'rect', x: 146, y: 80, width: 26, height: 78, rx: 12 } },
  { muscle: null, shape: { kind: 'rect', x: 24, y: 160, width: 24, height: 74, rx: 10 } }, // forearm (colored on front only)
  { muscle: null, shape: { kind: 'rect', x: 152, y: 160, width: 24, height: 74, rx: 10 } },
  { muscle: 'Gluteo', shape: { kind: 'rect', x: 66, y: 156, width: 68, height: 42, rx: 18 } },
  { muscle: 'Isquios', shape: { kind: 'rect', x: 64, y: 198, width: 32, height: 102, rx: 14 } },
  { muscle: 'Isquios', shape: { kind: 'rect', x: 104, y: 198, width: 32, height: 102, rx: 14 } },
  { muscle: 'Pantorrillas', shape: { kind: 'rect', x: 66, y: 304, width: 28, height: 90, rx: 12 } },
  { muscle: 'Pantorrillas', shape: { kind: 'rect', x: 106, y: 304, width: 28, height: 90, rx: 12 } },
  { muscle: null, shape: { kind: 'rect', x: 64, y: 396, width: 30, height: 14, rx: 6 } },
  { muscle: null, shape: { kind: 'rect', x: 106, y: 396, width: 30, height: 14, rx: 6 } },
];
