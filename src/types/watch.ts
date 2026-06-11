export interface WatchDailyRow {
  fecha: string;
  pasos: number | null;
  fc_reposo_ppm: number | null;
  horas_sueno: number | null;
  hrv: number | null;
  calorias_activas: number | null;
}

export interface UseWatchReturn {
  data: WatchDailyRow | null;
  loading: boolean;
  lastSyncAt: Date | null;
  sync(): Promise<void>;
}
