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

// Rutina de Hipertrofia v3 (rutina_gimnasio_v3.md) — Torso / Pierna / Ligero / Torso / Pierna,
// 2x por grupo muscular / semana. Nota: sin acentos en los nombres, por convencion del proyecto
// (evita un problema de mojibake visto antes en progress.tsx).
export const EXERCISES: ExerciseSeed[] = [
  // ===== Torso A: Empuje Horizontal + Jalon =====
  { nombre: 'Press de banca con barra', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Retraccion y depresion escapular. Tocar el pecho de forma controlada sin rebotar.', unidad_preferida: 'kg' },
  { nombre: 'Remo con apoyo en pecho', grupo_muscular: 'Espalda', equipo: 'maquina', sesion: 'Torso A', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Codos dirigidos hacia el bolsillo trasero. Estiramiento completo en la fase excentrica.', unidad_preferida: 'placas' },
  { nombre: 'Jalon al pecho (neutro o supino)', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso A', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Codos dirigidos verticalmente hacia el suelo. Extension y estiramiento completo arriba.', unidad_preferida: 'placas' },
  { nombre: 'Apertura en pec deck o cruce en polea', grupo_muscular: 'Pecho', equipo: 'maquina', sesion: 'Torso A', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Mantener angulo fijo del codo. Movimiento de abrazo, no empuje.', unidad_preferida: 'placas' },
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso A', orden: 5, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Guiar con el codo. Controlar la fase excentrica de bajada.', unidad_preferida: 'kg' },
  { nombre: 'Curl inclinado con mancuernas', grupo_muscular: 'Biceps', equipo: 'libre', sesion: 'Torso A', orden: 6, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Brazos colgando detras del torso para enfatizar cabeza larga. Estiramiento profundo. Superserie con extension de triceps sobre la cabeza.', unidad_preferida: 'kg', superset_group: 'torso-a-brazos' },
  { nombre: 'Extension de triceps sobre la cabeza', grupo_muscular: 'Triceps', equipo: 'libre', sesion: 'Torso A', orden: 7, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 120, notas_tecnica: 'Codos apuntando al techo y fijos. Manos bajan por detras de la cabeza. Superserie con curl inclinado.', unidad_preferida: 'kg', superset_group: 'torso-a-brazos' },

  // ===== Pierna A: Enfasis Cuadriceps =====
  { nombre: 'Sentadilla con barra alta o hack', grupo_muscular: 'Cuadriceps', equipo: 'libre', sesion: 'Pierna A', orden: 1, series_objetivo: 4, reps_min: 5, reps_max: 8, rir_min: 2, rir_max: 3, descanso_seg: 180, notas_tecnica: 'Profundidad completa. La trayectoria de las rodillas sigue la linea de las puntas de los pies.', unidad_preferida: 'kg' },
  { nombre: 'Prensa de pierna', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 2, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Bajar profundo sin despegar ni flexionar la pelvis (sin retroversion pelvica).', unidad_preferida: 'placas' },
  { nombre: 'Extension de cuadriceps', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna A', orden: 3, series_objetivo: 3, reps_min: 12, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Reclinar el respaldo hacia atras lo maximo posible para maximizar el estiramiento del recto femoral.', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna A', orden: 4, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Torso inclinado ligeramente hacia adelante. Priorizar maquina sentada frente a tumbada.', unidad_preferida: 'placas' },
  { nombre: 'Gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna A', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Rodilla en extension completa. Pausa isometrica de 1 s en maxima elongacion. No flexionar rodillas por fatiga.', unidad_preferida: 'placas' },
  { nombre: 'Crunch en polea', grupo_muscular: 'Abdomen', equipo: 'polea', sesion: 'Pierna A', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Flexion activa de columna vertebral, aislando el trabajo de cadera.', unidad_preferida: 'placas' },

  // ===== Dia Ligero: Musculos de Recuperacion Rapida =====
  { nombre: 'Elevaciones laterales', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Ligero', orden: 1, series_objetivo: 5, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Mancuerna o polea. Guiar el movimiento liderando con los codos.', unidad_preferida: 'kg' },
  { nombre: 'Pec deck invertido', grupo_muscular: 'Hombros', equipo: 'maquina', sesion: 'Ligero', orden: 2, series_objetivo: 4, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Detener la contraccion al llegar a la altura del hombro para evitar compensacion de trapecio medio.', unidad_preferida: 'placas' },
  { nombre: 'Pajaros en banco inclinado', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Ligero', orden: 3, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pecho firmemente apoyado contra el respaldo. Apertura guiada por los codos.', unidad_preferida: 'kg' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Ligero', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pausa isometrica arriba. Evitar rotacion escapular/hombros.', unidad_preferida: 'kg' },
  { nombre: 'Curl de muneca con mancuernas', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 5, series_objetivo: 3, reps_min: 12, reps_max: 20, rir_min: 0, rir_max: 1, descanso_seg: 0, notas_tecnica: 'Permitir que la mancuerna ruede controladamente hacia las yemas de los dedos en la fase excentrica. Superserie con curl inverso.', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },
  { nombre: 'Curl inverso', grupo_muscular: 'Antebrazos', equipo: 'libre', sesion: 'Ligero', orden: 6, series_objetivo: 3, reps_min: 12, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 60, notas_tecnica: 'Munecas firmes y estables, sin balanceo corporal. Superserie con curl de muneca.', unidad_preferida: 'kg', superset_group: 'ligero-antebrazo' },
  { nombre: 'Gemelos de pie', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Ligero', orden: 7, series_objetivo: 4, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Rodilla en extension completa. Rango de movimiento articular completo.', unidad_preferida: 'placas' },
  { nombre: 'Crunch en polea', grupo_muscular: 'Abdomen', equipo: 'polea', sesion: 'Ligero', orden: 8, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 1, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Progresar incrementando carga externa, no inflando el volumen de repeticiones.', unidad_preferida: 'placas' },

  // ===== Torso B: Empuje Vertical / Inclinado + Jalon =====
  { nombre: 'Fondos en paralelas lastrados', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 180, notas_tecnica: 'Inclinacion de torso a 30 grados para activacion pectoral. Hombros deprimidos.', unidad_preferida: 'bw' },
  { nombre: 'Dominadas o jalon prono', grupo_muscular: 'Espalda', equipo: 'libre', sesion: 'Torso B', orden: 2, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 150, notas_tecnica: 'Sin inercia ni balanceo. Rango completo hasta estirar dorsales en la parte baja.', unidad_preferida: 'bw' },
  { nombre: 'Press inclinado con mancuernas', grupo_muscular: 'Pecho', equipo: 'libre', sesion: 'Torso B', orden: 3, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Inclinacion del banco a 30 grados maximo. Maximo estiramiento en la posicion baja.', unidad_preferida: 'kg' },
  { nombre: 'Remo en polea baja (agarre estrecho)', grupo_muscular: 'Espalda', equipo: 'polea', sesion: 'Torso B', orden: 4, series_objetivo: 3, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Permitir protraccion escapular completa al final de la fase excentrica.', unidad_preferida: 'placas' },
  { nombre: 'Press militar sentado', grupo_muscular: 'Hombros', equipo: 'libre', sesion: 'Torso B', orden: 5, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Core y abdomen compactos para evitar hiperextension lumbar.', unidad_preferida: 'kg' },
  { nombre: 'Curl predicador', grupo_muscular: 'Biceps', equipo: 'maquina', sesion: 'Torso B', orden: 6, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 0, notas_tecnica: 'Mantener los brazos firmemente apoyados en el banco durante todo el recorrido. Superserie con press frances.', unidad_preferida: 'placas', superset_group: 'torso-b-brazos' },
  { nombre: 'Press frances con barra Z', grupo_muscular: 'Triceps', equipo: 'libre', sesion: 'Torso B', orden: 7, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 120, notas_tecnica: 'La barra debe descender por detras del plano de la cabeza para mayor elongacion del triceps. Superserie con curl predicador.', unidad_preferida: 'kg', superset_group: 'torso-b-brazos' },

  // ===== Pierna B: Enfasis Cadena Posterior / Cadera =====
  { nombre: 'Peso muerto rumano', grupo_muscular: 'Isquios', equipo: 'libre', sesion: 'Pierna B', orden: 1, series_objetivo: 4, reps_min: 6, reps_max: 10, rir_min: 2, rir_max: 2, descanso_seg: 180, notas_tecnica: 'Dominancia de bisagra de cadera hacia atras. Columna neutra estricta.', unidad_preferida: 'kg' },
  { nombre: 'Sentadilla hack o prensa', grupo_muscular: 'Cuadriceps', equipo: 'maquina', sesion: 'Pierna B', orden: 2, series_objetivo: 4, reps_min: 10, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Recorrido articular completo y controlado.', unidad_preferida: 'placas' },
  { nombre: 'Curl femoral sentado', grupo_muscular: 'Isquios', equipo: 'maquina', sesion: 'Pierna B', orden: 3, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Torso inclinado al frente para mayor estiramiento isquiosural. Evitar maquina tumbada.', unidad_preferida: 'placas' },
  { nombre: 'Empuje de cadera (Hip Thrust)', grupo_muscular: 'Gluteo', equipo: 'libre', sesion: 'Pierna B', orden: 4, series_objetivo: 3, reps_min: 8, reps_max: 12, rir_min: 1, rir_max: 2, descanso_seg: 120, notas_tecnica: 'Bloqueo activo y contraccion glutea en la cima sin hiperextender la zona lumbar.', unidad_preferida: 'kg' },
  { nombre: 'Gemelos de pie o en prensa', grupo_muscular: 'Pantorrillas', equipo: 'maquina', sesion: 'Pierna B', orden: 5, series_objetivo: 4, reps_min: 8, reps_max: 12, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pausa isometrica en elongacion maxima. Rodillas totalmente extendidas.', unidad_preferida: 'placas' },
  { nombre: 'Encogimientos de hombros', grupo_muscular: 'Trapecio', equipo: 'libre', sesion: 'Pierna B', orden: 6, series_objetivo: 3, reps_min: 10, reps_max: 15, rir_min: 0, rir_max: 1, descanso_seg: 90, notas_tecnica: 'Pausa isometrica en contraccion maxima arriba.', unidad_preferida: 'kg' },
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
