import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { getDB } from '../db';
import { todayLocal } from '../utils/date';
import type { BackupFile, UseBackupReturn } from '../types/backup';

const BACKUP_VERSION = 2;

function backupDateString(): string {
  return todayLocal();
}

function confirmImport(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('Importar respaldo', 'Esto reemplazara tus entrenos, cardio y metricas actuales.', [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Importar', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

export function useBackup(): UseBackupReturn {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const isRunning = useRef(false);

  const exportBackup = useCallback(async (): Promise<void> => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);
    setLastResult('idle');
    setErrorMsg(null);

    try {
      const db = getDB();
      const [exercises, workout_sessions, set_logs, body_metrics, cardio_logs, active_timers] = await Promise.all([
        db.getAllAsync<any>('SELECT * FROM exercises'),
        db.getAllAsync<any>('SELECT * FROM workout_sessions'),
        db.getAllAsync<any>('SELECT * FROM set_logs'),
        db.getAllAsync<any>('SELECT * FROM body_metrics'),
        db.getAllAsync<any>('SELECT * FROM cardio_logs'),
        db.getAllAsync<any>('SELECT * FROM active_timers'),
      ]);

      const backup: BackupFile = {
        version: BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        tables: {
          exercises,
          workout_sessions,
          set_logs,
          body_metrics,
          cardio_logs,
          active_timers,
        },
      };

      const file = new File(Paths.cache, `garou-gym-backup-${backupDateString()}.json`);
      await file.write(JSON.stringify(backup, null, 2));
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        dialogTitle: 'Guardar respaldo',
        UTI: 'public.json',
      });
      setLastResult('success');
      Alert.alert('Respaldo', 'El archivo se ha generado y esta listo para compartir.');
    } catch (err: any) {
      setLastResult('error');
      setErrorMsg(err?.message ?? 'Error desconocido al exportar');
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }, []);

  const importBackup = useCallback(async (): Promise<void> => {
    if (isRunning.current) return;
    isRunning.current = true;
    setLoading(true);
    setLastResult('idle');
    setErrorMsg(null);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.length) return;

      const raw = await new File(result.assets[0].uri).text();
      const parsed = JSON.parse(raw) as BackupFile;
      if (!parsed.tables || !Array.isArray(parsed.tables.exercises)) {
        throw new Error('El archivo no tiene el formato de respaldo esperado.');
      }
      if (parsed.version > BACKUP_VERSION) {
        throw new Error(`Este respaldo requiere una version mas nueva de Garou (v${parsed.version}).`);
      }
      if (!(await confirmImport())) return;

      const db = getDB();
      const tables = parsed.tables;

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM set_logs');
        await db.runAsync('DELETE FROM workout_sessions');
        await db.runAsync('DELETE FROM body_metrics');
        await db.runAsync('DELETE FROM cardio_logs');
        await db.runAsync('DELETE FROM active_timers');
        await db.runAsync('DELETE FROM exercises');

        // active_timers are intentionally not restored: a backup may be old and the
        // timers would already be expired. Re-scheduling them is unsafe, so the
        // table is cleared during import and left empty. This is documented in the
        // export format as an optional field for future migration only.

        for (const row of tables.exercises ?? []) {
          await db.runAsync(
            `INSERT INTO exercises (
              id, nombre, grupo_muscular, equipo, sesion, orden,
              series_objetivo, reps_min, reps_max, rir_min, rir_max, rir_objetivo,
              descanso_seg, notas_tecnica, unidad_preferida, activo, superset_group
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id,
              row.nombre,
              row.grupo_muscular,
              row.equipo,
              row.sesion,
              row.orden ?? 0,
              row.series_objetivo,
              row.reps_min,
              row.reps_max,
              row.rir_min ?? row.rir_objetivo ?? 0,
              row.rir_max ?? row.rir_objetivo ?? 0,
              row.rir_objetivo ?? row.rir_min ?? 0,
              row.descanso_seg,
              row.notas_tecnica ?? null,
              row.unidad_preferida ?? (row.usa_placas === 1 ? 'placas' : 'kg'),
              row.activo ?? 1,
              row.superset_group ?? null,
            ]
          );
        }

        for (const row of tables.workout_sessions ?? []) {
          await db.runAsync(
            `INSERT INTO workout_sessions (id, fecha, tipo_sesion, duracion_min, notas, completada, es_descanso)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [row.id, row.fecha, row.tipo_sesion, row.duracion_min ?? null, row.notas ?? null, row.completada, row.es_descanso ?? 0]
          );
        }

        for (const row of tables.set_logs ?? []) {
          await db.runAsync(
            `INSERT INTO set_logs (
              id, session_id, exercise_id, num_serie, peso_kg,
              carga_valor, carga_unidad, reps, rir_real, completada
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              row.id,
              row.session_id,
              row.exercise_id,
              row.num_serie,
              row.peso_kg ?? 0,
              row.carga_valor ?? row.peso_kg ?? 0,
              row.carga_unidad ?? 'kg',
              row.reps,
              row.rir_real ?? null,
              row.completada,
            ]
          );
        }

        for (const row of tables.body_metrics ?? []) {
          await db.runAsync(
            `INSERT INTO body_metrics (id, fecha, peso_kg, cintura_cm, foto_uri)
             VALUES (?, ?, ?, ?, ?)`,
            [row.id, row.fecha, row.peso_kg ?? null, row.cintura_cm ?? null, row.foto_uri ?? null]
          );
        }

        for (const row of tables.cardio_logs ?? []) {
          await db.runAsync(
            `INSERT INTO cardio_logs (id, fecha, tipo, minutos, fc_promedio_ppm, zona)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [row.id, row.fecha, row.tipo, row.minutos, row.fc_promedio_ppm ?? null, row.zona ?? null]
          );
        }
      });

      setLastResult('success');
      Alert.alert('Importar', 'Respaldo restaurado correctamente.');
    } catch (err: any) {
      setLastResult('error');
      const msg = err?.message ?? 'Error desconocido al importar';
      setErrorMsg(msg);
      Alert.alert('Importar', msg);
    } finally {
      isRunning.current = false;
      setLoading(false);
    }
  }, []);

  return { loading, lastResult, errorMsg, exportBackup, importBackup };
}
