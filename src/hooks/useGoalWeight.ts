import { useCallback, useEffect, useState } from 'react';
import { initDB, getDB } from '../db';

const SETTINGS_KEY = 'peso_objetivo_kg';

/**
 * Optional body-weight goal, stored in the key/value `settings` table (same
 * pattern as theme/accent in constants/theme.ts) — no schema migration needed.
 *
 * This is opt-in: Garou's default plan is recomposicion, not a number on the
 * scale to chase, so `goalWeight` is null until the user sets one explicitly.
 */
export function useGoalWeight() {
  const [loaded, setLoaded] = useState(false);
  const [goalWeight, setGoalWeightState] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        await initDB();
        const row = await getDB().getFirstAsync<{ value: string }>(
          'SELECT value FROM settings WHERE key = ?',
          [SETTINGS_KEY]
        );
        if (!cancelled) {
          const parsed = row ? Number(row.value) : NaN;
          setGoalWeightState(Number.isFinite(parsed) ? parsed : null);
        }
      } catch (err) {
        console.error('[useGoalWeight] load error', err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setGoalWeight = useCallback(async (value: number | null): Promise<void> => {
    await initDB();
    const db = getDB();
    if (value === null) {
      await db.runAsync('DELETE FROM settings WHERE key = ?', [SETTINGS_KEY]);
    } else {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [SETTINGS_KEY, String(value)]
      );
    }
    setGoalWeightState(value);
  }, []);

  return { loaded, goalWeight, setGoalWeight };
}
