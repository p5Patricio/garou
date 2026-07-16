export type LoadUnit = 'kg' | 'placas' | 'lb' | 'bw';

export interface UiExercise {
  id: number;
  nombre: string;
  grupoMuscular: string;
  equipo: string;
  sesion: string;
  series: number;
  reps: [number, number];
  rir: number;
  descansoSeg: number;
  notasTecnica: string | null;
  esBodyweight: boolean;
  unidadPreferida: LoadUnit;
  usaPlacas: boolean;
  supersetGroup: string | null;
}

export interface SetState {
  weight: number;
  unit: LoadUnit;
  reps: number;
  rir: number;
  done: boolean;
  dirty?: boolean;
  completedAt?: number;
}

export type SetsMap = Record<number, Record<number, SetState>>;

export interface SetRow {
  id?: number;
  session_id: number;
  exercise_id: number;
  num_serie: number;
  peso_kg: number;
  carga_valor?: number;
  carga_unidad?: LoadUnit;
  reps: number;
  rir_real: number | null;
  completada: number;
}

export interface ExerciseTarget {
  repsMax: number;
  rirObjetivo: number;
  seriesObjetivo: number;
}

export interface ProgressionResult {
  readyToIncrease: boolean;
  reason: string;
}
