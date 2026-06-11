export interface BackupFile {
  version: number;
  exportedAt: string; // ISO 8601
  tables: {
    exercises: any[];
    workout_sessions: any[];
    set_logs: any[];
    foods: any[];
    nutrition_targets: any[];
    nutrition_logs: any[];
    body_metrics: any[];
    cardio_logs: any[];
    water_logs: any[];
    watch_daily: any[];
  };
}

export interface UseBackupReturn {
  loading: boolean;
  lastResult: 'idle' | 'success' | 'error';
  errorMsg: string | null;
  exportBackup: () => Promise<void>;
  importBackup: () => Promise<void>;
}
