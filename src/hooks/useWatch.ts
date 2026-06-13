import { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import { initDB } from '../db';
import type { WatchDailyRow, UseWatchReturn } from '../types/watch';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoNow(): string {
  return new Date().toISOString();
}

function iso24hAgo(): string {
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWatch(): UseWatchReturn {
  const [data, setData] = useState<WatchDailyRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);

  // Guard against concurrent syncs (mirrors useBackup pattern)
  const isRunning = useRef(false);
  const initialized = useRef(false);

  // --------------------------------------------------------------------------
  // sync — read last 24h from Health Connect, upsert watch_daily, re-read row
  // --------------------------------------------------------------------------
  const sync = useCallback(async (): Promise<void> => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);

    try {
      // 1. Abort if HC wasn't initialized on mount (not available on this device)
      if (!initialized.current) return;

      // 2. Request READ permissions for all four data types
      await requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'HeartRate' },
        { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
        { accessType: 'read', recordType: 'SleepSession' },
        { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
      ]);

      const timeRangeFilter = {
        operator: 'between' as const,
        startTime: iso24hAgo(),
        endTime: isoNow(),
      };

      // 4a. Steps — sum all StepsRecord.count values
      let pasos: number | null = null;
      try {
        const stepsResult = await readRecords('Steps', { timeRangeFilter });
        if (stepsResult.records.length > 0) {
          pasos = stepsResult.records.reduce((acc, r) => acc + r.count, 0);
        }
      } catch {
        // permission denied or no data — leave null
      }

      // 4b. Resting HR — minimum of all HR samples (daily minimum ≈ resting HR)
      let fc_reposo_ppm: number | null = null;
      try {
        const hrResult = await readRecords('HeartRate', { timeRangeFilter });
        const allSamples = hrResult.records.flatMap((r) => r.samples);
        if (allSamples.length > 0) {
          fc_reposo_ppm = Math.min(...allSamples.map((s) => s.beatsPerMinute));
        }
      } catch {
        // permission denied or no data — leave null
      }

      // 4c. Sleep — sum of session durations in hours (captures naps + main sleep)
      let horas_sueno: number | null = null;
      try {
        const sleepResult = await readRecords('SleepSession', { timeRangeFilter });
        if (sleepResult.records.length > 0) {
          const totalMs = sleepResult.records.reduce((acc, r) => {
            const start = new Date(r.startTime).getTime();
            const end = new Date(r.endTime).getTime();
            return acc + Math.max(0, end - start);
          }, 0);
          horas_sueno = totalMs / (1000 * 60 * 60);
        }
      } catch {
        // permission denied or no data — leave null
      }

      // 4d. HRV — latest HeartRateVariabilityRmssd value (computed overnight by Samsung)
      let hrv: number | null = null;
      try {
        const hrvResult = await readRecords('HeartRateVariabilityRmssd', {
          timeRangeFilter,
        });
        if (hrvResult.records.length > 0) {
          // Latest record = last in ascending order
          const latest = hrvResult.records[hrvResult.records.length - 1];
          hrv = Math.round(latest.heartRateVariabilityMillis);
        }
      } catch {
        // permission denied or no data — leave null
      }

      // 4e. Active calories burned (display-only — MUST NEVER feed deficit math)
      let calorias_activas: number | null = null;
      try {
        const calResult = await readRecords('ActiveCaloriesBurned', {
          timeRangeFilter,
        });
        if (calResult.records.length > 0) {
          calorias_activas = Math.round(
            calResult.records.reduce(
              (acc, r) => acc + r.energy.inKilocalories,
              0
            )
          );
        }
      } catch {
        // permission denied or no data — leave null
      }

      // 5. Upsert today's row in watch_daily
      const db = await initDB();
      await db.runAsync(
        `INSERT OR REPLACE INTO watch_daily
           (fecha, pasos, fc_reposo_ppm, horas_sueno, hrv, calorias_activas)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [today(), pasos, fc_reposo_ppm, horas_sueno, hrv, calorias_activas]
      );

      // 6. Re-read today's row from DB (DB is the source of truth)
      const row = await db.getFirstAsync<WatchDailyRow>(
        `SELECT fecha, pasos, fc_reposo_ppm, horas_sueno, hrv, calorias_activas
         FROM watch_daily WHERE fecha = ?`,
        [today()]
      );
      setData(row ?? null);
      setLastSyncAt(new Date());
    } catch (err) {
      console.error('[useWatch] sync error', err);
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }, []);

  // --------------------------------------------------------------------------
  // Mount — load cached DB row + initialize HC client (once)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;

    async function loadCached(): Promise<void> {
      try {
        const db = await initDB();
        const row = await db.getFirstAsync<WatchDailyRow>(
          `SELECT fecha, pasos, fc_reposo_ppm, horas_sueno, hrv, calorias_activas
           FROM watch_daily WHERE fecha = ?`,
          [today()]
        );
        if (!cancelled) setData(row ?? null);
      } catch (err) {
        console.error('[useWatch] initial load error', err);
      }
    }

    async function initHC(): Promise<void> {
      try {
        const status = await getSdkStatus();
        if (status === SdkAvailabilityStatus.SDK_AVAILABLE) {
          await initialize();
          initialized.current = true;
        }
      } catch (err) {
        // Expected in Expo Go: the native module isn't linked. Degrade silently —
        // initialized stays false, so sync() aborts before touching Health Connect.
        console.warn('[useWatch] Health Connect unavailable, skipping watch sync', err);
      }
    }

    loadCached();
    initHC();
    return () => { cancelled = true; };
  }, []);

  // --------------------------------------------------------------------------
  // Sync on every tab focus (auto-refresh — mirrors useMetrics pattern)
  // --------------------------------------------------------------------------
  useFocusEffect(
    useCallback(() => {
      sync().catch((err) => console.error('[useWatch] focus sync error', err));
    }, [sync])
  );

  return { data, loading, lastSyncAt, sync };
}
