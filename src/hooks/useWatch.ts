import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initialize,
  requestPermission,
  getGrantedPermissions,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { Permission } from 'react-native-health-connect';
import { initDB } from '../db';
import type { WatchDailyRow, UseWatchReturn, SyncResult } from '../types/watch';

// READ permissions this app needs from Health Connect.
const REQUIRED_PERMISSIONS: Permission[] = [
  { accessType: 'read', recordType: 'Steps' },
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'HeartRateVariabilityRmssd' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'ActiveCaloriesBurned' },
];

const permKey = (p: { accessType: string; recordType: string }) => `${p.accessType}:${p.recordType}`;

// Build a set of "accessType:recordType" keys from a granted-permissions list.
function grantedKeys(granted: unknown[]): Set<string> {
  return new Set(
    granted
      .filter((g): g is Permission => !!g && typeof g === 'object' && 'recordType' in g && 'accessType' in g)
      .map((g) => permKey(g))
  );
}

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
  const sync = useCallback(async (): Promise<SyncResult> => {
    if (isRunning.current) return { ok: false, message: 'Ya hay una sincronización en curso.' };
    isRunning.current = true;
    setLoading(true);

    try {
      // 1. Availability — is Health Connect present on this device?
      let status: number;
      try {
        status = await getSdkStatus();
      } catch (e) {
        return {
          ok: false,
          message:
            'El módulo de Health Connect no está enlazado. Esto solo funciona en una build de EAS, no en Expo Go.',
        };
      }
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        const detail =
          status === SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED
            ? 'Actualizá la app Health Connect desde Play Store.'
            : 'Instalá o activá Health Connect en este teléfono.';
        return { ok: false, message: `Health Connect no está disponible. ${detail}` };
      }

      // 2. Initialize the client.
      initialized.current = await initialize();
      if (!initialized.current) {
        return { ok: false, message: 'No se pudo inicializar Health Connect.' };
      }

      // 3. Request READ permissions for types not yet granted, then re-check.
      let grantedSet = grantedKeys(await getGrantedPermissions());
      const missing = REQUIRED_PERMISSIONS.filter((p) => !grantedSet.has(permKey(p)));
      if (missing.length > 0) {
        await requestPermission(missing);
        grantedSet = grantedKeys(await getGrantedPermissions());
      }
      const granted = REQUIRED_PERMISSIONS.filter((p) => grantedSet.has(permKey(p)));
      if (granted.length === 0) {
        return {
          ok: false,
          message:
            'Garou no tiene permiso de lectura en Health Connect. Abrí Health Connect → Permisos de apps → Garou y activá pasos, frecuencia cardíaca, sueño, variabilidad y calorías.',
        };
      }

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

      // Report exactly what came back so "nothing happened" becomes actionable.
      const got: string[] = [];
      if (pasos != null) got.push(`${pasos.toLocaleString()} pasos`);
      if (fc_reposo_ppm != null) got.push(`FC reposo ${fc_reposo_ppm}`);
      if (horas_sueno != null) got.push(`${horas_sueno.toFixed(1)} h de sueño`);
      if (hrv != null) got.push(`HRV ${hrv} ms`);
      if (calorias_activas != null) got.push(`${calorias_activas} kcal`);

      if (got.length === 0) {
        return {
          ok: true,
          message:
            'Conectado a Health Connect, pero no devolvió datos de las últimas 24 h. Abrí Samsung Health para forzar una sincronización y verificá que en Samsung Health → Ajustes → Health Connect estén activados pasos, frecuencia cardíaca, sueño, variabilidad y calorías.',
        };
      }
      return { ok: true, message: `Sincronizado: ${got.join(' · ')}.` };
    } catch (err) {
      return {
        ok: false,
        message: `Error al sincronizar: ${err instanceof Error ? err.message : String(err)}`,
      };
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

  // NOTE: Watch sync is MANUAL only (via the "Sync reloj" button), never on
  // tab focus. sync() calls react-native-health-connect's requestPermission,
  // which launches a native Android Activity. Auto-firing that on every focus
  // crashed the production APK when returning to the Hoy tab. Health Connect is
  // Phase 5 and must not be invoked implicitly by navigation.

  return { data, loading, lastSyncAt, sync };
}
