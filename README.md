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
*   **Doble Progresión Calculada**: Algoritmo (`src/utils/progression.ts`) que analiza tus últimas sesiones completadas y te indica cuándo cumpliste el rango de repeticiones objetivo con el RIR adecuado durante 2 sesiones consecutivas para subir carga.
*   **Rotación de Sesiones**: La rutina funciona como una rotación fija (`Torso A → Pierna A → Ligero → Torso B → Pierna B`) con días de descanso explícitos, no atada a calendario. Podés cambiar de sesión manualmente cuando lo necesites.
*   **Registro Veloz Predictivo**: Autocompleta peso, reps y RIR con la última sesión del ejercicio. Al completar una serie, el temporizador de descanso aparece inmediatamente para la siguiente.
*   **Unidades por Ejercicio**: Soporta `kg`, `lb`, `placas` de máquina y `bw` (peso corporal). Las dominadas, fondos o cualquier ejercicio BW pueden registrar carga añadida o asistida (`BW + 10 kg`, `BW - 5 kg`).

### 📈 Gráficas y Métricas de Progreso
*   **Promedio Móvil de Peso**: Promedio de los últimos 7 días con datos para suavizar fluctuaciones y mostrar tendencia real semana a semana.
*   **Normalización de Fuerza Multiuso**: Convierte `lb`, `placas` y `bw` a kilogramos en memoria para graficar progresión de fuerza comparando ejercicios con distintas unidades.
*   **Gestión de Métricas**: Registro de peso, cintura y fotos con posibilidad de eliminar entradas erróneas desde el historial reciente.
*   **Buscador Modal de Ejercicios**: Panel modal para seleccionar el ejercicio cuyo historial de fuerza querés ver en las gráficas.

### ⏱️ Temporizador de Descanso Resiliente
*   **Inicio Inmediato**: Aparece desde la primera serie completada, con duración tomada del descanso configurado del ejercicio.
*   **Persistencia y Notificaciones**: El timer se guarda en SQLite y sincroniza al volver a la app. Usa `@notifee/react-native` y `expo-notifications` para notificaciones en segundo plano. Al saltar o cancelar se limpian tanto la notificación como la alarma programada.

### 💾 Respaldo y Restauración Local
*   **Exportar/Importar JSON**: Desde Ajustes podés exportar toda la base de datos a un archivo JSON y restaurarlo después, útil para cambios de dispositivo o copias de seguridad manuales. El respaldo incluye rutina, sesiones, series, métricas y cardio; los timers activos se descartan al importar por seguridad.

### 🎨 Personalización y Accesibilidad
*   **Modo Oscuro Persistido**: El tema oscuro y el color de acento se guardan en la base de datos local y se restauran al abrir la app.
*   **Accesibilidad**: Roles, labels y targets táctiles mínimos de 48×48 dp en los controles principales.

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
