<p align="center">
  <img src="assets/icon.png" width="160" height="160" alt="Garou Logo" style="border-radius: 35px;" />
</p>

<h1 align="center">🐺 Garou</h1>

<p align="center">
  <a href="https://expo.dev/"><img src="https://img.shields.io/badge/Expo-SDK%2056-black?style=flat-square&logo=expo" alt="Expo SDK" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-6.0-blue?style=flat-square&logo=typescript" alt="TypeScript" /></a>
  <a href="https://www.sqlite.org/"><img src="https://img.shields.io/badge/SQLite-Local-003B57?style=flat-square&logo=sqlite" alt="SQLite" /></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT" /></a>
</p>

**Garou** es una aplicación móvil Android de uso personal e independiente para llevar un registro milimétrico de tu **entrenamiento de hipertrofia** y **métricas de progreso**.

Diseñada bajo un enfoque totalmente local (*offline-first*), la aplicación prioriza la privacidad absoluta de tus datos de entrenamiento. Toda la información se almacena localmente en el dispositivo mediante SQLite y no requiere conexión a internet ni cuenta en la nube.

---

## 🚀 Características Clave

### 🏋️ Registro de Entrenamiento Inteligente
*   **Doble Progresión Calculada**: Implementa un algoritmo de progresión (`src/utils/progression.ts`) que analiza tus últimas sesiones. Te indica visualmente cuándo estás listo para subir cargas al haber completado el rango de repeticiones objetivo con RIR $\le$ objetivo durante 2 sesiones consecutivas.
*   **Sugerencia Basada en Calendario Semanal**: Detecta el día de la semana para proponerte la sesión predefinida correspondiente (Lunes: *Torso A*, Martes: *Pierna A*, Miércoles: *Ligero*, Jueves: *Torso B*, Viernes: *Pierna B*, Sábado/Domingo: *descanso*). Soporta cambio de rutina manual en cualquier momento.
*   **Registro Veloz predictivo**: Autocompleta automáticamente las cargas y repeticiones basándose en tu última sesión para el ejercicio correspondiente, agilizando el flujo durante tus descansos.

### 📈 Gráficas y Métricas de Progreso
*   **Promedio Móvil de Peso**: Calcula el promedio móvil de los últimos 7 días con datos para mitigar fluctuaciones naturales de peso, mostrando además la tendencia semanal (subiendo, bajando o estable).
*   **Normalización de Fuerza Multiuso**: Convierte y normaliza en memoria unidades mixtas (`lb`, `placas` de máquinas, o peso corporal `bw` utilizando tu último peso registrado) a kilogramos (`kg`) para graficar la progresión de fuerza de manera correcta. Mantiene la visualización de los puntos del gráfico con su valor y unidad originales en las etiquetas.
*   **Buscador Modal de Ejercicios**: Panel modal vertical translúcido y fluido para seleccionar el ejercicio del que deseas ver el progreso en las gráficas.

### ⏱️ Temporizador de Descanso Resiliente
*   **Segundo Plano Notifee**: Temporizador integrado que sigue funcionando en segundo plano y te notifica cuando termina tu descanso.
*   **Prevención de Duplicados**: Al saltar o cancelar un temporizador, se cancelan tanto la notificación en el cajón de Android como las alarmas programadas en el sistema (`cancelTriggerNotification`), limpiando la base de datos SQLite por completo.

---

## 🛠️ Stack Técnico

*   **Framework:** Expo SDK 56 (React Native) + TypeScript
*   **Navegación:** Expo Router v3 (Tabs base de 5 pestañas)
*   **Base de datos:** SQLite Local con `expo-sqlite`
*   **Notificaciones:** `@notifee/react-native` + `expo-notifications`

---

## 📂 Estructura del Proyecto

```text
garou/
├── app/                    # Expo Router: Rutas y vistas principales
│   ├── (tabs)/             # Vistas de pestañas inferiores (Bottom Tabs)
│   │   ├── index.tsx       # Hoy (Dashboard general con calendario semanal)
│   │   ├── train.tsx       # Entrenar (Registro de series y temporizador)
│   │   ├── cardio.tsx      # Registro y temporizador de cardio
│   │   ├── progress.tsx    # Progreso (Gráficas de peso, fotos e historial de fuerza)
│   │   └── routine.tsx     # Rutina (Catálogo y edición de ejercicios por sesión)
│   └── _layout.tsx         # Configuración del layout y temas
├── src/
│   ├── db/                 # SQLite: Esquema de base de datos, inicialización y seed
│   ├── hooks/              # Hooks personalizados (useWorkout, useMetrics, useDashboard, etc.)
│   ├── components/         # Componentes UI reutilizables (StatCard, LineChart, Stepper)
│   ├── screens/            # Sub-pantallas y modales (ExerciseHistoryScreen)
│   ├── utils/              # Funciones de utilidad (conversión de peso, promedios móviles, progresión)
│   ├── constants/          # Constantes de diseño (colores, tipografía, radios)
│   └── types/              # Tipos TypeScript del negocio
└── eas.json                # Configuración de EAS Build (Android Preview → APK)
```

---

## ⚙️ Configuración y Desarrollo

### Paso 1: Instalar dependencias
Clona el repositorio e instala las dependencias del proyecto utilizando npm:
```bash
npm install
```

### Paso 2: Iniciar servidor de desarrollo
Puedes probar la aplicación localmente en el simulador o en tu dispositivo físico mediante **Expo Go**:
```bash
npx expo start
```

### Paso 3: Compilar APK local (EAS Build)
Para generar un build de previsualización e instalarlo directamente en tu dispositivo Android:

1.  Instala EAS CLI globalmente si no lo tienes:
    ```bash
    npm install -g eas-cli
    ```
2.  Genera el archivo APK ejecutando:
    ```bash
    eas build -p android --profile preview
    ```
3.  Una vez completado el build, descarga el APK resultante e instálalo de forma manual (Sideload) en tu teléfono Android.
