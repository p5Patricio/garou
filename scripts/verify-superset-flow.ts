/**
 * Verifies resolveSetCompletionOutcome by actually walking through full
 * workout simulations — not just checking one call at a time, since the bug
 * this replaces was about the SEQUENCE of decisions across a whole exercise,
 * not any single one of them.
 *
 * Run with: npx tsx scripts/verify-superset-flow.ts
 */
import { resolveSetCompletionOutcome } from '../src/utils/supersetFlow';
import type { UiExercise, SetsMap, SetState } from '../src/types/workout';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name} ${detail}`); }
}

function ex(partial: Partial<UiExercise> & { id: number; series: number }): UiExercise {
  return {
    nombre: `ex${partial.id}`,
    grupoMuscular: 'X',
    equipo: 'libre',
    sesion: 'Torso A',
    reps: [8, 12],
    rir: 1,
    descansoSeg: 90,
    notasTecnica: null,
    esBodyweight: false,
    unidadPreferida: 'kg',
    usaPlacas: false,
    supersetGroup: null,
    gifPath: null,
    thumbPath: null,
    ...partial,
  };
}

function emptySet(): SetState {
  return { weight: 0, unit: 'kg', reps: 10, rir: 1, done: false };
}

/** Simulates completing sets one at a time, in whatever order the outcome function sends us, recording the full sequence. */
function simulate(exercises: UiExercise[], maxSteps = 50) {
  const sets: SetsMap = {};
  for (const e of exercises) {
    sets[e.id] = {};
    for (let i = 0; i < e.series; i++) sets[e.id][i] = emptySet();
  }

  const trace: { exId: number; setIdx: number; restSeconds: number }[] = [];
  let cursor: { exId: number; setIdx: number } | null = { exId: exercises[0].id, setIdx: 0 };
  let steps = 0;

  while (cursor && steps < maxSteps) {
    steps++;
    const { exId, setIdx } = cursor;
    sets[exId][setIdx] = { ...sets[exId][setIdx], done: true };
    const outcome = resolveSetCompletionOutcome(exercises, sets, exId, setIdx);
    trace.push({ exId, setIdx, restSeconds: outcome.restSeconds });
    cursor = outcome.next;
  }
  return { trace, steps, sets };
}

console.log('=== Scenario 1: equal-series pair (Torso A curl+triceps, 3+3) ===');
{
  const a = ex({ id: 1, series: 3, descansoSeg: 0, supersetGroup: 'g' }); // opener
  const b = ex({ id: 2, series: 3, descansoSeg: 120, supersetGroup: 'g' }); // closer
  const { trace, steps } = simulate([a, b]);

  check('finishes in exactly 6 steps (3+3 sets, no extras)', steps === 6, `got ${steps}`);
  const expected = [
    { exId: 1, setIdx: 0, restSeconds: 0 }, // a0 -> jump to b0, no rest
    { exId: 2, setIdx: 0, restSeconds: 120 }, // b0 closes round 1 -> real rest
    { exId: 1, setIdx: 1, restSeconds: 0 },
    { exId: 2, setIdx: 1, restSeconds: 120 },
    { exId: 1, setIdx: 2, restSeconds: 0 },
    { exId: 2, setIdx: 2, restSeconds: 120 },
  ];
  check('alternates a-b-a-b-a-b with rest only after each b (the closer)', JSON.stringify(trace) === JSON.stringify(expected), JSON.stringify(trace));
}

console.log('\n=== Scenario 2: unequal series (Pierna A gemelos 4 + crunch 3) ===');
{
  const gemelos = ex({ id: 1, series: 4, descansoSeg: 0, supersetGroup: 'g' });
  const crunch = ex({ id: 2, series: 3, descansoSeg: 90, supersetGroup: 'g' });
  const { trace, steps } = simulate([gemelos, crunch]);

  check('finishes in exactly 7 steps (4+3)', steps === 7, `got ${steps}`);
  // Rounds 0,1,2 alternate; round 3 has no crunch partner left, gemelos goes solo.
  check('round 3 (index 3) has no partner -> gemelos alone', trace[6].exId === 1 && trace[6].setIdx === 3, JSON.stringify(trace[6]));
  check('the trailing solo set still gets a real rest (own descanso_seg is 0, falls back through partner)', trace[6].restSeconds === 90, `got ${trace[6].restSeconds}`);
  const restCounts = trace.filter((t) => t.restSeconds > 0).length;
  check('exactly 4 of the 7 steps carry a real rest (3 pair-closes + 1 trailing solo)', restCounts === 4, `got ${restCounts}`);
  check('every gemelos-only step (opener) before the trailing one rests 0', trace.slice(0, 6).filter((t) => t.exId === 1).every((t) => t.restSeconds === 0));
}

console.log('\n=== Scenario 3: original falsy-zero bug regression ===');
{
  // This is exactly the bug report: an opener's descanso_seg of 0 must NEVER
  // silently become the old 90s default.
  const a = ex({ id: 1, series: 1, descansoSeg: 0, supersetGroup: 'g' });
  const b = ex({ id: 2, series: 1, descansoSeg: 60, supersetGroup: 'g' });
  const sets: SetsMap = { 1: { 0: emptySet() }, 2: { 0: emptySet() } };
  sets[1][0] = { ...sets[1][0], done: true };
  const outcome = resolveSetCompletionOutcome([a, b], sets, 1, 0);
  check('opener with descanso_seg=0 never falls back to 90s', outcome.restSeconds === 0, `got ${outcome.restSeconds}`);
  check('opener sends you straight to the partner, same set index', outcome.next?.exId === 2 && outcome.next?.setIdx === 0);
}

console.log('\n=== Scenario 4: three exercises, only the first two are a superset (Torso A: SS pair then solo Elevaciones) ===');
{
  const a = ex({ id: 1, series: 2, descansoSeg: 0, supersetGroup: 'g', reps: [8, 12] });
  const b = ex({ id: 2, series: 2, descansoSeg: 120, supersetGroup: 'g' });
  const solo = ex({ id: 3, series: 2, descansoSeg: 90, supersetGroup: null });
  const { trace, steps } = simulate([a, b, solo]);
  check('finishes in exactly 6 steps (2+2+2)', steps === 6, `got ${steps}`);
  // trace[3] is "b's last set, closing the pair" (still exId 2) — the move to
  // solo shows up as the NEXT completed step, trace[4].
  check('closing the pair still reports resting (120s), then moving on', trace[3].exId === 2 && trace[3].restSeconds === 120, JSON.stringify(trace[3]));
  check('after the pair closes, the next completed step is the solo exercise (not looping the pair)', trace[4].exId === 3 && trace[4].setIdx === 0, JSON.stringify(trace[4]));
  check('the solo exercise rests normally between its own sets', trace[4].restSeconds === 90, `got ${trace[4].restSeconds}`);
  check('final set (nothing left) reports no next step', steps === 6 && trace.length === 6);
}

console.log('\n=== Scenario 5: reverse-order completion (closer tapped before opener) ===');
{
  // The UI lets you tap any set's checkbox directly — a user could complete
  // the "closer" first. The outcome must still make sense either way.
  const a = ex({ id: 1, series: 2, descansoSeg: 0, supersetGroup: 'g' });
  const b = ex({ id: 2, series: 2, descansoSeg: 100, supersetGroup: 'g' });
  const sets: SetsMap = { 1: { 0: emptySet(), 1: emptySet() }, 2: { 0: emptySet(), 1: emptySet() } };
  sets[2][0] = { ...sets[2][0], done: true }; // closer done first, opener not yet
  const outcome = resolveSetCompletionOutcome([a, b], sets, 2, 0);
  check('completing the closer first jumps to the still-undone opener, no rest yet', outcome.restSeconds === 0 && outcome.next?.exId === 1 && outcome.next?.setIdx === 0, JSON.stringify(outcome));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
