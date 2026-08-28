import type { SetRow, ExerciseTarget, ProgressionResult } from '../types/workout';

/**
 * Pure double-progression readiness function.
 *
 * Returns `readyToIncrease: true` only when ALL of the following hold:
 *   1. Exactly 2 sessions are provided.
 *   2. Both sessions have at least `target.seriesObjetivo` completed sets.
 *   3. In both sessions, every completed set has `reps >= target.repsMax`.
 *   4. In both sessions, every completed set has `rir_real >= target.rirObjetivo`.
 *
 * @param lastTwoSessions  Array of two set arrays: [olderSession, newerSession].
 * @param target           Exercise progression target parameters.
 */
// sessionIdx 0 = penultima (older of the two), sessionIdx 1 = ultima (newer) —
// used only to phrase the reason in terms the user actually thinks in
// ("tu ultima sesion") instead of an opaque "Sesion 1/2".
const SESSION_LABEL = ['tu penultima sesion', 'tu ultima sesion'];

export function isReadyToIncrease(
  lastTwoSessions: SetRow[][],
  target: ExerciseTarget
): ProgressionResult {
  if (lastTwoSessions.length < 2) {
    return {
      readyToIncrease: false,
      reason: 'Necesitas 2 sesiones completadas de este ejercicio para ver la sugerencia.',
    };
  }

  for (let sessionIdx = 0; sessionIdx < 2; sessionIdx++) {
    const session = lastTwoSessions[sessionIdx];
    const completedSets = session.filter((s) => s.completada === 1);
    const label = SESSION_LABEL[sessionIdx];

    if (completedSets.length < target.seriesObjetivo) {
      const faltan = target.seriesObjetivo - completedSets.length;
      return {
        readyToIncrease: false,
        reason: `En ${label} te faltó completar ${faltan} serie${faltan === 1 ? '' : 's'} (hiciste ${completedSets.length} de ${target.seriesObjetivo}).`,
      };
    }

    for (let i = 0; i < completedSets.length; i++) {
      const set = completedSets[i];
      if (set.reps < target.repsMax) {
        const faltan = target.repsMax - set.reps;
        return {
          readyToIncrease: false,
          reason: `En ${label}, serie ${i + 1}: te faltaron ${faltan} rep${faltan === 1 ? '' : 's'} para llegar a ${target.repsMax} — mantené el peso.`,
        };
      }

      const rir = set.rir_real ?? 0;
      if (rir < target.rirObjetivo) {
        return {
          readyToIncrease: false,
          reason: `En ${label}, serie ${i + 1}: llegaste con RIR ${rir} (objetivo ${target.rirObjetivo}) — te faltó margen, mantené el peso.`,
        };
      }
    }
  }

  return {
    readyToIncrease: true,
    reason: `2 sesiones seguidas al tope del rango (${target.repsMax} reps) con RIR ${target.rirObjetivo}+ — subí el peso.`,
  };
}
