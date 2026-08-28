/**
 * Verifies the pure muscle-map math (bucketing, normalization, sorting).
 * Run with: npx tsx scripts/verify-muscle-load.ts
 */
import { levelsOf, missedMuscles, workedMuscles } from '../src/utils/muscleLoad';
import { MUSCLE_GROUPS, normalizeMuscleGroup } from '../src/constants/muscleRegions';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) console.log(`  PASS  ${name}`);
  else { failures++; console.log(`  FAIL  ${name} ${detail}`); }
}

console.log('=== normalizeMuscleGroup ===');
check('exact match', normalizeMuscleGroup('Pecho') === 'Pecho');
check('accent/case insensitive', normalizeMuscleGroup('bíceps') === 'Biceps');
check('unknown returns null', normalizeMuscleGroup('Gemelos raros') === null);
check('all 12 seed groups resolve', MUSCLE_GROUPS.every((g) => normalizeMuscleGroup(g) === g));

console.log('\n=== levelsOf ===');
{
  const load = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<string, number>;
  load['Pecho'] = 20; // max -> should be level 4
  load['Espalda'] = 15; // 15/20*4 = 3
  load['Biceps'] = 5; // 5/20*4 = 1
  load['Hombros'] = 10; // 10/20*4 = 2
  const levels = levelsOf(load as any);
  check('hardest-worked muscle is level 4', levels['Pecho'] === 4, `got ${levels['Pecho']}`);
  check('espalda level 3', levels['Espalda'] === 3, `got ${levels['Espalda']}`);
  check('hombros level 2', levels['Hombros'] === 2, `got ${levels['Hombros']}`);
  check('biceps level 1', levels['Biceps'] === 1, `got ${levels['Biceps']}`);
  check('untrained muscle is level 0', levels['Gluteo'] === 0, `got ${levels['Gluteo']}`);
}
{
  const load = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<string, number>;
  const levels = levelsOf(load as any);
  check('all-zero load -> all level 0 (no div by zero)', Object.values(levels).every((l) => l === 0));
}

console.log('\n=== missed/worked ===');
{
  const load = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<string, number>;
  load['Pecho'] = 8;
  load['Cuadriceps'] = 12;
  const worked = workedMuscles(load as any);
  const missed = missedMuscles(load as any);
  check('worked sorted hardest first', worked[0].muscle === 'Cuadriceps' && worked[1].muscle === 'Pecho', JSON.stringify(worked));
  check('worked has exactly 2 entries', worked.length === 2, `got ${worked.length}`);
  check('missed has exactly 10 entries', missed.length === 10, `got ${missed.length}`);
  check('missed excludes worked muscles', !missed.includes('Pecho') && !missed.includes('Cuadriceps'));
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
