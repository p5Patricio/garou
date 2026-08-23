import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { getActivityCalendar, type ActivityDay } from '../utils/activityCalendar';

export function useActivityCalendar(days = 371) {
  const [loading, setLoading] = useState(true);
  const [days_, setDays] = useState<ActivityDay[]>([]);

  const refresh = useCallback(async () => {
    await initDB();
    const data = await getActivityCalendar(getDB(), days);
    setDays(data);
  }, [days]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await initDB();
        await refresh();
      } catch (err) {
        console.error('[useActivityCalendar] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refresh().catch((err) => console.error('[useActivityCalendar] focus refresh error', err));
      }
    }, [loading, refresh])
  );

  return { loading, days: days_, refresh };
}
