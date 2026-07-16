export type TimerKind = 'rest' | 'cardio';

export interface ActiveTimer {
  id: number;
  kind: TimerKind;
  label: string;
  startedAtMs: number;
  endAtMs: number;
  totalSeg: number;
  notificationId: string | null;
  active: boolean;
}
