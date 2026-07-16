import type { SQLiteDatabase } from 'expo-sqlite';

type LoadUnit = 'kg' | 'placas' | 'lb' | 'bw';

interface ExerciseSeed {
  nombre: string;
  grupo_muscular: string;
  equipo: string;
  sesion: string;
  orden: number;
  series_objetivo: number;
  reps_min: number;
  reps_max: number;
  rir_min: number;
  rir_max: number;
  descanso_seg: number;
  notas_tecnica: string | null;
  unidad_preferida: LoadUnit;
  superset_group?: string | null;
}

const EXERCISES: ExerciseSeed[] = [
  { nombre: 'Press de banca con barra', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Escapulas retraidas, arco natural', unidad_preferida: 'kg' },
  { nombre: 'Remo con apoyo en pecho', grupo_muscular: 'Espalda', equipo: 'maquina', sesion: 'Torso A', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Maquina o seal row; codos hacia caderas', unidad_preferida: 'placas' },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', orden: 3, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Codos a 45 grados, sin abrir de mas', unidad_preferida: 'kg' },
  { nombre: 'Jalon al pecho', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Agarre neutro o supino; codos hacia caderas', unidad_preferida: 'placas' },
  { nombre: 'Elevaciones laterales con mancuerna', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso A', orden: 5, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Codo ligeramente doblado, sin balanceo', unidad_preferida: 'kg' },
  { nombre: 'Curl con barra Z', grupo_muscular: 'Biceps', equipo: 'libre', sesion: 'Torso A', orden: 6, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 90, notas_tecnica: 'Superserie con extension de triceps en polea', unidad_preferida: 'kg', superset_group: 'torso-a-brazos' },
  { nombre: 'Extension de triceps en polea', grupo_muscular: 'Triceps', equipo: 'polea', sesion: 'Torso A', orden: 7, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Superserie con curl con barra Z', unidad_preferida: 'placas', superset_group: 'torso-a-brazos' },

  { nombre: 'Sentadilla con barra', grupo_muscular: 'Cuadriceps', equipo: 'libre', sesion: 'Pierna A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Barra alta o hack; rodillas alineadas', unidad_preferida: 'kg' },
  { nombre: 'Prensa de pierna', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 2, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Pies separados a lo ancho de hombros', unidad_preferida: 'placas' },
  { nombre: 'Extension de cuadriceps', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 3, series_objetivo: 3, reps_min: 12, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Contraccion completa arriba', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna A', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 2, descanso_seg: 90, notas_tecnica: 'Rango completo, sin rebote', unidad_preferida: 'placas' },
  { nombre: 'Elevacion de gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna A', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pausa abajo, subir fuerte', unidad_preferida: 'placas' },
  { nombre: 'Elevacion de piernas colgado', grupo_muscular: 'Abdomen', equipo: 'libre', sesion: 'Pierna A', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Alternativa: crunch en polea', unidad_preferida: 'bw' },

  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Ligero', orden: 1, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Mancuerna o polea; todo ligero', unidad_preferida: 'kg' },
  { nombre: 'Pec deck invertido / pajaros', grupo_muscular: 'Hombros', equipo: 'maquina', sesion: 'Ligero', orden: 2, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Deltoides posterior, rango completo', unidad_preferida: 'placas' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Ligero', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Barra o mancuernas; pausa arriba', unidad_preferida: 'kg' },
  { nombre: 'Curl de muneca', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 4, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 60, notas_tecnica: 'Superserie con curl inverso', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },
  { nombre: 'Curl inverso', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 5, series_objetivo: 3, reps_min: 12, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 60, notas_tecnica: 'Superserie con curl de muneca', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },
  { nombre: 'Elevacion de gemelos sentado', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Ligero', orden: 6, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Soleo; pausa abajo', unidad_preferida: 'placas' },
  { nombre: 'Crunch en polea', grupo_muscular: 'Abdomen', equipo: 'polea', sesion: 'Ligero', orden: 7, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Alternativa: plancha lastrada', unidad_preferida: 'placas' },

  { nombre: 'Press militar sentado', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 150, notas_tecnica: 'Mancuernas o barra; nucleo firme', unidad_preferida: 'kg' },
  { nombre: 'Dominadas / Jalon prono', grupo_muscular: 'Espalda', equipo: 'libre', sesion: 'Torso B', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Lastradas o asistidas segun nivel', unidad_preferida: 'bw' },
  { nombre: 'Press de pecho en maquina', grupo_muscular: 'Pecho', equipo: 'maquina', sesion: 'Torso B', orden: 3, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Alternativa: fondos en paralelas', unidad_preferida: 'placas' },
  { nombre: 'Remo en polea baja', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso B', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Agarre estrecho', unidad_preferida: 'placas' },
  { nombre: 'Curl predicador / inclinado', grupo_muscular: 'Biceps', equipo: 'maquina', sesion: 'Torso B', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 90, notas_tecnica: 'Superserie con press cerrado o extension', unidad_preferida: 'placas', superset_group: 'torso-b-brazos' },
  { nombre: 'Press cerrado / extension sobre cabeza', grupo_muscular: 'Triceps', equipo: 'libre', sesion: 'Torso B', orden: 6, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Superserie con curl predicador', unidad_preferida: 'kg', superset_group: 'torso-b-brazos' },

  { nombre: 'Peso muerto rumano', grupo_muscular: 'Isquios', equipo: 'libre', sesion: 'Pierna B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 180, notas_tecnica: 'Tecnica impecable; cadera atras', unidad_preferida: 'kg' },
  { nombre: 'Sentadilla hack o prensa', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna B', orden: 2, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Enfasis cuadriceps', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral tumbado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna B', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Rango completo', unidad_preferida: 'placas' },
  { nombre: 'Empuje de cadera', grupo_muscular: 'Gluteo', equipo: 'libre', sesion: 'Pierna B', orden: 4, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Contraccion glutea arriba', unidad_preferida: 'kg' },
  { nombre: 'Elevacion de gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna B', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Alternativa: burro; pausa abajo', unidad_preferida: 'placas' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Pierna B', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Barra o mancuernas; pausa arriba', unidad_preferida: 'kg' },
];

export async function seedDatabase(db: SQLiteDatabase): Promise<void> {
  const exerciseCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM exercises');
  if (exerciseCount && exerciseCount.count > 0) return;

  await db.withTransactionAsync(async () => {
    for (const ex of EXERCISES) {
      await db.runAsync(
        `INSERT INTO exercises (
          nombre, grupo_muscular, equipo, sesion, orden,
          series_objetivo, reps_min, reps_max, rir_min, rir_max, rir_objetivo,
          descanso_seg, notas_tecnica, unidad_preferida, superset_group
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ex.nombre,
          ex.grupo_muscular,
          ex.equipo,
          ex.sesion,
          ex.orden,
          ex.series_objetivo,
          ex.reps_min,
          ex.reps_max,
          ex.rir_min,
          ex.rir_max,
          ex.rir_min,
          ex.descanso_seg,
          ex.notas_tecnica,
          ex.unidad_preferida,
          ex.superset_group ?? null,
        ]
      );
    }
  });
}
