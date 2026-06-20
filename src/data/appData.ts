export const user = {
  name: 'Usuario',
  peso: 78.5,
  talla: 170,
  edad: 22,
  cintura: 85,
  fcMax: 193,
};

export const hoy = {
  fecha: 'Mar, 9 jun',
  sesion: 'PIERNA A',
  diasSemana: ['Torso A', 'Pierna A', 'Ligero', 'Descanso', 'Torso B', 'Pierna B', 'Descanso'],
  water: { ml: 1800, target: 3200 },
  pesoHoy: null as number | null,
  pesoUltimo: { val: 78.5, dias: 2, tendencia: -0.3 },
};

export interface Exercise {
  id: number;
  nombre: string;
  grupoMuscular: string;
  series: number;
  reps: [number, number];
  rir: [number, number];
  descansoSeg: number;
  ultimoPeso: number;
  ultimoReps: number;
  ultimoFecha: string;
  esBodyweight?: boolean;
}

export const piernaA: Exercise[] = [
  { id: 1, nombre: 'Sentadilla con barra', grupoMuscular: 'Cuádriceps', series: 4, reps: [5, 8], rir: [2, 3], descansoSeg: 180, ultimoPeso: 82.5, ultimoReps: 6, ultimoFecha: 'hace 7 días' },
  { id: 2, nombre: 'Prensa de pierna', grupoMuscular: 'Cuádriceps', series: 3, reps: [10, 15], rir: [1, 2], descansoSeg: 120, ultimoPeso: 120, ultimoReps: 13, ultimoFecha: 'hace 7 días' },
  { id: 3, nombre: 'Extensión de cuádriceps', grupoMuscular: 'Cuádriceps', series: 3, reps: [12, 15], rir: [0, 1], descansoSeg: 90, ultimoPeso: 55, ultimoReps: 14, ultimoFecha: 'hace 7 días' },
  { id: 4, nombre: 'Curl femoral sentado', grupoMuscular: 'Isquios', series: 3, reps: [10, 15], rir: [1, 2], descansoSeg: 90, ultimoPeso: 40, ultimoReps: 12, ultimoFecha: 'hace 7 días' },
  { id: 5, nombre: 'Elevación de gemelos', grupoMuscular: 'Pantorrillas', series: 4, reps: [8, 12], rir: [0, 1], descansoSeg: 90, ultimoPeso: 90, ultimoReps: 10, ultimoFecha: 'hace 7 días' },
  { id: 6, nombre: 'Elevación de piernas', grupoMuscular: 'Abdomen', series: 3, reps: [10, 15], rir: [1, 1], descansoSeg: 60, ultimoPeso: 0, ultimoReps: 12, ultimoFecha: 'hace 7 días', esBodyweight: true },
];

export const macros = {
  entrenoDia: { kcal: 2450, p: 160, c: 300, f: 70 },
  descansoDia: { kcal: 2300, p: 160, c: 265, f: 70 },
  logHoy: {
    kcal: 850,
    p: 41,
    c: 85,
    f: 39,
    comidas: [
      { nombre: 'Licuado de avena + plátano', kcal: 430, p: 22, c: 62, f: 14, tipo: 'Desayuno' },
      { nombre: 'Huevos cocidos (×3)', kcal: 210, p: 19, c: 2, f: 14, tipo: 'Desayuno' },
      { nombre: 'Crema de cacahuate (1 cda)', kcal: 95, p: 4, c: 3, f: 8, tipo: 'Desayuno' },
      { nombre: 'Chía molida (1 cda)', kcal: 58, p: 2, c: 6, f: 3, tipo: 'Desayuno' },
    ],
  },
};

export interface Alimento {
  nombre: string;
  kcal: number;
  p: number;
  c: number;
  f: number;
}

export const alimentos: Alimento[] = [
  { nombre: 'Avena con leche', kcal: 320, p: 14, c: 48, f: 8 },
  { nombre: 'Huevo revuelto x3', kcal: 210, p: 18, c: 2, f: 14 },
  { nombre: 'Pollo deshebrado', kcal: 180, p: 34, c: 0, f: 4 },
  { nombre: 'Arroz cocido (1 taza)', kcal: 200, p: 4, c: 44, f: 1 },
  { nombre: 'Frijoles de la olla', kcal: 160, p: 10, c: 28, f: 1 },
  { nombre: 'Tinga de pollo', kcal: 290, p: 38, c: 12, f: 9 },
  { nombre: 'Soya texturizada', kcal: 130, p: 22, c: 8, f: 2 },
  { nombre: 'Queso panela 60g', kcal: 155, p: 12, c: 2, f: 11 },
];

export const menuSemana = [
  { dia: 'Lun', comida: 'Tinga de pollo + arroz', kcal: 955, p: 67 },
  { dia: 'Mar', comida: 'Bowl proteico + panela', kcal: 865, p: 56 },
  { dia: 'Mié', comida: 'Lentejas guisadas + huevo', kcal: 800, p: 50 },
  { dia: 'Jue', comida: 'Albóndigas de soya + arroz', kcal: 815, p: 53 },
  { dia: 'Vie', comida: 'Pollo con calabaza + arroz', kcal: 825, p: 59 },
  { dia: 'Sáb', comida: 'Pollo al horno con papa', kcal: 820, p: 60 },
  { dia: 'Dom', comida: 'Fajitas de pollo + frijoles', kcal: 865, p: 78 },
];

export const pesoSemanas = [
  { sem: 'Sem −4', avg: 79.6, dias: [79.8, 79.5, 79.7, 79.4, null, 79.6, null] },
  { sem: 'Sem −3', avg: 79.3, dias: [79.2, 79.5, 79.3, 79.1, null, 79.4, null] },
  { sem: 'Sem −2', avg: 79.0, dias: [79.1, 79.2, 78.9, 78.9, null, 79.0, null] },
  { sem: 'Sem −1', avg: 78.8, dias: [78.9, 78.7, 78.8, 78.6, null, 79.0, null] },
  { sem: 'Esta sem', avg: 78.5, dias: [78.6, 78.5, null, null, null, null, null] },
];

export const cinturaSemanas = [87, 86.5, 86, 85.5, 85];

export const fuerzaSentadilla = [
  { fecha: '22 abr', peso: 70, reps: 8 },
  { fecha: '29 abr', peso: 72.5, reps: 7 },
  { fecha: '6 may', peso: 75, reps: 7 },
  { fecha: '13 may', peso: 77.5, reps: 6 },
  { fecha: '20 may', peso: 80, reps: 6 },
  { fecha: '27 may', peso: 80, reps: 7 },
  { fecha: '3 jun', peso: 82.5, reps: 6 },
];

export interface ZonaFc {
  zona: string;
  nombre: string;
  min: number;
  max: number;
  color: string;
}

export const zonasFc: ZonaFc[] = [
  { zona: 'Z1', nombre: 'Muy suave', min: 0, max: 115, color: '#6b8fd4' },
  { zona: 'Z2', nombre: 'Aeróbica', min: 116, max: 135, color: '#5bbdce' },
  { zona: 'Z3', nombre: 'Moderado', min: 136, max: 155, color: '#8fcc6b' },
  { zona: 'Z4', nombre: 'Alto', min: 156, max: 175, color: '#e8a84a' },
  { zona: 'Z5', nombre: 'Máximo', min: 176, max: 198, color: '#e05a4a' },
];

export const cardioHoy = null;

export const proximasSesiones = ['Torso B', 'Pierna B', 'Descanso'];
