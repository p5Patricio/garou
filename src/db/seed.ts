import type { SQLiteDatabase } from 'expo-sqlite';

type LoadUnit = 'kg' | 'placas' | 'lb' | 'bw';

export interface ExerciseSeed {
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

// Rutina de Hipertrofia v4.1 (rutina_gimnasio_v4-1.pdf) — Torso / Pierna / Ligero / Torso / Pierna,
// 2x por grupo muscular / semana, 115 series/semana. Nota: sin acentos ni simbolo de grado en los
// nombres, por convencion del proyecto (evita un problema de mojibake visto antes en progress.tsx).
export const EXERCISES: ExerciseSeed[] = [
  // ===== Torso A: Empuje Horizontal + Jalon (23 series) =====
  { nombre: 'Press de banca con barra', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Escapulas atras. Baja a tocar, no a rebotar.', unidad_preferida: 'kg' },
  { nombre: 'Remo con apoyo en pecho', grupo_muscular: 'Espalda', equipo: 'maquina', sesion: 'Torso A', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Junta los omoplatos arriba. Estira completo abajo.', unidad_preferida: 'placas' },
  { nombre: 'Jalon al pecho (neutro o supino)', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Lleva los codos al suelo. Estira arriba. Superserie con apertura en pec deck.', unidad_preferida: 'placas', superset_group: 'torso-a-jalon' },
  { nombre: 'Apertura en pec deck o cruce en polea', grupo_muscular: 'Pecho', equipo: 'maquina', sesion: 'Torso A', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 120, notas_tecnica: 'El codo NO cambia de angulo. Abraza, no empujes. Superserie con jalon al pecho.', unidad_preferida: 'placas', superset_group: 'torso-a-jalon' },
  { nombre: 'Curl inclinado con mancuernas', grupo_muscular: 'Biceps', equipo: 'libre', sesion: 'Torso A', orden: 5, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Brazos colgando detras del torso para enfatizar cabeza larga. Estira abajo. Superserie con extension de triceps sobre la cabeza.', unidad_preferida: 'kg', superset_group: 'torso-a-brazos' },
  { nombre: 'Extension de triceps sobre la cabeza', grupo_muscular: 'Triceps', equipo: 'libre', sesion: 'Torso A', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 120, notas_tecnica: 'Codos al techo y quietos. Manos por detras. Superserie con curl inclinado.', unidad_preferida: 'kg', superset_group: 'torso-a-brazos' },
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso A', orden: 7, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Guia con el codo. Controla la bajada.', unidad_preferida: 'kg' },

  // ===== Pierna A: Enfasis Cuadriceps (21 series) =====
  { nombre: 'Sentadilla con barra alta o hack', grupo_muscular: 'Cuadriceps', equipo: 'libre', sesion: 'Pierna A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Profundidad completa. Rodillas siguen a los pies.', unidad_preferida: 'kg' },
  { nombre: 'Prensa de pierna', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 2, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Baja sin que se despegue la pelvis.', unidad_preferida: 'placas' },
  { nombre: 'Extension de cuadriceps', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 3, series_objetivo: 3, reps_min: 12, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Recuesta el respaldo todo lo que se pueda.', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna A', orden: 4, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Torso inclinado adelante. Nunca tumbado.', unidad_preferida: 'placas' },
  { nombre: 'Gemelos de pie (rodilla recta)', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna A', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Pausa 1 s abajo. No dobles la rodilla al fatigarte. Superserie con crunch en polea.', unidad_preferida: 'placas', superset_group: 'pierna-a-gemelos' },
  { nombre: 'Crunch en polea', grupo_muscular: 'Abdomen', equipo: 'polea', sesion: 'Pierna A', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Flexiona la columna, no la cadera. Unica dosis semanal de abdomen. Superserie con gemelos de pie.', unidad_preferida: 'placas', superset_group: 'pierna-a-gemelos' },

  // ===== Dia Ligero: Recuperacion Rapida + Brazos (27 series, todo en superserie) =====
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Ligero', orden: 1, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Mancuerna o polea, da igual. Guia con el codo. Superserie con encogimientos.', unidad_preferida: 'kg', superset_group: 'ligero-hombros-trap' },
  { nombre: 'Encogimientos en banco inclinado 45 grados', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Ligero', orden: 2, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pecho apoyado, ya no de pie: pega mas al trapecio medio. Superserie con elevaciones laterales.', unidad_preferida: 'kg', superset_group: 'ligero-hombros-trap' },
  { nombre: 'Pec deck invertido', grupo_muscular: 'Hombros', equipo: 'maquina', sesion: 'Ligero', orden: 3, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Unico ejercicio de posterior. Para a la altura del hombro. Superserie con gemelos de pie.', unidad_preferida: 'placas', superset_group: 'ligero-espalda-gemelos' },
  { nombre: 'Gemelos de pie (rodilla recta)', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Ligero', orden: 4, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Recorrido completo. Rodilla extendida siempre. Superserie con pec deck invertido.', unidad_preferida: 'placas', superset_group: 'ligero-espalda-gemelos' },
  { nombre: 'Curl martillo con mancuernas', grupo_muscular: 'Biceps', equipo: 'libre', sesion: 'Ligero', orden: 5, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Muneca neutra, sin balanceo. Braquial + braquiorradial. Superserie con extension de triceps en polea.', unidad_preferida: 'kg', superset_group: 'ligero-brazos' },
  { nombre: 'Extension de triceps en polea (cuerda)', grupo_muscular: 'Triceps', equipo: 'polea', sesion: 'Ligero', orden: 6, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Codos pegados al cuerpo. Abre la cuerda abajo. Superserie con curl martillo.', unidad_preferida: 'placas', superset_group: 'ligero-brazos' },
  { nombre: 'Curl de muneca (palmas arriba)', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 7, series_objetivo: 2, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Deja que rueden hacia los dedos. Solo mueve la muneca. Superserie con extension de muneca.', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },
  { nombre: 'Extension de muneca (palmas abajo)', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 8, series_objetivo: 2, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Mismo banco, giras el agarre. El martillo NO los cubre. Superserie con curl de muneca.', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },

  // ===== Torso B: Empuje Vertical / Inclinado + Jalon (23 series) =====
  { nombre: 'Fondos en paralelas lastrados', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 180, notas_tecnica: 'Torso inclinado 30 grados = pecho. Hombros abajo.', unidad_preferida: 'bw' },
  { nombre: 'Dominadas o jalon prono', grupo_muscular: 'Espalda', equipo: 'libre', sesion: 'Torso B', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 150, notas_tecnica: 'Sin balanceo. Baja hasta estirar.', unidad_preferida: 'bw' },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso B', orden: 3, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Banco a 30 grados, no mas. Siente el estiramiento. Superserie con remo en polea agarre ancho.', unidad_preferida: 'kg', superset_group: 'torso-b-empuje' },
  { nombre: 'Remo en polea (agarre ancho)', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso B', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Codos a 45-60 grados. Junta los omoplatos. Superserie con press inclinado.', unidad_preferida: 'placas', superset_group: 'torso-b-empuje' },
  { nombre: 'Press militar sentado', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', orden: 5, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Abdomen apretado para no arquear. Superserie con curl predicador.', unidad_preferida: 'kg', superset_group: 'torso-b-hombros-brazos' },
  { nombre: 'Curl predicador', grupo_muscular: 'Biceps', equipo: 'maquina', sesion: 'Torso B', orden: 6, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'No despegues el brazo del banco. Superserie con press militar.', unidad_preferida: 'placas', superset_group: 'torso-b-hombros-brazos' },
  { nombre: 'Press frances con barra Z', grupo_muscular: 'Triceps', equipo: 'libre', sesion: 'Torso B', orden: 7, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'La barra debe descender por detras del plano de la cabeza para mayor elongacion del triceps.', unidad_preferida: 'kg' },

  // ===== Pierna B: Enfasis Cadena Posterior / Cadera (21 series) =====
  { nombre: 'Peso muerto rumano', grupo_muscular: 'Isquios', equipo: 'libre', sesion: 'Pierna B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 180, notas_tecnica: 'Dominancia de bisagra de cadera hacia atras. Columna neutra estricta.', unidad_preferida: 'kg' },
  { nombre: 'Sentadilla hack o prensa', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna B', orden: 2, series_objetivo: 4, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Recorrido articular completo y controlado.', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna B', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Torso inclinado al frente para mayor estiramiento isquiosural. Evitar maquina tumbada.', unidad_preferida: 'placas' },
  { nombre: 'Empuje de cadera (Hip Thrust)', grupo_muscular: 'Gluteo', equipo: 'libre', sesion: 'Pierna B', orden: 4, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Aprieta el gluteo arriba, no arquees la lumbar.', unidad_preferida: 'kg' },
  { nombre: 'Gemelos de pie o en prensa (pierna recta)', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna B', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Pausa abajo. Rodilla extendida siempre. Superserie con abduccion de cadera.', unidad_preferida: 'placas', superset_group: 'pierna-b-gemelos-abduccion' },
  { nombre: 'Abduccion de cadera (maquina o polea)', grupo_muscular: 'Gluteo', equipo: 'maquina', sesion: 'Pierna B', orden: 6, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Gluteo medio: ni sentadilla ni hip thrust lo entrenan. Superserie con gemelos de pie.', unidad_preferida: 'placas', superset_group: 'pierna-b-gemelos-abduccion' },
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
