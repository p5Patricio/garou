import type { SQLiteDatabase } from 'expo-sqlite';

interface ExerciseSeed {
  nombre: string;
  grupo_muscular: string;
  equipo: string;
  sesion: string;
  series_objetivo: number;
  reps_min: number;
  reps_max: number;
  rir_objetivo: number;
  descanso_seg: number;
  notas_tecnica: string | null;
}

const EXERCISES: ExerciseSeed[] = [
  // ── TORSO A ────────────────────────────────────────────────────────────────
  { nombre: 'Press de banca con barra', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', series_objetivo: 4, reps_min: 5, reps_max: 8, rir_objetivo: 2, descanso_seg: 150, notas_tecnica: 'Escápulas retraídas, arco natural' },
  { nombre: 'Remo con apoyo en pecho', grupo_muscular: 'Espalda', equipo: 'máquina', sesion: 'Torso A', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Máquina o seal row — codos hacia caderas, retracción escapular' },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Codos a 45°, no flares' },
  { nombre: 'Jalón al pecho', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 12, rir_objetivo: 1, descanso_seg: 105, notas_tecnica: 'Agarre neutro o supino — codos hacia caderas' },
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 12, reps_max: 20, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Codo ligeramente doblado, sin balanceo' },
  { nombre: 'Curl con barra Z', grupo_muscular: 'Bíceps', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'SS con Extensión de tríceps en polea — alternar sin descanso entre ellos' },
  { nombre: 'Extensión de tríceps en polea', grupo_muscular: 'Tríceps', equipo: 'polea', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'SS con Curl con barra Z — descansar al cerrar el par' },

  // ── PIERNA A ───────────────────────────────────────────────────────────────
  { nombre: 'Sentadilla con barra', grupo_muscular: 'Cuádriceps', equipo: 'libre', sesion: 'Pierna A', series_objetivo: 4, reps_min: 5, reps_max: 8, rir_objetivo: 2, descanso_seg: 180, notas_tecnica: 'Alta o hack — rodillas alineadas con pies, pecho arriba' },
  { nombre: 'Prensa de pierna', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Pies separados a lo ancho de hombros' },
  { nombre: 'Extensión de cuádriceps', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 12, reps_max: 15, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Contracción completa al tope' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'Rango completo, sin rebote' },
  { nombre: 'Elevación de gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Pausa 1 seg abajo, subir explosivo' },
  { nombre: 'Elevación de piernas colgado', grupo_muscular: 'Abdomen', equipo: 'libre', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'O crunch en polea' },

  // ── DÍA LIGERO ─────────────────────────────────────────────────────────────
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Ligero', series_objetivo: 4, reps_min: 12, reps_max: 20, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Mancuerna o polea — codo ligeramente doblado, todo ligero' },
  { nombre: 'Pec deck invertido / pájaros', grupo_muscular: 'Hombros', equipo: 'máquina', sesion: 'Ligero', series_objetivo: 4, reps_min: 12, reps_max: 20, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Deltoides posterior — rango completo, sin trampa' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Ligero', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Barra o mancuernas — pausa arriba' },
  { nombre: 'Curl de muñeca', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', series_objetivo: 3, reps_min: 12, reps_max: 20, rir_objetivo: 0, descanso_seg: 60, notas_tecnica: 'SS con Curl inverso — alternar sin descanso entre ellos' },
  { nombre: 'Curl inverso', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', series_objetivo: 3, reps_min: 12, reps_max: 15, rir_objetivo: 0, descanso_seg: 60, notas_tecnica: 'SS con Curl de muñeca — descansar al cerrar el par' },
  { nombre: 'Elevación de gemelos sentado', grupo_muscular: 'Pantorrillas', equipo: 'máquina', sesion: 'Ligero', series_objetivo: 4, reps_min: 12, reps_max: 20, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Sóleo — pausa abajo, todo ligero' },
  { nombre: 'Crunch en polea', grupo_muscular: 'Abdomen', equipo: 'polea', sesion: 'Ligero', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'O plancha lastrada — opcional' },

  // ── TORSO B ────────────────────────────────────────────────────────────────
  { nombre: 'Press militar sentado', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', series_objetivo: 4, reps_min: 6, reps_max: 10, rir_objetivo: 2, descanso_seg: 150, notas_tecnica: 'Mancuernas o barra — núcleo apretado' },
  { nombre: 'Dominadas / Jalón prono', grupo_muscular: 'Espalda', equipo: 'libre', sesion: 'Torso B', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Lastradas o asistidas según nivel' },
  { nombre: 'Press de pecho en máquina', grupo_muscular: 'Pecho', equipo: 'máquina', sesion: 'Torso B', series_objetivo: 3, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'O fondos en paralelas' },
  { nombre: 'Remo en polea baja', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso B', series_objetivo: 3, reps_min: 10, reps_max: 12, rir_objetivo: 1, descanso_seg: 105, notas_tecnica: 'Agarre estrecho' },
  { nombre: 'Curl predicador / inclinado', grupo_muscular: 'Bíceps', equipo: 'máquina', sesion: 'Torso B', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'SS con Press cerrado/ext. sobre cabeza — alternar sin descanso' },
  { nombre: 'Press cerrado / ext. sobre la cabeza', grupo_muscular: 'Tríceps', equipo: 'libre', sesion: 'Torso B', series_objetivo: 3, reps_min: 8, reps_max: 12, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'SS con Curl predicador — descansar al cerrar el par' },

  // ── PIERNA B ───────────────────────────────────────────────────────────────
  { nombre: 'Peso muerto rumano', grupo_muscular: 'Isquios', equipo: 'libre', sesion: 'Pierna B', series_objetivo: 4, reps_min: 6, reps_max: 10, rir_objetivo: 2, descanso_seg: 150, notas_tecnica: 'O hexagonal — cadera atrás, espalda neutral, técnica impecable' },
  { nombre: 'Sentadilla hack o prensa', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna B', series_objetivo: 3, reps_min: 10, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Énfasis cuádriceps' },
  { nombre: 'Curl femoral tumbado', grupo_muscular: 'Isquios', equipo: 'máquina', sesion: 'Pierna B', series_objetivo: 3, reps_min: 10, reps_max: 12, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Rango completo' },
  { nombre: 'Empuje de cadera (hip thrust)', grupo_muscular: 'Glúteo', equipo: 'libre', sesion: 'Pierna B', series_objetivo: 3, reps_min: 8, reps_max: 12, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Contracción glútea al tope' },
  { nombre: 'Elevación de gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'máquina', sesion: 'Pierna B', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'O burro — pausa abajo' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Pierna B', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Barra o mancuernas — pausa arriba' },
];

interface FoodSeed {
  nombre: string;
  kcal_100g: number;
  proteina_100g: number;
  carbos_100g: number;
  grasa_100g: number;
  precio_aprox_mxn: number | null;
}

const FOODS: FoodSeed[] = [
  { nombre: 'Avena', kcal_100g: 389, proteina_100g: 17, carbos_100g: 66, grasa_100g: 7, precio_aprox_mxn: 35 },
  { nombre: 'Leche entera', kcal_100g: 61, proteina_100g: 3.2, carbos_100g: 4.8, grasa_100g: 3.3, precio_aprox_mxn: 22 },
  { nombre: 'Huevo entero', kcal_100g: 143, proteina_100g: 12.6, carbos_100g: 1.1, grasa_100g: 9.5, precio_aprox_mxn: 40 },
  { nombre: 'Pechuga de pollo cocida', kcal_100g: 165, proteina_100g: 31, carbos_100g: 0, grasa_100g: 3.6, precio_aprox_mxn: 85 },
  { nombre: 'Arroz blanco cocido', kcal_100g: 130, proteina_100g: 2.7, carbos_100g: 28, grasa_100g: 0.3, precio_aprox_mxn: 18 },
  { nombre: 'Frijoles negros cocidos', kcal_100g: 132, proteina_100g: 8.9, carbos_100g: 24, grasa_100g: 0.5, precio_aprox_mxn: 25 },
  { nombre: 'Soya texturizada', kcal_100g: 330, proteina_100g: 52, carbos_100g: 30, grasa_100g: 3, precio_aprox_mxn: 45 },
  { nombre: 'Queso panela', kcal_100g: 258, proteina_100g: 20, carbos_100g: 3.5, grasa_100g: 19, precio_aprox_mxn: 55 },
  { nombre: 'Plátano', kcal_100g: 89, proteina_100g: 1.1, carbos_100g: 23, grasa_100g: 0.3, precio_aprox_mxn: 12 },
  { nombre: 'Crema de cacahuate natural', kcal_100g: 588, proteina_100g: 25, carbos_100g: 20, grasa_100g: 50, precio_aprox_mxn: 95 },
  { nombre: 'Chía', kcal_100g: 486, proteina_100g: 17, carbos_100g: 42, grasa_100g: 31, precio_aprox_mxn: 65 },
  { nombre: 'Lentejas cocidas', kcal_100g: 116, proteina_100g: 9, carbos_100g: 20, grasa_100g: 0.4, precio_aprox_mxn: 22 },
  { nombre: 'Calabaza cocida', kcal_100g: 26, proteina_100g: 1, carbos_100g: 6.5, grasa_100g: 0.1, precio_aprox_mxn: 15 },
  { nombre: 'Papa cocida', kcal_100g: 77, proteina_100g: 2, carbos_100g: 17, grasa_100g: 0.1, precio_aprox_mxn: 12 },
  { nombre: 'Proteína de suero (whey)', kcal_100g: 370, proteina_100g: 74, carbos_100g: 8, grasa_100g: 7, precio_aprox_mxn: 450 },
];

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  // Read BEFORE any transaction — reads inside an open write transaction throw
  // "cannot start a transaction within a transaction" in expo-sqlite.
  const exerciseCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (exerciseCount && exerciseCount.count > 0) return;

  // Transaction 1: exercises only — no reads inside.
  await db.withTransactionAsync(async () => {
    for (const ex of EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (nombre, grupo_muscular, equipo, sesion, series_objetivo, reps_min, reps_max, rir_objetivo, descanso_seg, notas_tecnica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ex.nombre, ex.grupo_muscular, ex.equipo, ex.sesion, ex.series_objetivo, ex.reps_min, ex.reps_max, ex.rir_objetivo, ex.descanso_seg, ex.notas_tecnica]
      );
    }
  });

  // Read BETWEEN transactions — never inside one.
  const foodCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM foods');
  if (!foodCount || foodCount.count === 0) {
    // Transaction 2: foods + nutrition targets — no reads inside.
    await db.withTransactionAsync(async () => {
      for (const food of FOODS) {
        await db.runAsync(
          `INSERT INTO foods (nombre, kcal_100g, proteina_100g, carbos_100g, grasa_100g, precio_aprox_mxn)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [food.nombre, food.kcal_100g, food.proteina_100g, food.carbos_100g, food.grasa_100g, food.precio_aprox_mxn]
        );
      }

      await db.runAsync(
        `INSERT OR IGNORE INTO nutrition_targets (tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g) VALUES (?, ?, ?, ?, ?)`,
        ['entreno', 2450, 160, 300, 70]
      );
      await db.runAsync(
        `INSERT OR IGNORE INTO nutrition_targets (tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g) VALUES (?, ?, ?, ?, ?)`,
        ['descanso', 2300, 160, 265, 70]
      );
    });
  }
}
