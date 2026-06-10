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
  { nombre: 'Sentadilla con barra', grupo_muscular: 'Cuádriceps', equipo: 'libre', sesion: 'Pierna A', series_objetivo: 4, reps_min: 5, reps_max: 8, rir_objetivo: 2, descanso_seg: 180, notas_tecnica: 'Rodillas alineadas con pies, pecho arriba' },
  { nombre: 'Prensa de pierna', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Pies separados a lo ancho de hombros' },
  { nombre: 'Extensión de cuádriceps', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 12, reps_max: 15, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Contracción completa al tope' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: 'Rango completo, sin rebote' },
  { nombre: 'Elevación de gemelos', grupo_muscular: 'Pantorrillas', equipo: 'máquina', sesion: 'Pierna A', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 0, descanso_seg: 90, notas_tecnica: 'Pausa 1 seg abajo, subir explosivo' },
  { nombre: 'Elevación de piernas', grupo_muscular: 'Abdomen', equipo: 'libre', sesion: 'Pierna A', series_objetivo: 3, reps_min: 10, reps_max: 15, rir_objetivo: 1, descanso_seg: 60, notas_tecnica: null },
  { nombre: 'Press de banca plano', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', series_objetivo: 4, reps_min: 6, reps_max: 10, rir_objetivo: 2, descanso_seg: 180, notas_tecnica: 'Escápulas retraídas, arco natural' },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Codos a 45°, no flares' },
  { nombre: 'Jalón al pecho agarre cerrado', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Codos hacia caderas' },
  { nombre: 'Remo en polea baja', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: null },
  { nombre: 'Curl con barra', grupo_muscular: 'Bíceps', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: null },
  { nombre: 'Press francés', grupo_muscular: 'Tríceps', equipo: 'libre', sesion: 'Torso A', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 90, notas_tecnica: null },
  { nombre: 'Press de hombros con mancuernas', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 2, descanso_seg: 120, notas_tecnica: null },
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', series_objetivo: 4, reps_min: 12, reps_max: 16, rir_objetivo: 0, descanso_seg: 60, notas_tecnica: 'Codo ligeramente doblado, no balanceo' },
  { nombre: 'Peso muerto rumano', grupo_muscular: 'Isquios', equipo: 'libre', sesion: 'Pierna B', series_objetivo: 4, reps_min: 8, reps_max: 12, rir_objetivo: 2, descanso_seg: 180, notas_tecnica: 'Cadera atrás, espalda neutral' },
  { nombre: 'Leg press', grupo_muscular: 'Cuádriceps', equipo: 'máquina', sesion: 'Pierna B', series_objetivo: 3, reps_min: 12, reps_max: 16, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: null },
  { nombre: 'Hip thrust', grupo_muscular: 'Glúteo', equipo: 'libre', sesion: 'Pierna B', series_objetivo: 3, reps_min: 10, reps_max: 14, rir_objetivo: 1, descanso_seg: 120, notas_tecnica: 'Contracción glútea al tope' },
  { nombre: 'Plancha', grupo_muscular: 'Abdomen', equipo: 'libre', sesion: 'Día Ligero', series_objetivo: 3, reps_min: 30, reps_max: 60, rir_objetivo: 1, descanso_seg: 60, notas_tecnica: 'Segundos de hold, no rkees' },
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
  const countResult = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (countResult && countResult.count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const ex of EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (nombre, grupo_muscular, equipo, sesion, series_objetivo, reps_min, reps_max, rir_objetivo, descanso_seg, notas_tecnica)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ex.nombre, ex.grupo_muscular, ex.equipo, ex.sesion, ex.series_objetivo, ex.reps_min, ex.reps_max, ex.rir_objetivo, ex.descanso_seg, ex.notas_tecnica]
      );
    }

    for (const food of FOODS) {
      await db.runAsync(
        `INSERT INTO foods (nombre, kcal_100g, proteina_100g, carbos_100g, grasa_100g, precio_aprox_mxn)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [food.nombre, food.kcal_100g, food.proteina_100g, food.carbos_100g, food.grasa_100g, food.precio_aprox_mxn]
      );
    }

    await db.runAsync(
      `INSERT INTO nutrition_targets (tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g) VALUES (?, ?, ?, ?, ?)`,
      ['entreno', 2450, 160, 300, 70]
    );
    await db.runAsync(
      `INSERT INTO nutrition_targets (tipo_dia, kcal_objetivo, proteina_g, carbos_g, grasa_g) VALUES (?, ?, ?, ?, ?)`,
      ['descanso', 2300, 160, 265, 70]
    );
  });
}
