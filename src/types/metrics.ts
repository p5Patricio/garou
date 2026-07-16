export interface WeightEntry {
  id: number;
  fecha: string;
  pesoKg: number;
}

export interface WaistEntry {
  id: number;
  fecha: string;
  cinturaCm: number;
}

export interface PhotoEntry {
  id: number;
  fecha: string;
  fotoUri: string;
}

export interface BodyMetricRow {
  fecha: string;
  pesoKg: number | null;
  cinturaCm: number | null;
  fotoUri: string | null;
}

export interface StrengthPoint {
  weekStart: string;
  maxPesoKg: number;
  displayVal: number;
  displayUnit: string;
}

export interface WeeklyBucket {
  weekStart: string;
  avg: number;
}

export interface StrengthExercise {
  id: number;
  nombre: string;
  unidadPreferida: 'kg' | 'placas' | 'lb' | 'bw';
  usaPlacas: boolean;
}

export type MetricsTrend = 'up' | 'down' | 'stable';

export interface UseMetricsReturn {
  loading: boolean;
  weightEntries: WeightEntry[];
  waistEntries: WaistEntry[];
  weeklyWeight: WeeklyBucket[];
  weeklyWaist: WeeklyBucket[];
  weightAvg: number;
  weightTrend: MetricsTrend;
  strengthExercises: StrengthExercise[];
  strengthByExercise: Record<number, StrengthPoint[]>;
  defaultExerciseId: number | null;
  lastMetric: BodyMetricRow | null;
  photoEntries: PhotoEntry[];
  saveMetric(data: {
    pesoKg: number;
    cinturaCm: number | null;
    fotoUri: string | null;
  }): Promise<void>;
  refresh(): Promise<void>;
}
