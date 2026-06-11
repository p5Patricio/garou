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
export function isReadyToIncrease(
  lastTwoSessions: SetRow[][],
  target: ExerciseTarget
): ProgressionResult {
  if (lastTwoSessions.length < 2) {
    return {
      readyToIncrease: false,
      reason: 'Sin historial suficiente — se necesitan 2 sesiones completadas',
    };
  }

  for (let sessionIdx = 0; sessionIdx < 2; sessionIdx++) {
    const session = lastTwoSessions[sessionIdx];
    const completedSets = session.filter((s) => s.completada === 1);

    if (completedSets.length < target.seriesObjetivo) {
      return {
        readyToIncrease: false,
        reason: `Sesión ${sessionIdx + 1}: series completadas (${completedSets.length}) < objetivo (${target.seriesObjetivo})`,
      };
    }

    for (const set of completedSets) {
      if (set.reps < target.repsMax) {
        return {
          readyToIncrease: false,
          reason: `Sesión ${sessionIdx + 1}: reps (${set.reps}) < reps máx objetivo (${target.repsMax})`,
        };
      }

      const rir = set.rir_real ?? 0;
      if (rir < target.rirObjetivo) {
        return {
          readyToIncrease: false,
          reason: `Sesión ${sessionIdx + 1}: RIR real (${rir}) < RIR objetivo (${target.rirObjetivo})`,
        };
      }
    }
  }

  return {
    readyToIncrease: true,
    reason: '2 sesiones completadas en rango máximo con RIR objetivo',
  };
}
