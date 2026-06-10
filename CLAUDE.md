# CLAUDE.md — Garou

> Este archivo es la memoria del proyecto para Claude Code. Léelo al inicio de cada sesión.

---

## Qué es este proyecto

App Android personal (un solo usuario) para registrar entrenamiento de hipertrofia, nutrición de recomposición corporal y métricas de progreso. Complementa los planes de entrenamiento y nutrición que están en `assets/data/`. No se publica en Play Store; se instala via APK (sideload).

---

## Stack técnico

- **Framework:** Expo (React Native), TypeScript, expo-router v3
- **Base de datos:** SQLite local con `expo-sqlite` (sin backend, sin nube)
- **Navegación:** expo-router con tab bar inferior (5 tabs)
- **Datos del reloj:** `react-native-health-connect` → Health Connect de Android → Samsung Health → Galaxy Watch 7 *(Fase 5, requiere build nativo)*
- **Build / distribución:** EAS Build, perfil `preview`, genera APK para sideload
- **Respaldo:** exportar/importar JSON con `expo-file-system` + `expo-sharing`

---

## Estructura de carpetas

```
garou/
├── CLAUDE.md
├── app/                    # expo-router: rutas/pantallas
│   ├── (tabs)/
│   │   ├── index.tsx       # Hoy (dashboard)
│   │   ├── train.tsx       # Entrenar
│   │   ├── eat.tsx         # Comer
│   │   ├── progress.tsx    # Progreso
│   │   └── settings.tsx    # Ajustes
│   └── _layout.tsx
├── src/
│   ├── db/                 # SQLite: schema, seed, migrations
│   │   ├── schema.ts
│   │   ├── seed.ts         # datos reales de la rutina y nutrición
│   │   └── index.ts        # inicialización de la BD
│   ├── hooks/              # useWorkout, useNutrition, useMetrics, useWatch
│   ├── components/         # componentes reutilizables
│   ├── screens/            # sub-pantallas / modales
│   ├── utils/              # cálculos: macros, promedios, zonas FC
│   ├── constants/          # colores, tipografía, zonas de FC
│   └── types/              # tipos TypeScript compartidos
├── assets/
│   └── data/
│       ├── rutina_hipertrofia.md       # ← fuente de verdad del entrenamiento
│       ├── plan_nutricion_hipertrofia.md  # ← fuente de verdad de la nutrición
│       └── plan_desarrollo_app.md
└── eas.json                # perfil preview → APK
```

---

## Modelo de datos (tablas SQLite)

```sql
-- Catálogo de ejercicios (sembrado con la rutina real)
exercises (
  id, nombre, grupo_muscular, equipo,  -- equipo: 'libre'|'máquina'|'polea'
  sesion,                              -- 'Torso A'|'Torso B'|'Pierna A'|'Pierna B'|'Ligero'
  series_objetivo, reps_min, reps_max, -- rango de reps (ej. 8–12)
  rir_objetivo,                        -- repeticiones en reserva objetivo
  descanso_seg,                        -- descanso entre series en segundos
  notas_tecnica                        -- cue clave de técnica
)

-- Sesiones de entrenamiento
workout_sessions (
  id, fecha, tipo_sesion, duracion_min, notas, completada
)

-- Series registradas
set_logs (
  id, session_id, exercise_id,
  num_serie, peso_kg, reps, rir_real, completada
)

-- Catálogo de alimentos (sembrado con el plan real)
foods (
  id, nombre,
  kcal_100g, proteina_100g, carbos_100g, grasa_100g,
  precio_aprox_mxn                     -- precio estimado en MXN, Guanajuato
)

-- Registro de comidas
nutrition_logs (
  id, fecha, num_comida,              -- num_comida: 1|2|3|(4)
  food_id, gramos
  -- kcal y macros se calculan al vuelo, nunca se almacenan
)

-- Objetivos de macros por tipo de día (sembrado)
nutrition_targets (
  tipo_dia,                           -- 'entreno'|'descanso'
  kcal_objetivo,                      -- entreno: ~2500 / descanso: ~2200
  proteina_g,                         -- siempre 160 g (ancla)
  carbos_g, grasa_g
)

-- Métricas corporales
body_metrics (
  id, fecha, peso_kg, cintura_cm, foto_uri
)

-- Registro de cardio
cardio_logs (
  id, fecha,
  tipo,                               -- 'bici'|'pasos'|'otro'
  minutos, fc_promedio_ppm, zona      -- zona: 1|2|3|4|5
)

-- Datos diarios del reloj (Health Connect) — Fase 5
watch_daily (
  fecha, pasos, fc_reposo_ppm,
  horas_sueno, hrv, calorias_activas
)

-- Registro de agua
water_logs (id, fecha, ml)
```

---

## Datos sembrados (seed) — fuentes

Los datos del seed se extraen de los documentos en `assets/data/`. Lee esos archivos para poblar:

- **`exercises`**: extraer todos los ejercicios de la rutina, con su sesión, series×reps, RIR objetivo, descanso y nota de técnica.
- **`foods`**: extraer los alimentos base del plan nutricional con sus macros por 100 g.
- **`nutrition_targets`**: objetivo ~2,350 kcal promedio / proteína 160 g / déficit moderado para recomposición. Día entreno ~2,500 kcal / día descanso ~2,200 kcal (ajustar según los números exactos del documento).

---

## Datos constantes del usuario

```typescript
const USER = {
  edad: 22,
  peso_kg: 78.5,
  fcMax: 193,          // Tanaka: 208 − 0.7 × 22
  zonaCardio: {
    z1: [116, 135],    // Zona 2 LISS: 60–70% FCmáx
    z2: [135, 154],    // Zona 3
    z3: [154, 174],    // Zona 4
  },
  objetivoDeficit: 'recomposición',  // no superávit
  proteinaDiariaG: 160,              // ancla, nunca cambia
}
```

---

## Lógica de negocio crítica

**Progresión (doble progresión):**
- Mostrar siempre el peso y reps de la última sesión para el mismo ejercicio.
- El usuario sube peso cuando completa TODAS las series del rango superior con RIR ≥ objetivo durante 2 sesiones consecutivas.
- El indicador de "listo para subir peso" se calcula en `src/utils/progression.ts`.

**Macros:**
- Nunca almacenar kcal calculadas en la BD; calcularlas siempre al vuelo desde gramos × (macros/100g).
- La proteína (160 g) es el ancla; los carbohidratos son el ajuste cuando cambian las calorías.

**Promedio semanal de peso:**
- Siempre mostrar el promedio de los últimos 7 días con datos, no el dato del día.
- La tendencia (subiendo/bajando) se calcula comparando el promedio de esta semana vs. la anterior.

**Calorías del reloj:**
- Mostrar como referencia visual únicamente.
- **Nunca** usarlas para calcular déficit ni para "comer de vuelta" el cardio.
- FC en reposo, HRV y sueño sí son métricas válidas para estado de recuperación.

---

## Fases de desarrollo

| Fase | Descripción | Estado |
|------|-------------|--------|
| **0** | Setup + expo-router + SQLite + seed completo | 🔲 Por hacer |
| **1** | Logger de series + historial + temporizador de descanso | 🔲 |
| **2** | Logger de macros/comidas + registro de agua | 🔲 |
| **3** | Métricas (peso/cintura/fotos) + gráficas de progreso y fuerza | 🔲 |
| **4** | Exportar/importar JSON (respaldo a Google Drive) | 🔲 |
| **5** | Health Connect: pasos, FC, sueño del Galaxy Watch 7 | 🔲 |
| **6** | EAS Build → APK → sideload en el teléfono | 🔲 |

**Regla:** completar y hacer commit de cada fase antes de empezar la siguiente. Las Fases 0–4 funcionan en Expo Go. La Fase 5 requiere build de desarrollo con EAS.

---

## Restricciones y decisiones tomadas

- **Sin backend ni nube** en v1. Todo local en el teléfono.
- **Sin Health Connect** hasta Fase 5 (módulo nativo, no funciona en Expo Go).
- **Sin air fryer** en las recetas 😄 (dato del plan nutricional, ignorar en código).
- **Sin sentadilla búlgara** en el seed de ejercicios.
- **Idioma de la UI:** español de México.
- **Modo oscuro** es la presentación prioritaria.
- **Áreas táctiles mín. 48×48 px** en todos los controles interactivos.
- **Registrar una serie: máximo 2 toques.** El peso y reps deben prellenarse con la última sesión.

---

## Referencia rápida de comandos

```bash
npx expo start          # desarrollo con Expo Go
npx expo start --dev-client  # con build de desarrollo (Fase 5+)
eas build -p android --profile preview   # generar APK
claude --resume         # retomar sesión anterior de Claude Code
```
