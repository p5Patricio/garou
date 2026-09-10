import type { UiExercise, SetsMap } from '../types/workout';

export interface SetCompletionOutcome {
  /** What to expand next, or null if the whole session's exercise list is exhausted. */
  next: { exId: number; setIdx: number } | null;
  /** Seconds to rest. 0 means: do not start a rest timer at all. */
  restSeconds: number;
}

const DEFAULT_REST = 90;
const withDefault = (seg: number) => (seg > 0 ? seg : DEFAULT_REST);

/**
 * Decides what happens right after a work set is marked done: where to jump
 * next, and how long to rest.
 *
 * The routine's own rule (rutina_gimnasio_v4-1.pdf): "Superserie: alternas los
 * dos ejercicios sin descanso. Descansas al cerrar el par." — for a superset
 * pair, one member is seeded with descanso_seg = 0 (the opener) and the other
 * carries the real rest value (the closer, timed when the round closes). The
 * ORIGINAL code always called restTimer.start() after every set using
 * `ex.descansoSeg || 90` — since 0 is falsy in JS, that turned every opener's
 * "no rest" into a wrong 90s timer, and never actually alternated between the
 * two exercises at all (it just ran one exercise's sets to completion, then
 * the next's). This function is the fix: it decides the real next step from
 * the pair's live completion state instead of a fixed "next set index" rule.
 *
 * `sets` must already reflect the just-completed set as done=true — call this
 * AFTER completeSet() has persisted and updated state, not before.
 */
export function resolveSetCompletionOutcome(
  exercises: UiExercise[],
  sets: SetsMap,
  exId: number,
  setIdx: number
): SetCompletionOutcome {
  const ex = exercises.find((e) => e.id === exId);
  if (!ex) return { next: null, restSeconds: 0 };

  const partner = ex.supersetGroup
    ? exercises.find((other) => other.supersetGroup === ex.supersetGroup && other.id !== ex.id)
    : null;

  if (!partner) {
    // Not a superset — original sequential behaviour. 0 still means "really
    // no rest" only inside a pair; a standalone exercise with descanso_seg
    // at 0 is almost certainly unset data, so it still falls back to 90s here.
    if (setIdx + 1 < ex.series) {
      return { next: { exId, setIdx: setIdx + 1 }, restSeconds: withDefault(ex.descansoSeg) };
    }
    const exIndex = exercises.findIndex((e) => e.id === exId);
    const nextEx = exercises[exIndex + 1];
    return {
      next: nextEx ? { exId: nextEx.id, setIdx: 0 } : null,
      restSeconds: withDefault(ex.descansoSeg),
    };
  }

  const partnerHasSetHere = setIdx < partner.series;
  const partnerDoneHere = sets[partner.id]?.[setIdx]?.done === true;

  if (partnerHasSetHere && !partnerDoneHere) {
    // Opening half of the round (or the partner simply hasn't done this index
    // yet, regardless of which side is nominally the "opener") — jump
    // straight across, no rest at all.
    return { next: { exId: partner.id, setIdx }, restSeconds: 0 };
  }

  // Closing half of the round — either the partner already has this index
  // done, or the partner never had a set at this index (a trailing solo set
  // for the side with more series). Exactly one side of a real pair carries
  // the nonzero descanso_seg by construction; use whichever one has it.
  const restSeconds = ex.descansoSeg > 0 ? ex.descansoSeg : withDefault(partner.descansoSeg);

  const nextIdx = setIdx + 1;
  const exHasNext = nextIdx < ex.series;
  const partnerHasNext = nextIdx < partner.series;

  if (exHasNext && partnerHasNext) {
    // Next round — resume with whichever side opens (descanso_seg === 0).
    const opener = ex.descansoSeg === 0 ? ex : partner.descansoSeg === 0 ? partner : ex;
    return { next: { exId: opener.id, setIdx: nextIdx }, restSeconds };
  }
  if (exHasNext) {
    return { next: { exId, setIdx: nextIdx }, restSeconds };
  }
  if (partnerHasNext) {
    return { next: { exId: partner.id, setIdx: nextIdx }, restSeconds };
  }

  // Pair fully done — advance to the next exercise in the list that isn't
  // this pair's other half (skips over it wherever it sits, adjacent or not).
  const exIndex = exercises.findIndex((e) => e.id === exId);
  for (let i = exIndex + 1; i < exercises.length; i++) {
    if (exercises[i].id !== partner.id) {
      return { next: { exId: exercises[i].id, setIdx: 0 }, restSeconds };
    }
  }
  return { next: null, restSeconds };
}
