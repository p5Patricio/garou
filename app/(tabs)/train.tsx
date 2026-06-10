import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, SEMANTIC } from '../../src/constants/theme';
import Stepper from '../../src/components/Stepper';
import RirSelector from '../../src/components/RirSelector';
import RestTimerBar from '../../src/components/RestTimerBar';
import BtnPrimary from '../../src/components/BtnPrimary';
import Icon from '../../src/components/Icon';
import { piernaA, type Exercise } from '../../src/data/appData';

interface SetState {
  weight: number;
  reps: number;
  rir: number;
  done: boolean;
}

type SetsMap = Record<number, Record<number, SetState>>;

function buildInitialSets(exercises: Exercise[]): SetsMap {
  const sets: SetsMap = {};
  exercises.forEach((ex) => {
    sets[ex.id] = {};
    for (let i = 0; i < ex.series; i++) {
      sets[ex.id][i] = { weight: ex.ultimoPeso, reps: ex.ultimoReps, rir: ex.rir[0], done: false };
    }
  });
  sets[1][0] = { weight: 82.5, reps: 6, rir: 2, done: true };
  sets[1][1] = { weight: 82.5, reps: 7, rir: 2, done: true };
  return sets;
}

interface Expanded {
  exId: number;
  setIdx: number;
}

interface RestTimer {
  active: boolean;
  remaining: number;
  total: number;
  nombre: string;
}

export default function TrainScreen() {
  const { theme } = useTheme();
  const exercises = piernaA;

  const [sets, setSets] = useState<SetsMap>(() => buildInitialSets(exercises));
  const [expanded, setExpanded] = useState<Expanded | null>({ exId: 1, setIdx: 2 });
  const [restTimer, setRestTimer] = useState<RestTimer>({ active: true, remaining: 127, total: 180, nombre: 'Sentadilla' });
  const [elapsed, setElapsed] = useState(43 * 60 + 17);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!restTimer.active || restTimer.remaining <= 0) return;
    const t = setInterval(() => {
      setRestTimer((r) => {
        if (r.remaining <= 1) return { ...r, active: false, remaining: 0 };
        return { ...r, remaining: r.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [restTimer.active, restTimer.remaining > 0]);

  const totalSeries = exercises.reduce((a, ex) => a + ex.series, 0);
  const doneSeries = Object.values(sets).reduce(
    (a, exSets) => a + Object.values(exSets).filter((s) => s.done).length, 0
  );

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedLabel = `${elapsedMin}:${String(elapsedSec).padStart(2, '0')}`;

  const handleToggle = (exId: number, setIdx: number) => {
    if (expanded?.exId === exId && expanded?.setIdx === setIdx) {
      setExpanded(null);
    } else {
      setExpanded({ exId, setIdx });
    }
  };

  const handleUpdateSet = (exId: number, setIdx: number, field: keyof SetState, val: number | boolean) => {
    setSets((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], [setIdx]: { ...prev[exId][setIdx], [field]: val } },
    }));
  };

  const handleConfirm = (exId: number, setIdx: number) => {
    setSets((prev) => ({
      ...prev,
      [exId]: { ...prev[exId], [setIdx]: { ...prev[exId][setIdx], done: true } },
    }));
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;
    const nextIdx = setIdx + 1;
    if (nextIdx < ex.series) {
      setExpanded({ exId, setIdx: nextIdx });
    } else {
      const nextEx = exercises.find((e) => e.id > exId);
      setExpanded(nextEx ? { exId: nextEx.id, setIdx: 0 } : null);
    }
    setRestTimer({
      active: true,
      remaining: ex.descansoSeg,
      total: ex.descansoSeg,
      nombre: ex.nombre.split(' ').slice(0, 2).join(' '),
    });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: restTimer.active ? 180 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <Text style={[styles.enCurso, { color: theme.accent }]}>En curso</Text>
              <Text style={[styles.sessionName, { color: theme.text1 }]}>PIERNA A</Text>
            </View>
            <View style={styles.elapsedWrap}>
              <Text style={[styles.elapsedTime, { color: theme.text1 }]}>{elapsedLabel}</Text>
              <Text style={[styles.seriesCount, { color: theme.text3 }]}>{doneSeries}/{totalSeries} series</Text>
            </View>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.bg4, marginHorizontal: 20, marginBottom: 4 }]}>
            <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(doneSeries / totalSeries) * 100}%` }]} />
          </View>

          {exercises.map((ex) => {
            const exSets = sets[ex.id] ?? {};
            const isActive = expanded?.exId === ex.id;
            const doneCount = Object.values(exSets).filter((s) => s.done).length;

            return (
              <View
                key={ex.id}
                style={[
                  styles.exCard,
                  {
                    backgroundColor: theme.bg2,
                    borderColor: isActive ? theme.border2 : theme.border,
                    borderRadius: RADII.r2,
                    marginHorizontal: 20,
                    marginBottom: 12,
                  },
                ]}
              >
                <View style={[styles.exHeader, { borderBottomColor: theme.border }]}>
                  <View style={styles.exHeaderLeft}>
                    <Text style={[styles.exName, { color: theme.text1 }]}>{ex.nombre}</Text>
                    <View style={styles.exChips}>
                      <View style={[styles.exChip, { backgroundColor: theme.accentA }]}>
                        <Text style={[styles.exChipAccent, { color: theme.accent }]}>
                          {ex.series}×{ex.reps[0]}–{ex.reps[1]}
                        </Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>RIR {ex.rir[0]}–{ex.rir[1]}</Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>{ex.grupoMuscular}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.exHeaderRight}>
                    <Text style={[styles.exLastLabel, { color: theme.text3 }]}>Última vez</Text>
                    <Text style={[styles.exLastValue, { color: theme.text2 }]}>
                      {ex.esBodyweight ? `BW × ${ex.ultimoReps}` : `${ex.ultimoPeso} kg × ${ex.ultimoReps}`}
                    </Text>
                    <Text style={[styles.exLastDate, { color: theme.text4 }]}>{ex.ultimoFecha}</Text>
                  </View>
                </View>

                {Array.from({ length: ex.series }).map((_, si) => {
                  const s = exSets[si] ?? { weight: ex.ultimoPeso, reps: ex.ultimoReps, rir: ex.rir[0], done: false };
                  const isExp = expanded?.exId === ex.id && expanded?.setIdx === si;
                  const isDone = s.done;
                  const isLast = si === ex.series - 1;

                  return (
                    <View key={si}>
                      <TouchableOpacity
                        onPress={() => { if (!isDone) handleToggle(ex.id, si); }}
                        disabled={isDone}
                        style={[
                          styles.setRow,
                          {
                            borderBottomColor: theme.border,
                            borderBottomWidth: (isExp || !isLast) ? 1 : 0,
                            backgroundColor: isExp ? theme.bg3 : 'transparent',
                          },
                        ]}
                        activeOpacity={0.7}
                      >
                        <View style={[
                          styles.setCircle,
                          {
                            backgroundColor: isDone ? SEMANTIC.greenA : isExp ? theme.accentA : theme.bg4,
                            borderColor: isExp ? theme.accent : 'transparent',
                          },
                        ]}>
                          {isDone
                            ? <Icon name="check" size={13} color={SEMANTIC.green} strokeW={2.5} />
                            : <Text style={[styles.setNum, { color: isExp ? theme.accent : theme.text3 }]}>{si + 1}</Text>
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.setWeightReps, { color: isDone ? theme.text3 : theme.text1 }]}>
                            {s.weight === 0 ? 'BW' : `${s.weight} kg`}
                            <Text style={{ fontWeight: '500', color: theme.text3 }}> × </Text>
                            {s.reps}
                          </Text>
                        </View>
                        <View style={[styles.rirBadge, { backgroundColor: isDone ? SEMANTIC.greenA : theme.bg4 }]}>
                          <Text style={[styles.rirBadgeText, { color: isDone ? SEMANTIC.green : theme.text4 }]}>
                            {isDone ? '✓' : `RIR ${s.rir}`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {isExp && (
                        <View style={[styles.loggerExpanded, {
                          backgroundColor: theme.bg3,
                          borderBottomColor: theme.border,
                          borderBottomWidth: !isLast ? 1 : 0,
                        }]}>
                          <View style={styles.steppers}>
                            <Stepper
                              value={s.weight}
                              onChange={(v) => handleUpdateSet(ex.id, si, 'weight', v)}
                              step={ex.esBodyweight ? 0 : 2.5}
                              min={0}
                              label="Peso"
                              unit="kg"
                            />
                            <View style={[styles.divider, { backgroundColor: theme.border }]} />
                            <Stepper
                              value={s.reps}
                              onChange={(v) => handleUpdateSet(ex.id, si, 'reps', v)}
                              step={1}
                              min={1}
                              label="Reps"
                              unit="reps"
                            />
                          </View>
                          <View style={styles.rirRow}>
                            <RirSelector value={s.rir} onChange={(v) => handleUpdateSet(ex.id, si, 'rir', v)} />
                          </View>
                          <BtnPrimary onPress={() => handleConfirm(ex.id, si)} icon="check">
                            Completar serie {si + 1}
                          </BtnPrimary>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        {restTimer.active && (
          <RestTimerBar
            remaining={restTimer.remaining}
            total={restTimer.total}
            nombre={restTimer.nombre}
            onSkip={() => setRestTimer((r) => ({ ...r, active: false }))}
            onAdd30={() => setRestTimer((r) => ({ ...r, remaining: r.remaining + 30 }))}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 8, paddingBottom: 12 },
  enCurso: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 2 },
  sessionName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  elapsedWrap: { alignItems: 'flex-end' },
  elapsedTime: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  seriesCount: { fontSize: 12, marginTop: 1 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 10, marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 2 },
  exCard: { borderWidth: 1, overflow: 'hidden' },
  exHeader: { padding: 13, paddingBottom: 11, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exHeaderLeft: { flex: 1 },
  exName: { fontSize: 15, fontWeight: '700', marginBottom: 3 },
  exChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  exChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  exChipAccent: { fontSize: 11, fontWeight: '600' },
  exChipNeutral: { fontSize: 11, fontWeight: '600' },
  exHeaderRight: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 },
  exLastLabel: { fontSize: 11, marginBottom: 1 },
  exLastValue: { fontSize: 13, fontWeight: '700' },
  exLastDate: { fontSize: 10 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  setCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setNum: { fontSize: 12, fontWeight: '700' },
  setWeightReps: { fontSize: 15, fontWeight: '700' },
  rirBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rirBadgeText: { fontSize: 12, fontWeight: '700' },
  loggerExpanded: { padding: 16 },
  steppers: { flexDirection: 'row', gap: 12, justifyContent: 'center', marginBottom: 16 },
  divider: { width: 1, flexShrink: 0 },
  rirRow: { marginBottom: 14 },
});
