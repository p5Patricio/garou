/**
 * Verifies reconcileExerciseCatalog against a fake in-memory SQLite, checking it
 * lands on the full routine catalog from any starting state — including the broken
 * states migrations 11 and 12 left on real devices.
 *
 * Run it after ANY change to the exercise catalog or to the reconcile logic:
 *
 *   npx tsx scripts/verify-catalog.ts
 *
 * Deliberately dependency-free (no test runner, no devDependency) so it cannot
 * affect the EAS build. Exits non-zero when a check fails.
 */
import { reconcileExerciseCatalog } from '../src/db/reconcileCatalog';
import { EXERCISES } from '../src/db/seed';

interface Row {
  id: number;
  nombre: string;
  sesion: string;
  activo: number;
  [k: string]: any;
}

function makeDb(rows: Row[], setLogs: { exercise_id: number }[] = []) {
  let nextId = rows.length ? Math.max(...rows.map((r) => r.id)) + 1 : 1;
  return {
    _rows: rows,
    async getAllAsync(sql: string): Promise<any[]> {
      if (sql.includes('FROM exercises')) {
        return rows.map((r) => ({ id: r.id, nombre: r.nombre, sesion: r.sesion, activo: r.activo }));
      }
      if (sql.includes('FROM set_logs')) {
        const counts = new Map<number, number>();
        for (const s of setLogs) counts.set(s.exercise_id, (counts.get(s.exercise_id) ?? 0) + 1);
        return [...counts].map(([exercise_id, total]) => ({ exercise_id, total }));
      }
      throw new Error('unexpected getAllAsync: ' + sql);
    },
    async getFirstAsync(): Promise<any> {
      return null;
    },
    async withTransactionAsync(fn: () => Promise<void>) {
      await fn();
    },
    async runAsync(sql: string, params: any[]) {
      if (sql.trim().startsWith('UPDATE exercises SET activo = 0')) {
        const row = rows.find((r) => r.id === params[0]);
        if (row) row.activo = 0;
        return;
      }
      if (sql.trim().startsWith('UPDATE exercises SET nombre')) {
        const id = params[params.length - 1];
        const row = rows.find((r) => r.id === id);
        if (!row) throw new Error('update on missing id ' + id);
        row.nombre = params[0];
        row.sesion = params[3];
        row.orden = params[4];
        row.series_objetivo = params[5];
        row.activo = 1;
        return;
      }
      if (sql.trim().startsWith('INSERT INTO exercises')) {
        rows.push({
          id: nextId++,
          nombre: params[0],
          sesion: params[3],
          orden: params[4],
          series_objetivo: params[5],
          activo: 1,
        });
        return;
      }
      throw new Error('unexpected runAsync: ' + sql);
    },
  };
}

const LEGACY_CATALOG: { nombre: string; sesion: string }[] = [
  { nombre: 'Press de banca con barra', sesion: 'Torso A' },
  { nombre: 'Remo con apoyo en pecho', sesion: 'Torso A' },
  { nombre: 'Press inclinado con mancuernas', sesion: 'Torso A' },
  { nombre: 'Jalon al pecho', sesion: 'Torso A' },
  { nombre: 'Elevaciones laterales con mancuerna', sesion: 'Torso A' },
  { nombre: 'Curl con barra Z', sesion: 'Torso A' },
  { nombre: 'Extension de triceps en polea', sesion: 'Torso A' },
  { nombre: 'Sentadilla con barra', sesion: 'Pierna A' },
  { nombre: 'Prensa de pierna', sesion: 'Pierna A' },
  { nombre: 'Extension de cuadriceps', sesion: 'Pierna A' },
  { nombre: 'Curl femoral sentado', sesion: 'Pierna A' },
  { nombre: 'Elevacion de gemelos de pie', sesion: 'Pierna A' },
  { nombre: 'Elevacion de piernas colgado', sesion: 'Pierna A' },
  { nombre: 'Elevaciones laterales', sesion: 'Ligero' },
  { nombre: 'Pec deck invertido / pajaros', sesion: 'Ligero' },
  { nombre: 'Encogimientos de hombros', sesion: 'Ligero' },
  { nombre: 'Curl de muneca', sesion: 'Ligero' },
  { nombre: 'Curl inverso', sesion: 'Ligero' },
  { nombre: 'Elevacion de gemelos sentado', sesion: 'Ligero' },
  { nombre: 'Crunch en polea', sesion: 'Ligero' },
  { nombre: 'Press militar sentado', sesion: 'Torso B' },
  { nombre: 'Dominadas / Jalon prono', sesion: 'Torso B' },
  { nombre: 'Press de pecho en maquina', sesion: 'Torso B' },
  { nombre: 'Remo en polea baja', sesion: 'Torso B' },
  { nombre: 'Curl predicador / inclinado', sesion: 'Torso B' },
  { nombre: 'Press cerrado / extension sobre cabeza', sesion: 'Torso B' },
  { nombre: 'Peso muerto rumano', sesion: 'Pierna B' },
  { nombre: 'Sentadilla hack o prensa', sesion: 'Pierna B' },
  { nombre: 'Curl femoral tumbado', sesion: 'Pierna B' },
  { nombre: 'Empuje de cadera', sesion: 'Pierna B' },
  { nombre: 'Elevacion de gemelos de pie', sesion: 'Pierna B' },
  { nombre: 'Encogimientos de hombros', sesion: 'Pierna B' },
];

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name} ${detail}`);
  }
}

function assertFullCatalog(label: string, rows: Row[]) {
  const active = rows.filter((r) => r.activo === 1);
  check(`${label}: exactly ${EXERCISES.length} active exercises`, active.length === EXERCISES.length, `got ${active.length}`);

  for (const def of EXERCISES) {
    const match = active.filter((r) => r.nombre === def.nombre && r.sesion === def.sesion);
    check(`${label}: "${def.nombre}" [${def.sesion}] active exactly once`, match.length === 1, `got ${match.length}`);
  }

  const bySession = new Map<string, number>();
  for (const r of active) bySession.set(r.sesion, (bySession.get(r.sesion) ?? 0) + 1);
  const expectedBySession = new Map<string, number>();
  for (const d of EXERCISES) expectedBySession.set(d.sesion, (expectedBySession.get(d.sesion) ?? 0) + 1);
  for (const [sesion, expected] of expectedBySession) {
    check(`${label}: ${sesion} has ${expected}`, bySession.get(sesion) === expected, `got ${bySession.get(sesion)}`);
  }
}

async function main() {
  console.log('\n=== Catalog sanity ===');
  check(`catalog has 34 exercises`, EXERCISES.length === 34, `got ${EXERCISES.length}`);
  const keys = EXERCISES.map((e) => `${e.nombre}|${e.sesion}`);
  check('catalog (nombre, sesion) pairs are unique', new Set(keys).size === keys.length);

  console.log('\n=== Scenario 1: fresh install (already seeded with v3) ===');
  {
    const rows: Row[] = EXERCISES.map((e, i) => ({ id: i + 1, nombre: e.nombre, sesion: e.sesion, activo: 1 }));
    const db = makeDb(rows);
    const report = await reconcileExerciseCatalog(db as any);
    check('no inserts', report.inserted === 0, JSON.stringify(report));
    check('no deactivations', report.deactivated === 0, JSON.stringify(report));
    assertFullCatalog('fresh', rows);
  }

  console.log('\n=== Scenario 2: legacy pre-v3 catalog, with training history ===');
  {
    const rows: Row[] = LEGACY_CATALOG.map((e, i) => ({ id: i + 1, nombre: e.nombre, sesion: e.sesion, activo: 1 }));
    // Bench press (id 1) has real history — its id must survive.
    const setLogs = Array.from({ length: 40 }, () => ({ exercise_id: 1 }));
    const db = makeDb(rows, setLogs);
    await reconcileExerciseCatalog(db as any);
    assertFullCatalog('legacy', rows);
    const bench = rows.find((r) => r.nombre === 'Press de banca con barra' && r.sesion === 'Torso A');
    check('bench press keeps id 1 (history preserved)', bench?.id === 1, `got id ${bench?.id}`);
    const jalon = rows.find((r) => r.nombre === 'Jalon al pecho (neutro o supino)');
    check('renamed Jalon adopted an existing row (not a fresh insert)', !!jalon && jalon.id <= 32, `got id ${jalon?.id}`);
  }

  console.log('\n=== Scenario 3: the broken state migrations 11+12 leave behind ===');
  {
    // Some rows renamed to v3 names but deactivated by migration 12's bad lookup,
    // some still under legacy names, some v3 entries missing entirely.
    const rows: Row[] = [
      { id: 1, nombre: 'Press de banca con barra', sesion: 'Torso A', activo: 1 },
      { id: 2, nombre: 'Remo con apoyo en pecho', sesion: 'Torso A', activo: 1 },
      { id: 3, nombre: 'Jalon al pecho (neutro o supino)', sesion: 'Torso A', activo: 0 },
      { id: 4, nombre: 'Elevaciones laterales', sesion: 'Torso A', activo: 0 },
      { id: 5, nombre: 'Curl con barra Z', sesion: 'Torso A', activo: 0 },
      { id: 6, nombre: 'Sentadilla con barra alta o hack', sesion: 'Pierna A', activo: 0 },
      { id: 7, nombre: 'Prensa de pierna', sesion: 'Pierna A', activo: 1 },
      { id: 8, nombre: 'Curl femoral sentado', sesion: 'Pierna A', activo: 0 },
      { id: 9, nombre: 'Elevacion de gemelos sentado', sesion: 'Ligero', activo: 0 },
      { id: 10, nombre: 'Peso muerto rumano', sesion: 'Pierna B', activo: 0 },
      { id: 11, nombre: 'Ejercicio viejo retirado', sesion: 'Torso A', activo: 1 },
    ];
    const setLogs = [
      ...Array.from({ length: 30 }, () => ({ exercise_id: 1 })),
      ...Array.from({ length: 12 }, () => ({ exercise_id: 10 })),
    ];
    const db = makeDb(rows, setLogs);
    const report = await reconcileExerciseCatalog(db as any);
    console.log('  report:', JSON.stringify(report));
    assertFullCatalog('repaired', rows);
    const rdl = rows.find((r) => r.nombre === 'Peso muerto rumano' && r.sesion === 'Pierna B');
    check('deactivated RDL is revived on its original id (history kept)', rdl?.id === 10, `got id ${rdl?.id}`);
    const retired = rows.find((r) => r.nombre === 'Ejercicio viejo retirado');
    check('exercise outside the catalog is deactivated, not deleted', retired?.activo === 0 && !!retired);

    console.log('\n=== Scenario 4: idempotency (reconcile runs again on next launch) ===');
    const snapshot = JSON.stringify(rows);
    const report2 = await reconcileExerciseCatalog(db as any);
    check('second run inserts nothing', report2.inserted === 0, JSON.stringify(report2));
    check('second run deactivates nothing', report2.deactivated === 0, JSON.stringify(report2));
    check('table is byte-identical after second run', JSON.stringify(rows) === snapshot);
  }

  console.log('\n=== Scenario 5: duplicate rows, history wins ===');
  {
    const rows: Row[] = [
      { id: 1, nombre: 'Press de banca con barra', sesion: 'Torso A', activo: 1 },
      { id: 2, nombre: 'Press de banca con barra', sesion: 'Torso A', activo: 1 },
    ];
    // The duplicate (id 2) is the one carrying the training history.
    const setLogs = Array.from({ length: 25 }, () => ({ exercise_id: 2 }));
    const db = makeDb(rows, setLogs);
    await reconcileExerciseCatalog(db as any);
    const active = rows.filter((r) => r.nombre === 'Press de banca con barra' && r.activo === 1);
    check('only one bench press stays active', active.length === 1, `got ${active.length}`);
    check('the row with history (id 2) is the survivor', active[0]?.id === 2, `got id ${active[0]?.id}`);
  }

  console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}\n`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
