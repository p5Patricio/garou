# Garou Gym Restructure SDD

## Objective

Refocus Garou into a gym-first mobile app for fast workout logging, cardio timing, strength progress, body weight, and progress photos.

## Product Decisions

- Remove nutrition logging completely.
- Remove Samsung Health, Google Health Connect, and watch sync completely.
- Keep body weight and progress photos.
- Remove height from the product surface.
- Keep manual cardio logging with an in-app timer.
- Store load units literally: `kg`, `placas`, `lb`, and `bw`.
- Keep the routine fixed by default, with in-app editing for exercises, sets, reps, RIR, rest time, and preferred unit.
- Keep the UI dark, modern, minimal, and optimized for noisy gym use.

## Routine Source

Source routine: `C:\Users\Usuario\Downloads\rutina_hipertrofia_cardio.pdf`

Main structure:

- `Torso A`
- `Pierna A`
- `Ligero`
- `Torso B`
- `Pierna B`
- Rest/cardio days with LISS bike 30-40 min in Zone 2.

## Core UX Requirements

- Logging a set should take at most two taps when the prefilled values are correct.
- The next pending set should be obvious.
- Rest timers must use a persisted absolute end time as the source of truth.
- Rest and cardio timers should be separated by kind, clearly surfaced, and protected from confusing overlap.
- The timer should recover correctly after backgrounding or returning to the app.
- Cardio should support a simple timed session flow.

## Technical Plan

1. Remove nutrition and Health Connect dependencies, routes, hooks, types, and schema tables.
2. Update workout data model to support literal load units per set.
3. Add cardio timer persistence.
4. Refactor dashboard, workout, progress, and settings around gym-only data.
5. Add routine editing once the cleaned gym-only app compiles.
6. Revisit notification UX with either Expo Notifications or Notifee for Android countdown notifications.

## Implementation Status

- Done: nutrition and Health Connect removal.
- Done: literal load units: `kg`, `placas`, `lb`, `bw`.
- Done: persisted timer service backed by `active_timers`.
- Done: workout logging UX with previous-set copy, one-tap completion, edit completed set, and undo set.
- Done: cleaned `app/(tabs)/train.tsx` to rely on `useActiveTimer` / `timerService` instead of legacy local timer code.
- Done: Cardio timer flow with start, add time, cancel, save, heart-rate average, and zone.
- Done: Home active-timer banner for rest/cardio timers.
- Done: editable routine screen for exercise name, muscle group, equipment, sets, reps, RIR, rest, unit, notes, supersets, adding, reordering, and deactivating.
- Done: strength progress cards for latest, best, and delta.
- Done: Notifee Android countdown notification integration with Expo Notifications fallback.
- Pending native validation: rebuild the Android app/dev client and verify the notification shade countdown on a physical phone.

## Notification Direction

The timer service now prefers Notifee on Android for an ongoing countdown notification using Android chronometer support. Expo Notifications remains as a fallback and as the final alert path. Because Notifee is native code, this requires an Expo dev build or production build; Expo Go cannot show the native countdown notification.
