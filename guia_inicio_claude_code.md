# Guía de inicio — De Claude Design a Claude Code

> Sigue los pasos en orden. Al final de esta guía tendrás el proyecto creado, Claude Code orientado, y la Fase 0 arrancando.

---

## Paso 1 — Obtener el handoff de Claude Design

Claude Design genera un **handoff bundle**: una instrucción empaquetada que le dice a Claude Code exactamente qué construir.

**Dónde encontrarlo:** busca un botón "Export to Claude Code", "Send to Claude Code" o "Handoff" en la interfaz de Claude Design. Al ejecutarlo te dará uno de dos resultados:

- **Un prompt de texto** → cópialo; lo pegas en Claude Code en el Paso 7.
- **Un archivo descargable** → guárdalo; lo referenciarás con `@nombre-del-archivo` en Claude Code en el Paso 7.

**Si no ves el botón todavía** (el handoff está en rollout): toma **capturas de pantalla** de cada pantalla del prototipo. Claude Code las acepta directamente (arrastra y suelta, o pega con `Ctrl+V` — nota: en Mac es `Ctrl+V`, **no** `Cmd+V`).

---

## Paso 2 — Crear el proyecto Expo

Abre una terminal y ejecuta:

```bash
npx create-expo-app@latest mi-fit-tracker --template blank-typescript
cd mi-fit-tracker
git init
git add .
git commit -m "init: proyecto base Expo TypeScript"
```

---

## Paso 3 — Estructura de carpetas

```bash
mkdir -p src/{components,screens,db,hooks,utils,constants,types}
mkdir -p assets/data
```

Luego **copia los documentos del proyecto** a `assets/data/`:
- `rutina_hipertrofia.md`
- `plan_nutricion_hipertrofia.md`
- `plan_desarrollo_app.md`

Claude Code los leerá con `@assets/data/rutina_hipertrofia.md` cuando necesite sembrar datos reales.

---

## Paso 4 — Crear CLAUDE.md en la raíz del proyecto

Este es el archivo más importante: le da memoria persistente a Claude Code sobre tu proyecto. Claude Code lo lee automáticamente al arrancar cada sesión.

**Copia el archivo `CLAUDE.md` adjunto** (el otro archivo de esta guía) a la raíz del proyecto:

```
mi-fit-tracker/
├── CLAUDE.md          ← aquí
├── App.tsx
├── app.json
├── assets/
│   └── data/
│       ├── rutina_hipertrofia.md
│       ├── plan_nutricion_hipertrofia.md
│       └── plan_desarrollo_app.md
└── src/
```

---

## Paso 5 — Instalar dependencias (Fases 0–4, sin Health Connect todavía)

```bash
# Navegación
npx expo install expo-router
npx expo install react-native-safe-area-context react-native-screens
npx expo install expo-status-bar

# Base de datos local
npx expo install expo-sqlite

# Sistema de archivos (para exportar/importar JSON)
npx expo install expo-file-system expo-sharing expo-document-picker

# Build properties (necesario para Health Connect más adelante)
npm install expo-build-properties --save-dev

git add .
git commit -m "deps: instalar dependencias Fases 0-4"
```

> **Health Connect** (`react-native-health-connect`) se instala en la Fase 5 porque requiere un build nativo — **no funciona en Expo Go**. Instálalo cuando las Fases 0–4 ya estén funcionando.

---

## Paso 6 — Configurar EAS (para el APK, hazlo ahora para no olvidarlo)

```bash
npm install -g eas-cli
eas login        # usa tu cuenta de Anthropic/Expo
eas build:configure
```

Cuando te pregunte el tipo de build, elige **APK** (no AAB). Esto crea el archivo `eas.json`. Edítalo para asegurarte de que el perfil `preview` diga:

```json
{
  "build": {
    "preview": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

```bash
git add eas.json
git commit -m "eas: configurar perfil APK para sideload"
```

---

## Paso 7 — Arrancar Claude Code y pasar el diseño

```bash
# Desde la raíz del proyecto
claude
```

Claude Code leerá automáticamente tu `CLAUDE.md` y sabrá el contexto completo del proyecto.

Ahora pasa el diseño de Claude Design con **uno de estos métodos** (en orden de preferencia):

1. **Handoff bundle (texto):** pega directamente el texto en Claude Code.
2. **Handoff bundle (archivo):** escribe `@nombre-del-archivo` en Claude Code.
3. **Capturas de pantalla:** arrastra los PNG al terminal de Claude Code, o cópialos y pega con `Ctrl+V`.

---

## Paso 8 — Primera instrucción a Claude Code (Fase 0)

Una vez que Claude Code tiene el diseño, dale esta instrucción para arrancar la Fase 0:

```
Lee @CLAUDE.md para entender el proyecto completo.

Luego lee @assets/data/rutina_hipertrofia.md y @assets/data/plan_nutricion_hipertrofia.md
para extraer los datos reales del seed.

Ahora implementa la Fase 0 completa:
1. Configura expo-router con la estructura de tabs (Hoy / Entrenar / Comer / Progreso / Ajustes)
   usando el diseño que acabo de compartirte como referencia visual exacta.
2. Crea el módulo de base de datos en src/db/ con:
   - Todas las tablas definidas en CLAUDE.md
   - El seed completo: ejercicios de la rutina, alimentos del plan, objetivos de macros
     y objetivos de volumen por grupo muscular, extraídos de los documentos del proyecto.
3. Expón hooks simples en src/hooks/ para leer y escribir en cada tabla.
4. Muestra la pantalla "Hoy" con datos del seed visible en el emulador o Expo Go.

Trabaja tabla por tabla y muéstrame los cambios antes de continuar con la siguiente.
```

---

## Secuencia de fases (referencia rápida)

| Fase | Qué construyes | ¿Funciona en Expo Go? |
|------|---------------|----------------------|
| **0** | Setup + SQLite + seed con tu rutina/nutrición | ✅ |
| **1** | Logger de series + temporizador de descanso | ✅ |
| **2** | Logger de macros/comidas + agua | ✅ |
| **3** | Métricas (peso/cintura) + gráficas de progreso | ✅ |
| **4** | Exportar/importar JSON (respaldo) | ✅ |
| **5** | Health Connect (Galaxy Watch 7) | ❌ necesita `eas build` |
| **6** | Build APK final con `eas build --profile preview` | — |

---

## Cómo trabajar con Claude Code fase por fase

- **Una fase a la vez.** No pidas la app completa de golpe.
- **Haz commit después de cada fase** que funcione: `git commit -m "fase-1: logger de series completo"`.
- **Si Claude Code se equivoca**, dile exactamente qué está mal: "el temporizador no se reinicia al empezar una nueva serie". No uses "arréglalo" sin contexto.
- **Para retomar una sesión anterior:** `claude --resume` o busca la sesión en el historial con `/resume`.
- **Para referenciar tus docs en cualquier momento:** `@assets/data/rutina_hipertrofia.md`.
