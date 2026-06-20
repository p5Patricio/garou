// ---------------------------------------------------------------------------
// Shared TypeScript types for the workout logger domain
// ---------------------------------------------------------------------------

/**
 * A single exercise as presented to the UI — DB column names mapped to
 * camelCase UI field names.
 */
export interface UiExercise {
  id: number;
  nombre: string;
  grupoMuscular: string;
  equipo: string;
  sesion: string;
  /** series_objetivo */
  series: number;
  /** [reps_min, reps_max] */
  reps: [number, number];
  /** rir_objetivo */
  rir: number;
  /** descanso_seg */
  descansoSeg: number;
  notasTecnica: string | null;
  esBodyweight: boolean;
  /** usa_placas — show weight in plate counts instead of kg for this exercise. */
  usaPlacas: boolean;
}

/**
 * In-memory state for one set inside the logger.
 * Field names intentionally match the pre-existing train.tsx convention.
 */
export interface SetState {
  /** peso_kg */
  weight: number;
  reps: number;
  /** rir_real */
  rir: number;
  /** completada */
  done: boolean;
}

/**
 * SetsMap[exerciseId][numSerie] = SetState
 * numSerie is 0-indexed in the UI (set 1 = index 0).
 */
export type SetsMap = Record<number, Record<number, SetState>>;

/**
 * Raw set row as stored in (and read from) SQLite.
 */
export interface SetRow {
  id?: number;
  session_id: number;
  exercise_id: number;
  num_serie: number;
  peso_kg: number;
  reps: number;
  rir_real: number | null;
  completada: number; // 0 | 1
}

/**
 * Exercise target parameters used by the progression logic.
 */
export interface ExerciseTarget {
  repsMax: number;
  rirObjetivo: number;
  seriesObjetivo: number;
}

/**
 * Result returned by `isReadyToIncrease`.
 */
export interface ProgressionResult {
  readyToIncrease: boolean;
  reason: string;
}
