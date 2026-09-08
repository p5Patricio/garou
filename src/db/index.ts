import * as SQLite from 'expo-sqlite';
import { SCHEMA_SQL } from './schema';
import { seedDatabase, EXERCISES } from './seed';

// Continuity map for migration 11 (Rutina de Hipertrofia v3): links each exercise
// that survives into the new routine back to its previous (nombre, sesion) so the
// existing row — and the set_logs history/progression tied to its id — is updated
// in place instead of being replaced. Anything old not listed here is deactivated
// (never deleted); anything new not listed here is a fresh insert.
const V3_CONTINUITY: { fromNombre: string; fromSesion: string; toNombre: string; toSesion: string }[] = [
  { fromNombre: 'Press de banca con barra', fromSesion: 'Torso A', toNombre: 'Press de banca con barra', toSesion: 'Torso A' },
  { fromNombre: 'Remo con apoyo en pecho', fromSesion: 'Torso A', toNombre: 'Remo con apoyo en pecho', toSesion: 'Torso A' },
  { fromNombre: 'Press inclinado con mancuernas', fromSesion: 'Torso A', toNombre: 'Press inclinado con mancuernas', toSesion: 'Torso B' },
  { fromNombre: 'Jalon al pecho', fromSesion: 'Torso A', toNombre: 'Jalon al pecho (neutro o supino)', toSesion: 'Torso A' },
  { fromNombre: 'Elevaciones laterales con mancuerna', fromSesion: 'Torso A', toNombre: 'Elevaciones laterales', toSesion: 'Torso A' },
  { fromNombre: 'Sentadilla con barra', fromSesion: 'Pierna A', toNombre: 'Sentadilla con barra alta o hack', toSesion: 'Pierna A' },
  { fromNombre: 'Prensa de pierna', fromSesion: 'Pierna A', toNombre: 'Prensa de pierna', toSesion: 'Pierna A' },
  { fromNombre: 'Extension de cuadriceps', fromSesion: 'Pierna A', toNombre: 'Extension de cuadriceps', toSesion: 'Pierna A' },
  { fromNombre: 'Curl femoral sentado', fromSesion: 'Pierna A', toNombre: 'Curl femoral sentado', toSesion: 'Pierna A' },
  { fromNombre: 'Elevacion de gemelos de pie', fromSesion: 'Pierna A', toNombre: 'Gemelos de pie', toSesion: 'Pierna A' },
  { fromNombre: 'Elevaciones laterales', fromSesion: 'Ligero', toNombre: 'Elevaciones laterales', toSesion: 'Ligero' },
  { fromNombre: 'Pec deck invertido / pajaros', fromSesion: 'Ligero', toNombre: 'Pec deck invertido', toSesion: 'Ligero' },
  { fromNombre: 'Encogimientos de hombros', fromSesion: 'Ligero', toNombre: 'Encogimientos de hombros', toSesion: 'Ligero' },
  { fromNombre: 'Curl de muneca', fromSesion: 'Ligero', toNombre: 'Curl de muneca con mancuernas', toSesion: 'Ligero' },
  { fromNombre: 'Curl inverso', fromSesion: 'Ligero', toNombre: 'Curl inverso', toSesion: 'Ligero' },
  { fromNombre: 'Crunch en polea', fromSesion: 'Ligero', toNombre: 'Crunch en polea', toSesion: 'Ligero' },
  { fromNombre: 'Press militar sentado', fromSesion: 'Torso B', toNombre: 'Press militar sentado', toSesion: 'Torso B' },
  { fromNombre: 'Dominadas / Jalon prono', fromSesion: 'Torso B', toNombre: 'Dominadas o jalon prono', toSesion: 'Torso B' },
  { fromNombre: 'Remo en polea baja', fromSesion: 'Torso B', toNombre: 'Remo en polea baja (agarre estrecho)', toSesion: 'Torso B' },
  { fromNombre: 'Curl predicador / inclinado', fromSesion: 'Torso B', toNombre: 'Curl predicador', toSesion: 'Torso B' },
  { fromNombre: 'Press cerrado / extension sobre cabeza', fromSesion: 'Torso B', toNombre: 'Press frances con barra Z', toSesion: 'Torso B' },
  { fromNombre: 'Peso muerto rumano', fromSesion: 'Pierna B', toNombre: 'Peso muerto rumano', toSesion: 'Pierna B' },
  { fromNombre: 'Sentadilla hack o prensa', fromSesion: 'Pierna B', toNombre: 'Sentadilla hack o prensa', toSesion: 'Pierna B' },
  { fromNombre: 'Empuje de cadera', fromSesion: 'Pierna B', toNombre: 'Empuje de cadera (Hip Thrust)', toSesion: 'Pierna B' },
  { fromNombre: 'Elevacion de gemelos de pie', fromSesion: 'Pierna B', toNombre: 'Gemelos de pie o en prensa', toSesion: 'Pierna B' },
  { fromNombre: 'Encogimientos de hombros', fromSesion: 'Pierna B', toNombre: 'Encogimientos de hombros', toSesion: 'Pierna B' },
];

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
    await db.execAsync('PRAGMA user_version = 13;');
    return;
  }

  if (currentVersion >= 13) return;

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

  if (currentVersion < 10) {
  // Migration 10: add started_at_ms to workout_sessions to track real session
  // duration. ALTER TABLE ADD COLUMN is atomic for optional columns with defaults.
  const workoutColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(workout_sessions)');
  const workoutColumnNames = new Set(workoutColumns.map((c) => c.name));
  if (!workoutColumnNames.has('started_at_ms')) {
    await db.execAsync('ALTER TABLE workout_sessions ADD COLUMN started_at_ms INTEGER;');
  }
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`
  );
  await db.execAsync('PRAGMA user_version = 10;');
  }

  if (currentVersion < 11) {
  // Migration 11: Rutina de Hipertrofia v3. Never wipes exercises/set_logs (unlike
  // migrations 4/5) — this device already has real training history. Each exercise
  // that continues into v3 is UPDATEd in place via V3_CONTINUITY (preserving its id,
  // so set_logs and progression stay linked); anything dropped from the routine is
  // deactivated, never deleted; anything genuinely new is inserted.
  await db.withTransactionAsync(async () => {
    const existing = await db.getAllAsync<{ id: number; nombre: string; sesion: string }>(
      'SELECT id, nombre, sesion FROM exercises'
    );
    const findExisting = (nombre: string, sesion: string) =>
      existing.find((e) => e.nombre === nombre && e.sesion === sesion);
    const updatedIds = new Set<number>();

    for (const map of V3_CONTINUITY) {
      const oldRow = findExisting(map.fromNombre, map.fromSesion);
      const newDef = EXERCISES.find((e) => e.nombre === map.toNombre && e.sesion === map.toSesion);
      if (!oldRow || !newDef) continue; // defensive: skip a mapping that no longer resolves
      await db.runAsync(
        `UPDATE exercises SET nombre=?, grupo_muscular=?, equipo=?, sesion=?, orden=?,
           series_objetivo=?, reps_min=?, reps_max=?, rir_min=?, rir_max=?, rir_objetivo=?,
           descanso_seg=?, notas_tecnica=?, unidad_preferida=?, superset_group=?, activo=1
         WHERE id=?`,
        [
          newDef.nombre, newDef.grupo_muscular, newDef.equipo, newDef.sesion, newDef.orden,
          newDef.series_objetivo, newDef.reps_min, newDef.reps_max, newDef.rir_min, newDef.rir_max, newDef.rir_min,
          newDef.descanso_seg, newDef.notas_tecnica, newDef.unidad_preferida, newDef.superset_group ?? null,
          oldRow.id,
        ]
      );
      updatedIds.add(oldRow.id);
    }

    // Deactivate every old exercise that wasn't carried forward into v3.
    for (const row of existing) {
      if (!updatedIds.has(row.id)) {
        await db.runAsync('UPDATE exercises SET activo = 0 WHERE id = ?', [row.id]);
      }
    }

    // Insert brand-new v3 exercises (no continuity mapping targets them).
    const carriedTargets = new Set(V3_CONTINUITY.map((m) => `${m.toNombre}|${m.toSesion}`));
    for (const def of EXERCISES) {
      const key = `${def.nombre}|${def.sesion}`;
      if (carriedTargets.has(key)) continue;
      await db.runAsync(
        `INSERT INTO exercises (
          nombre, grupo_muscular, equipo, sesion, orden,
          series_objetivo, reps_min, reps_max, rir_min, rir_max, rir_objetivo,
          descanso_seg, notas_tecnica, unidad_preferida, superset_group, activo
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          def.nombre, def.grupo_muscular, def.equipo, def.sesion, def.orden,
          def.series_objetivo, def.reps_min, def.reps_max, def.rir_min, def.rir_max, def.rir_min,
          def.descanso_seg, def.notas_tecnica, def.unidad_preferida, def.superset_group ?? null,
        ]
      );
    }
  });
  await db.execAsync('PRAGMA user_version = 11;');
  }

  if (currentVersion < 12) {
  // Migration 12: repair migration 11. Migration 11 called getAllAsync (a read)
  // as the first statement inside withTransactionAsync — the exact anti-pattern
  // already documented on migration 5 above ("a read nested inside an open write
  // transaction... rolled back exercise inserts"). It silently left some v3
  // exercises missing on devices that had already run migration 11 (this one
  // included). This migration re-runs the same v3 continuity/insert/deactivate
  // logic with the read moved outside the transaction, and every step re-runnable
  // (idempotent) so it safely repairs a partial migration 11 result without
  // creating duplicates or re-running for devices where 11 already worked fine.
  const existing = await db.getAllAsync<{ id: number; nombre: string; sesion: string }>(
    'SELECT id, nombre, sesion FROM exercises'
  );
  const findExisting = (nombre: string, sesion: string) =>
    existing.find((e) => e.nombre === nombre && e.sesion === sesion);
  const updatedIds = new Set<number>();

  await db.withTransactionAsync(async () => {
    for (const map of V3_CONTINUITY) {
      const oldRow = findExisting(map.fromNombre, map.fromSesion);
      const newDef = EXERCISES.find((e) => e.nombre === map.toNombre && e.sesion === map.toSesion);
      if (!oldRow || !newDef) continue;
      await db.runAsync(
        `UPDATE exercises SET nombre=?, grupo_muscular=?, equipo=?, sesion=?, orden=?,
           series_objetivo=?, reps_min=?, reps_max=?, rir_min=?, rir_max=?, rir_objetivo=?,
           descanso_seg=?, notas_tecnica=?, unidad_preferida=?, superset_group=?, activo=1
         WHERE id=?`,
        [
          newDef.nombre, newDef.grupo_muscular, newDef.equipo, newDef.sesion, newDef.orden,
          newDef.series_objetivo, newDef.reps_min, newDef.reps_max, newDef.rir_min, newDef.rir_max, newDef.rir_min,
          newDef.descanso_seg, newDef.notas_tecnica, newDef.unidad_preferida, newDef.superset_group ?? null,
          oldRow.id,
        ]
      );
      updatedIds.add(oldRow.id);
    }

    // Deactivate every old exercise that wasn't carried forward into v3. Already-
    // deactivated rows (activo = 0) are just set to 0 again — harmless no-op.
    for (const row of existing) {
      if (!updatedIds.has(row.id)) {
        await db.runAsync('UPDATE exercises SET activo = 0 WHERE id = ?', [row.id]);
      }
    }
  });

  // Insert any v3 exercise still missing, checked against live DB state (not the
  // pre-migration snapshot above) so a duplicate can never be created here even if
  // migration 11 already inserted some of these successfully. Deliberately run
  // outside any transaction — no nested reads inside a write transaction.
  for (const def of EXERCISES) {
    const already = await db.getFirstAsync<{ id: number }>(
      'SELECT id FROM exercises WHERE nombre = ? AND sesion = ?',
      [def.nombre, def.sesion]
    );
    if (already) continue;
    await db.runAsync(
      `INSERT INTO exercises (
        nombre, grupo_muscular, equipo, sesion, orden,
        series_objetivo, reps_min, reps_max, rir_min, rir_max, rir_objetivo,
        descanso_seg, notas_tecnica, unidad_preferida, superset_group, activo
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        def.nombre, def.grupo_muscular, def.equipo, def.sesion, def.orden,
        def.series_objetivo, def.reps_min, def.reps_max, def.rir_min, def.rir_max, def.rir_min,
        def.descanso_seg, def.notas_tecnica, def.unidad_preferida, def.superset_group ?? null,
      ]
    );
  }

  await db.execAsync('PRAGMA user_version = 12;');
  }

  if (currentVersion < 13) {
  // Migration 13: link an exercise to its exercises-dataset entry, for the GIF
  // library. All three nullable, checked with PRAGMA table_info first (same
  // idempotency guard as migration 8) so a repair-run reconcile pass never
  // fails on a column that already exists. Never touched by
  // reconcileExerciseCatalog, which only ever writes the routine-catalog
  // columns it explicitly lists.
  const exerciseColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(exercises)');
  const exerciseColumnNames = new Set(exerciseColumns.map((c) => c.name));
  if (!exerciseColumnNames.has('dataset_id')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN dataset_id TEXT;');
  }
  if (!exerciseColumnNames.has('gif_path')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN gif_path TEXT;');
  }
  if (!exerciseColumnNames.has('thumb_path')) {
    await db.execAsync('ALTER TABLE exercises ADD COLUMN thumb_path TEXT;');
  }
  await db.execAsync('PRAGMA user_version = 13;');
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

    // reconcileExerciseCatalog is NEVER called automatically here anymore.
    //
    // It used to run on every launch, silently forcing every device's exercises
    // table to match this build's hardcoded EXERCISES catalog. That was fine
    // while Garou had exactly one user (me) whose device was always meant to
    // mirror the latest seed. It stopped being fine the moment other people
    // started installing Garou and editing Rutina to fit their own routine:
    // any exercise they renamed, or added and I never wrote, doesn't match
    // anything in EXERCISES, so an automatic reconcile would deactivate their
    // real customization and silently reinsert mine in its place — on every
    // single relaunch, not just after an update. A `catalog_customized` opt-out
    // flag was sketched here for this, but nothing ever set it, so the bug was
    // live from the moment routine editing shipped.
    //
    // The fix is to make catalog sync an explicit, user-initiated action
    // instead of an implicit background one: see syncOfficialCatalog (Rutina's
    // "Sincronizar con la rutina oficial" button), which calls
    // reconcileExerciseCatalog directly, once, with the user's confirmation.

    _db = db;
    return db;
  })();

  return _initPromise;
}

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('DB not initialized — call initDB() first');
  return _db;
}
