import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { initDB, getDB } from '../db';
import { getMuscleLoad, levelsOf, type MuscleWindow } from '../utils/muscleLoad';
import type { MuscleGroup } from '../constants/muscleRegions';

export function useMuscleLoad(window: MuscleWindow) {
  const [loading, setLoading] = useState(true);
  const [load, setLoad] = useState<Record<MuscleGroup, number>>({} as Record<MuscleGroup, number>);

  const refresh = useCallback(async () => {
    await initDB();
    const data = await getMuscleLoad(getDB(), window);
    setLoad(data);
  }, [window]);

  useEffect(() => {
    let cancelled = false;
    async function load_() {
      try {
        await initDB();
        await refresh();
      } catch (err) {
        console.error('[useMuscleLoad] load error', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load_();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!loading) {
        refresh().catch((err) => console.error('[useMuscleLoad] focus refresh error', err));
      }
    }, [loading, refresh])
  );

  return { loading, load, levels: levelsOf(load), refresh };
}
