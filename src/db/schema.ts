export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS exercises (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    grupo_muscular TEXT NOT NULL,
    equipo TEXT NOT NULL,
    sesion TEXT NOT NULL,
    series_objetivo INTEGER NOT NULL,
    reps_min INTEGER NOT NULL,
    reps_max INTEGER NOT NULL,
    rir_objetivo INTEGER NOT NULL,
    descanso_seg INTEGER NOT NULL,
    notas_tecnica TEXT
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo_sesion TEXT NOT NULL,
    duracion_min INTEGER,
    notas TEXT,
    completada INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS set_logs (
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
  );

  CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    kcal_100g REAL NOT NULL,
    proteina_100g REAL NOT NULL,
    carbos_100g REAL NOT NULL,
    grasa_100g REAL NOT NULL,
    precio_aprox_mxn REAL
  );

  CREATE TABLE IF NOT EXISTS nutrition_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    num_comida INTEGER NOT NULL,
    food_id INTEGER NOT NULL,
    gramos REAL NOT NULL,
    FOREIGN KEY (food_id) REFERENCES foods(id)
  );

  CREATE TABLE IF NOT EXISTS nutrition_targets (
    tipo_dia TEXT PRIMARY KEY,
    kcal_objetivo INTEGER NOT NULL,
    proteina_g INTEGER NOT NULL,
    carbos_g INTEGER NOT NULL,
    grasa_g INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS body_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    peso_kg REAL,
    cintura_cm REAL,
    foto_uri TEXT
  );

  CREATE TABLE IF NOT EXISTS cardio_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    tipo TEXT NOT NULL,
    minutos INTEGER NOT NULL,
    fc_promedio_ppm INTEGER,
    zona INTEGER
  );

  CREATE TABLE IF NOT EXISTS watch_daily (
    fecha TEXT PRIMARY KEY,
    pasos INTEGER,
    fc_reposo_ppm INTEGER,
    horas_sueno REAL,
    hrv INTEGER,
    calorias_activas INTEGER
  );

  CREATE TABLE IF NOT EXISTS water_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    ml INTEGER NOT NULL
  );
`;
