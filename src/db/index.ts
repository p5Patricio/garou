import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// Rebuild set_logs with the UNIQUE constraint.
// SQLite cannot ALTER-ADD a constraint, so we use the copy-swap pattern.
async function migrateDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  const versionRow = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion === 0) {
    await db.execAsync('PRAGMA user_version = 9;');
    return;
  }

  if (currentVersion >= 9) return;

  if (currentVersion < 1) {
  // Migration 1: add UNIQUE(session_id, exercise_id, num_serie) to set_logs
  await db.withTransactionAsync(async () => {
    // Copy existing rows into a temp table
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS set_logs_tmp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        exercise_id INTEGER NOT NULL,
        num_serie INTEGER NOT NULL,
        peso_kg REAL NOT NULL DEFAULT 0,
        reps INTEGER NOT NULL,
        rir_real INTEGER,
        completada INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
        FOREIGN KEY (exercise_id) REFERENCES exercises(id),
        UNIQUE(session_id, exercise_id, num_serie)
      );`
    );
    await db.execAsync(
      `INSERT OR IGNORE INTO set_logs_tmp
         (id, session_id, exercise_id, num_serie, peso_kg, reps, rir_real, completada)
       SELECT id, session_id, exercise_id, num_serie, peso_kg, reps, rir_real, completada
       FROM set_logs;`
    );
    await db.execAsync('DROP TABLE set_logs;');
    await db.execAsync('ALTER TABLE set_logs_tmp RENAME TO set_logs;');
  });

  await db.execAsync('PRAGMA user_version = 1;');
  }

  if (currentVersion < 2) {
  // Migration 2: add UNIQUE(fecha, tipo_sesion) to workout_sessions
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS workout_sessions_tmp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        tipo_sesion TEXT NOT NULL,
        duracion_min INTEGER,
        notas TEXT,
        completada INTEGER NOT NULL DEFAULT 0,
        UNIQUE(fecha, tipo_sesion)
      );`
    );
    await db.execAsync(
      `INSERT OR IGNORE INTO workout_sessions_tmp
         (id, fecha, tipo_sesion, duracion_min, notas, completada)
       SELECT id, fecha, tipo_sesion, duracion_min, notas, completada
       FROM workout_sessions;`
    );
    await db.execAsync('DROP TABLE workout_sessions;');
    await db.execAsync('ALTER TABLE workout_sessions_tmp RENAME TO workout_sessions;');
  });
  await db.execAsync('PRAGMA user_version = 2;');
  }

  if (currentVersion < 3) {
  // Migration 3: add UNIQUE(fecha) to body_metrics via copy-swap
  await db.withTransactionAsync(async () => {
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS body_metrics_tmp (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fecha TEXT NOT NULL,
        peso_kg REAL,
        cintura_cm REAL,
        foto_uri TEXT,
        UNIQUE(fecha)
      );`
    );
    await db.execAsync(
      `INSERT OR IGNORE INTO body_metrics_tmp (id, fecha, peso_kg, cintura_cm, foto_uri)
       SELECT id, fecha, peso_kg, cintura_cm, foto_uri FROM body_metrics;`
    );
    await db.execAsync('DROP TABLE body_metrics;');
    await db.execAsync('ALTER TABLE body_metrics_tmp RENAME TO body_metrics;');
  });
  await db.execAsync('PRAGMA user_version = 3;');
  }

  if (currentVersion < 4) {
  // Migration 4: reset exercises to match the updated routine from PDF.
  // set_logs reference exercises by id, so they must be cleared first.
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM set_logs;');
    await db.execAsync('DELETE FROM exercises;');
  });
  await db.execAsync('PRAGMA user_version = 4;');
  }

  if (currentVersion < 5) {
  // Migration 5: force a fresh reseed. A previous seed bug (a read nested inside
  // an open write transaction) rolled back exercise inserts, leaving the table
  // empty at user_version=4. Clear exercises so the fixed seed runs again.
  // set_logs reference exercises by id, so they must be cleared first.
  await db.withTransactionAsync(async () => {
    await db.execAsync('DELETE FROM set_logs;');
    await db.execAsync('DELETE FROM exercises;');
  });
  await db.execAsync('PRAGMA user_version = 5;');
  }

  if (currentVersion < 6) {
  // Migration 6: add usa_placas column to exercises so machines that show plate
  // counts can toggle their weight unit. ALTER TABLE ADD COLUMN is atomic — no
  // transaction needed.
  await db.execAsync(
    'ALTER TABLE exercises ADD COLUMN usa_placas INTEGER NOT NULL DEFAULT 0;'
  );
  await db.execAsync('PRAGMA user_version = 6;');
  }

  if (currentVersion < 7) {
  // Migration 7: add es_descanso to workout_sessions so a day can be marked as
  // a rest day ("didn't go to the gym"). Rest days do not advance the routine
  // rotation. ALTER TABLE ADD COLUMN is atomic — no transaction needed.
  await db.execAsync(
    'ALTER TABLE workout_sessions ADD COLUMN es_descanso INTEGER NOT NULL DEFAULT 0;'
  );
  await db.execAsync('PRAGMA user_version = 7;');
  }

  if (currentVersion < 8) {
  // Migration 8: gym-only model. Keep legacy columns, add editable routine
  // metadata and literal load units for future logs.
  const exerciseColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  const exerciseColumnNames = new Set(exerciseColumns.map((c) => c.name));
  if (!exerciseColumnNames.has('orden')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN orden INTEGER NOT NULL DEFAULT 0;');
  }
  if (!exerciseColumnNames.has('rir_min')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN rir_min INTEGER NOT NULL DEFAULT 0;');
  }
  if (!exerciseColumnNames.has('rir_max')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN rir_max INTEGER NOT NULL DEFAULT 0;');
  }
  if (!exerciseColumnNames.has('unidad_preferida')) {
    await db.execAsync("ALTER TABLE exercises ADD COLUMN unidad_preferida TEXT NOT NULL DEFAULT 'kg';");
  }
  if (!exerciseColumnNames.has('activo')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN activo INTEGER NOT NULL DEFAULT 1;');
  }
  if (!exerciseColumnNames.has('superset_group')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN superset_group TEXT;');
  }
  await db.execAsync('UPDATE exercises SET rir_min = rir_objetivo WHERE rir_min = 0 AND rir_objetivo IS NOT NULL;');
  await db.execAsync('UPDATE exercises SET rir_max = rir_objetivo WHERE rir_max = 0 AND rir_objetivo IS NOT NULL;');
  if (exerciseColumnNames.has('usa_placas')) {
    await db.execAsync("UPDATE exercises SET unidad_preferida = CASE WHEN usa_placas = 1 THEN 'placas' ELSE unidad_preferida END;");
  }

  const setColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(set_logs)');
  const setColumnNames = new Set(setColumns.map((c) => c.name));
  if (!setColumnNames.has('carga_valor')) {
    await db.execAsync('ALTER TABLE set_logs ADD COLUMN carga_valor REAL NOT NULL DEFAULT 0;');
  }
  if (!setColumnNames.has('carga_unidad')) {
    await db.execAsync("ALTER TABLE set_logs ADD COLUMN carga_unidad TEXT NOT NULL DEFAULT 'kg';");
  }
  await db.execAsync('UPDATE set_logs SET carga_valor = peso_kg WHERE carga_valor = 0 AND peso_kg IS NOT NULL;');
  await db.execAsync('PRAGMA user_version = 8;');
  }

  if (currentVersion < 9) {
  // Migration 9: remove nutrition/watch tables and add persisted timers.
  await db.execAsync('DROP TABLE IF EXISTS nutrition_logs;');
  await db.execAsync('DROP TABLE IF EXISTS nutrition_targets;');
  await db.execAsync('DROP TABLE IF EXISTS foods;');
  await db.execAsync('DROP TABLE IF EXISTS water_logs;');
  await db.execAsync('DROP TABLE IF EXISTS watch_daily;');
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS active_timers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      kind TEXT NOT NULL,
      label TEXT NOT NULL,
      started_at_ms INTEGER NOT NULL,
      end_at_ms INTEGER NOT NULL,
      total_seg INTEGER NOT NULL,
      notification_id TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );`
  );
  await db.execAsync('PRAGMA user_version = 9;');
  }
}

export async function initDB(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    const db = await SQLite.openDatabaseAsync('garou.db');

    const statements = SCHEMA_SQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      await db.execAsync(stmt + ';');
    }

    await migrateDatabase(db);

    await seedDatabase(db);

    _db = db;
    return db;
  })();

  return _initPromise;
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialized — call initDB() first');
  return _db;
}
