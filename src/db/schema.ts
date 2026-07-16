export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    grupo_muscular TEXT NOT NULL,
    equipo TEXT NOT NULL,
    sesion TEXT NOT NULL,
    orden INTEGER NOT NULL DEFAULT 0,
    series_objetivo INTEGER NOT NULL,
    reps_min INTEGER NOT NULL,
    reps_max INTEGER NOT NULL,
    rir_min INTEGER NOT NULL DEFAULT 0,
    rir_max INTEGER NOT NULL DEFAULT 0,
    rir_objetivo INTEGER NOT NULL,
    descanso_seg INTEGER NOT NULL,
    notas_tecnica TEXT,
    unidad_preferida TEXT NOT NULL DEFAULT 'kg',
    activo INTEGER NOT NULL DEFAULT 1,
    superset_group TEXT
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo_sesion TEXT NOT NULL,
    duracion_min INTEGER,
    notas TEXT,
    completada INTEGER NOT NULL DEFAULT 0,
    es_descanso INTEGER NOT NULL DEFAULT 0,
    UNIQUE(fecha, tipo_sesion)
  );

  CREATE TABLE IF NOT EXISTS set_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    exercise_id INTEGER NOT NULL,
    num_serie INTEGER NOT NULL,
    peso_kg REAL NOT NULL DEFAULT 0,
    carga_valor REAL NOT NULL DEFAULT 0,
    carga_unidad TEXT NOT NULL DEFAULT 'kg',
    reps INTEGER NOT NULL,
    rir_real INTEGER,
    completada INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id),
    FOREIGN KEY (exercise_id) REFERENCES exercises(id),
    UNIQUE(session_id, exercise_id, num_serie)
  );

  CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    peso_kg REAL,
    cintura_cm REAL,
    foto_uri TEXT,
    UNIQUE(fecha)
  );

  CREATE TABLE IF NOT EXISTS cardio_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    minutos INTEGER NOT NULL,
    fc_promedio_ppm INTEGER,
    zona INTEGER
  );

  CREATE TABLE IF NOT EXISTS active_timers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    label TEXT NOT NULL,
    started_at_ms INTEGER NOT NULL,
    end_at_ms INTEGER NOT NULL,
    total_seg INTEGER NOT NULL,
    notification_id TEXT,
    active INTEGER NOT NULL DEFAULT 1
  );
`;
