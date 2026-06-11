import { useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from '../db';
import type { BackupFile, UseBackupReturn } from '../types/backup';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BACKUP_VERSION = 1;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

async function showConfirmAlert(
  title: string,
  message: string,
  confirmLabel: string
): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBackup(): UseBackupReturn {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isRunning = useRef(false);

  // -------------------------------------------------------------------------
  // exportBackup
  // -------------------------------------------------------------------------
  const exportBackup = useCallback(async (): Promise<void> => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);
    setLastResult('idle');
    setErrorMsg(null);

    try {
      const db = getDB();

      const [
        exercises,
        workout_sessions,
        set_logs,
        foods,
        nutrition_targets,
        nutrition_logs,
        body_metrics,
        cardio_logs,
        water_logs,
        watch_daily,
      ] = await Promise.all([
        db.getAllAsync<any>('SELECT * FROM exercises'),
        db.getAllAsync<any>('SELECT * FROM workout_sessions'),
        db.getAllAsync<any>('SELECT * FROM set_logs'),
        db.getAllAsync<any>('SELECT * FROM foods'),
        db.getAllAsync<any>('SELECT * FROM nutrition_targets'),
        db.getAllAsync<any>('SELECT * FROM nutrition_logs'),
        db.getAllAsync<any>('SELECT * FROM body_metrics'),
        db.getAllAsync<any>('SELECT * FROM cardio_logs'),
        db.getAllAsync<any>('SELECT * FROM water_logs'),
        db.getAllAsync<any>('SELECT * FROM watch_daily'),
      ]);

      const backup: BackupFile = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables: {
          exercises,
          workout_sessions,
          set_logs,
          foods,
          nutrition_targets,
          nutrition_logs,
          body_metrics,
          cardio_logs,
          water_logs,
          watch_daily,
        },
      };

      const filename = `garou-backup-${todayISO()}.json`;
      const file = new File(Paths.cache, filename);
      file.write(JSON.stringify(backup, null, 2));

      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar respaldo',
        UTI: 'public.json',
      });

      setLastResult('success');
    } catch (err: any) {
      setLastResult('error');
      setErrorMsg(err?.message ?? 'Error desconocido al exportar');
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // importBackup
  // -------------------------------------------------------------------------
  const importBackup = useCallback(async (): Promise<void> => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);
    setLastResult('idle');
    setErrorMsg(null);

    try {
      // 1. Pick file
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const pickedUri = result.assets[0].uri;
      const pickedFile = new File(pickedUri);

      // 2. Read and parse
      let raw: string;
      try {
        raw = await pickedFile.text();
      } catch {
        throw new Error('No se pudo leer el archivo seleccionado.');
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error('El archivo no es un JSON válido.');
      }

      // 3. Validate structure
      if (
        typeof parsed.version !== 'number' ||
        !parsed.tables ||
        typeof parsed.tables !== 'object'
      ) {
        throw new Error(
          'El archivo no tiene el formato de respaldo esperado (faltan version o tables).'
        );
      }

      const requiredKeys = [
        'exercises', 'workout_sessions', 'set_logs', 'foods',
        'nutrition_targets', 'nutrition_logs', 'body_metrics',
        'cardio_logs', 'water_logs', 'watch_daily',
      ];
      for (const key of requiredKeys) {
        if (!Array.isArray(parsed.tables[key])) {
          throw new Error(`El respaldo no contiene la tabla "${key}".`);
        }
      }

      // 4. Version check
      if (parsed.version > BACKUP_VERSION) {
        throw new Error(
          `Este respaldo fue creado con una versión más nueva de la app (v${parsed.version}). ` +
          `Actualiza la app para poder importarlo.`
        );
      }

      // 5. Destructive confirmation
      const confirmed = await showConfirmAlert(
        'Importar respaldo',
        'Esto reemplazará TODOS tus datos actuales con los del respaldo. Esta acción no se puede deshacer.',
        'Importar'
      );
      if (!confirmed) {
        return;
      }

      // 6. Atomic wipe + restore inside a single transaction
      const db = getDB();
      const backup: BackupFile = parsed as BackupFile;

      await db.withTransactionAsync(async () => {
        // --- DELETE in FK-safe order (children before parents) ---
        await db.runAsync('DELETE FROM set_logs');
        await db.runAsync('DELETE FROM workout_sessions');
        await db.runAsync('DELETE FROM nutrition_logs');
        await db.runAsync('DELETE FROM foods');
        await db.runAsync('DELETE FROM nutrition_targets');
        await db.runAsync('DELETE FROM body_metrics');
        await db.runAsync('DELETE FROM cardio_logs');
        await db.runAsync('DELETE FROM water_logs');
        await db.runAsync('DELETE FROM watch_daily');
        await db.runAsync('DELETE FROM exercises');

        // --- INSERT in FK-safe order (parents before children) ---

        // exercises
        for (const row of backup.tables.exercises) {
          await db.runAsync(
            `INSERT INTO exercises
               (id, nombre, grupo_muscular, equipo, sesion,
                series_objetivo, reps_min, reps_max, rir_objetivo,
                descanso_seg, notas_tecnica)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.nombre, row.grupo_muscular, row.equipo, row.sesion,
              row.series_objetivo, row.reps_min, row.reps_max, row.rir_objetivo,
              row.descanso_seg, row.notas_tecnica ?? null,
            ]
          );
        }

        // workout_sessions
        for (const row of backup.tables.workout_sessions) {
          await db.runAsync(
            `INSERT INTO workout_sessions
               (id, fecha, tipo_sesion, duracion_min, notas, completada)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.fecha, row.tipo_sesion,
              row.duracion_min ?? null, row.notas ?? null, row.completada,
            ]
          );
        }

        // set_logs
        for (const row of backup.tables.set_logs) {
          await db.runAsync(
            `INSERT INTO set_logs
               (id, session_id, exercise_id, num_serie,
                peso_kg, reps, rir_real, completada)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.session_id, row.exercise_id, row.num_serie,
              row.peso_kg, row.reps, row.rir_real ?? null, row.completada,
            ]
          );
        }

        // foods
        for (const row of backup.tables.foods) {
          await db.runAsync(
            `INSERT INTO foods
               (id, nombre, kcal_100g, proteina_100g, carbos_100g,
                grasa_100g, precio_aprox_mxn)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.nombre, row.kcal_100g, row.proteina_100g,
              row.carbos_100g, row.grasa_100g, row.precio_aprox_mxn ?? null,
            ]
          );
        }

        // nutrition_targets (TEXT PRIMARY KEY — no AUTOINCREMENT id)
        for (const row of backup.tables.nutrition_targets) {
          await db.runAsync(
            `INSERT INTO nutrition_targets
               (tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g)
             VALUES (?, ?, ?, ?, ?)`,
            [
              row.tipo_dia, row.kcal_objetivo,
              row.proteina_g, row.carbos_g, row.grasa_g,
            ]
          );
        }

        // nutrition_logs
        for (const row of backup.tables.nutrition_logs) {
          await db.runAsync(
            `INSERT INTO nutrition_logs
               (id, fecha, num_comida, food_id, gramos)
             VALUES (?, ?, ?, ?, ?)`,
            [row.id, row.fecha, row.num_comida, row.food_id, row.gramos]
          );
        }

        // body_metrics
        for (const row of backup.tables.body_metrics) {
          await db.runAsync(
            `INSERT INTO body_metrics
               (id, fecha, peso_kg, cintura_cm, foto_uri)
             VALUES (?, ?, ?, ?, ?)`,
            [
              row.id, row.fecha,
              row.peso_kg ?? null, row.cintura_cm ?? null, row.foto_uri ?? null,
            ]
          );
        }

        // cardio_logs
        for (const row of backup.tables.cardio_logs) {
          await db.runAsync(
            `INSERT INTO cardio_logs
               (id, fecha, tipo, minutos, fc_promedio_ppm, zona)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              row.id, row.fecha, row.tipo, row.minutos,
              row.fc_promedio_ppm ?? null, row.zona ?? null,
            ]
          );
        }

        // water_logs
        for (const row of backup.tables.water_logs) {
          await db.runAsync(
            `INSERT INTO water_logs (id, fecha, ml)
             VALUES (?, ?, ?)`,
            [row.id, row.fecha, row.ml]
          );
        }

        // watch_daily (TEXT PRIMARY KEY = fecha)
        for (const row of backup.tables.watch_daily) {
          await db.runAsync(
            `INSERT INTO watch_daily
               (fecha, pasos, fc_reposo_ppm, horas_sueno, hrv, calorias_activas)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              row.fecha,
              row.pasos ?? null, row.fc_reposo_ppm ?? null,
              row.horas_sueno ?? null, row.hrv ?? null,
              row.calorias_activas ?? null,
            ]
          );
        }
      });

      setLastResult('success');
    } catch (err: any) {
      setLastResult('error');
      setErrorMsg(err?.message ?? 'Error desconocido al importar');
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }, []);

  return { loading, lastResult, errorMsg, exportBackup, importBackup };
}
