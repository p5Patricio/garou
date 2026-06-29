export interface WatchDailyRow {
  fecha: string;
  pasos: number | null;
  fc_reposo_ppm: number | null;
  horas_sueno: number | null;
  hrv: number | null;
  calorias_activas: number | null;
}

export interface SyncResult {
  ok: boolean;
  /** Human-readable outcome shown to the user after a manual sync. */
  message: string;
}

export interface UseWatchReturn {
  data: WatchDailyRow | null;
  loading: boolean;
  lastSyncAt: Date | null;
  sync(): Promise<SyncResult>;
}
