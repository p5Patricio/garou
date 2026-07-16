import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ActiveTimer, TimerKind } from '../types/timer';
import {
  addTimerSeconds,
  getActiveTimer,
  startTimer as startPersistedTimer,
  stopTimer as stopPersistedTimer,
} from '../services/timerService';

export function useActiveTimer(kind: TimerKind) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(async () => {
    const active = await getActiveTimer(kind);
    setTimer(active);
    setNow(Date.now());
    return active;
  }, [kind]);

  useEffect(() => {
    refresh().catch((err) => console.error('[useActiveTimer] refresh error', err));
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!timer) return;
    if (timer.endAtMs <= now) {
      stopPersistedTimer(kind)
        .then(() => setTimer(null))
        .catch((err) => console.error('[useActiveTimer] auto-stop error', err));
    }
  }, [kind, now, timer]);

  const start = useCallback(async (label: string, totalSeg: number) => {
    const next = await startPersistedTimer(kind, label, totalSeg);
    setTimer(next);
    setNow(Date.now());
    return next;
  }, [kind]);

  const stop = useCallback(async () => {
    await stopPersistedTimer(kind);
    setTimer(null);
    setNow(Date.now());
  }, [kind]);

  const addSeconds = useCallback(async (seconds: number) => {
    const next = await addTimerSeconds(kind, seconds);
    setTimer(next);
    setNow(Date.now());
    return next;
  }, [kind]);

  const remaining = useMemo(() => {
    if (!timer) return 0;
    return Math.max(0, Math.round((timer.endAtMs - now) / 1000));
  }, [now, timer]);

  return {
    timer,
    remaining,
    total: timer?.totalSeg ?? 0,
    label: timer?.label ?? '',
    active: !!timer && remaining > 0,
    refresh,
    start,
    stop,
    addSeconds,
  };
}
