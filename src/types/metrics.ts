// ---------------------------------------------------------------------------
// Shared TypeScript types for the body metrics and progress domain.
// Mirror the camelCase-over-snake_case convention from types/nutrition.ts.
// ---------------------------------------------------------------------------

/**
 * One body_metrics row that has a recorded weight.
 * Rows where peso_kg IS NULL are excluded from WeightEntry arrays.
 */
export interface WeightEntry {
  id: number;
  /** fecha — YYYY-MM-DD */
  fecha: string;
  /** peso_kg */
  pesoKg: number;
}

/**
 * One body_metrics row that has a recorded waist measurement.
 * Rows where cintura_cm IS NULL are excluded from WaistEntry arrays.
 */
export interface WaistEntry {
  id: number;
  /** fecha — YYYY-MM-DD */
  fecha: string;
  /** cintura_cm */
  cinturaCm: number;
}

/**
 * Raw body_metrics row used for pre-filling the log modal.
 * All optional columns may be null.
 */
export interface BodyMetricRow {
  /** fecha — YYYY-MM-DD */
  fecha: string;
  /** peso_kg */
  pesoKg: number | null;
  /** cintura_cm */
  cinturaCm: number | null;
  /** foto_uri */
  fotoUri: string | null;
}

/**
 * A single weekly strength data point — max load lifted in an ISO week.
 */
export interface StrengthPoint {
  /** Monday of that ISO week — YYYY-MM-DD */
  weekStart: string;
  /** MAX(set_logs.peso_kg) for that week */
  maxPesoKg: number;
}

/**
 * A weekly average bucket for weight or waist charts.
 */
export interface WeeklyBucket {
  /** Monday of that ISO week — YYYY-MM-DD */
  weekStart: string;
  /** Mean of all values in that week */
  avg: number;
}

/**
 * An exercise item shown in the strength exercise selector.
 * Only exercises WITH at least one completed set_log are included.
 */
export interface StrengthExercise {
  /** exercises.id */
  id: number;
  nombre: string;
}

/**
 * Trend comparison between the current 7-day average and the previous 7-day average.
 */
export type MetricsTrend = 'up' | 'down' | 'stable';

/**
 * Full return type of the useMetrics hook.
 */
export interface UseMetricsReturn {
  loading: boolean;
  /** All body_metrics rows with peso_kg NOT NULL, ordered by fecha ASC */
  weightEntries: WeightEntry[];
  /** All body_metrics rows with cintura_cm NOT NULL, ordered by fecha ASC */
  waistEntries: WaistEntry[];
  /** Weekly average buckets for the weight chart */
  weeklyWeight: WeeklyBucket[];
  /** Weekly average buckets for the waist chart */
  weeklyWaist: WeeklyBucket[];
  /** Mean of weight entries in the last 7 days; 0 if no data */
  weightAvg: number;
  /** Trend compared to the previous 7-day window */
  weightTrend: MetricsTrend;
  /** Exercises with at least one completed set_log */
  strengthExercises: StrengthExercise[];
  /** Max peso_kg per ISO week keyed by exercise id */
  strengthByExercise: Record<number, StrengthPoint[]>;
  /** Most-recently-logged exercise id — used as default selection */
  defaultExerciseId: number | null;
  /** Latest body_metrics row for modal pre-fill; null if no entries exist */
  lastMetric: BodyMetricRow | null;
  saveMetric(data: {
    pesoKg: number;
    cinturaCm: number | null;
    fotoUri: string | null;
  }): Promise<void>;
  refresh(): Promise<void>;
}
