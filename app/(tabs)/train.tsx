import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import BtnPrimary from '../../src/components/BtnPrimary';
import Icon from '../../src/components/Icon';
import RestTimerBar from '../../src/components/RestTimerBar';
import RirSelector from '../../src/components/RirSelector';
import Stepper from '../../src/components/Stepper';
import { RADII, SEMANTIC, useTheme } from '../../src/constants/theme';
import { useActiveTimer } from '../../src/hooks/useActiveTimer';
import { useWorkout } from '../../src/hooks/useWorkout';
import ExerciseHistoryScreen from '../../src/screens/ExerciseHistoryScreen';
import { ROUTINE_SESSIONS } from '../../src/utils/workoutSession';
import type { LoadUnit } from '../../src/types/workout';

interface Expanded {
  exId: number;
  setIdx: number;
}

interface HistoryModal {
  exerciseId: number;
  exerciseName: string;
}

const UNITS: LoadUnit[] = ['kg', 'placas', 'lb'];

function formatSet(weight: number, unit: LoadUnit, reps: number): string {
  if (unit === 'bw' || weight === 0) return `BW x ${reps}`;
  return `${weight} ${unit} x ${reps}`;
}

export default function TrainScreen() {
  const { theme } = useTheme();
  const {
    loading,
    exercises,
    sets,
    progressionByExercise,
    sessionComplete,
    completeSet,
    undoSet,
    updateSet,
    finishSession,
    selectSession,
    markRestDay,
    undoRestDay,
    setExerciseUnit,
    tipoSesion,
    estado,
  } = useWorkout();

  const restTimer = useActiveTimer('rest');
  const [expanded, setExpanded] = useState<Expanded | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<HistoryModal | null>(null);

  useEffect(() => {
    if (!sessionStarted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [sessionStarted]);

  const totalSeries = useMemo(
    () => exercises.reduce((acc, ex) => acc + ex.series, 0),
    [exercises]
  );

  const doneSeries = useMemo(
    () => Object.values(sets).reduce(
      (acc, exSets) => acc + Object.values(exSets).filter((s) => s.done).length,
      0
    ),
    [sets]
  );

  const elapsedLabel = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;

  const handleToggle = (exId: number, setIdx: number) => {
    setExpanded((current) => (
      current?.exId === exId && current?.setIdx === setIdx ? null : { exId, setIdx }
    ));
  };

  const handleUpdateSet = (
    exId: number,
    setIdx: number,
    field: 'weight' | 'reps' | 'rir' | 'done' | 'unit',
    val: number | boolean | LoadUnit
  ) => {
    updateSet(exId, setIdx, field, val);
  };

  const handleCopyPrevious = (exId: number, setIdx: number) => {
    const prev = sets[exId]?.[setIdx - 1];
    if (!prev) return;
    updateSet(exId, setIdx, 'weight', prev.weight);
    updateSet(exId, setIdx, 'unit', prev.unit);
    updateSet(exId, setIdx, 'reps', prev.reps);
    updateSet(exId, setIdx, 'rir', prev.rir);
  };

  const handleConfirm = async (exId: number, setIdx: number) => {
    const ex = exercises.find((item) => item.id === exId);
    const currentSet = sets[exId]?.[setIdx];
    if (!ex || !currentSet) return;

    const wasDone = currentSet.done;
    await completeSet(exId, setIdx, { ...currentSet, done: true });

    if (!sessionStarted) setSessionStarted(true);
    if (wasDone) {
      setExpanded(null);
      return;
    }

    if (setIdx + 1 < ex.series) {
      setExpanded({ exId, setIdx: setIdx + 1 });
    } else {
      const exIndex = exercises.findIndex((item) => item.id === exId);
      const nextEx = exercises[exIndex + 1];
      setExpanded(nextEx ? { exId: nextEx.id, setIdx: 0 } : null);
    }

    const timerLabel = ex.nombre.split(' ').slice(0, 2).join(' ');
    const duration = ex.descansoSeg && ex.descansoSeg > 0 ? ex.descansoSeg : 90;
    restTimer.start(timerLabel, duration)
      .catch((err) => console.error('[TrainScreen] start rest timer error', err));
  };

  const handleToggleCircle = async (exId: number, setIdx: number) => {
    const ex = exercises.find((item) => item.id === exId);
    const currentSet = sets[exId]?.[setIdx];
    if (!ex || !currentSet) return;

    if (currentSet.done) {
      await undoSet(exId, setIdx);
      setExpanded({ exId, setIdx });
      return;
    }

    await completeSet(exId, setIdx, { ...currentSet, done: true });

    if (!sessionStarted) setSessionStarted(true);

    if (setIdx + 1 < ex.series) {
      setExpanded({ exId, setIdx: setIdx + 1 });
    } else {
      const exIndex = exercises.findIndex((item) => item.id === exId);
      const nextEx = exercises[exIndex + 1];
      setExpanded(nextEx ? { exId: nextEx.id, setIdx: 0 } : null);
    }

    const timerLabel = ex.nombre.split(' ').slice(0, 2).join(' ');
    const duration = ex.descansoSeg && ex.descansoSeg > 0 ? ex.descansoSeg : 90;
    restTimer.start(timerLabel, duration)
      .catch((err) => console.error('[TrainScreen] start rest timer error', err));
  };

  const handleUndoSet = async (exId: number, setIdx: number) => {
    await undoSet(exId, setIdx);
    setExpanded({ exId, setIdx });
  };

  const handleFinishSession = () => {
    const msg = sessionComplete
      ? 'Terminar y marcar esta sesion como completada?'
      : 'Hay ejercicios sin completar. Guardar lo registrado y terminar la rutina?';
    Alert.alert('Terminar rutina', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', onPress: () => finishSession() },
    ]);
  };

  const handleMarkRest = () => {
    Alert.alert('No fui al gym', 'Marcar hoy como dia de descanso? La rotacion no avanza.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Si, descanso', onPress: () => markRestDay() },
    ]);
  };

  const handleSelectSession = (tipo: string) => {
    setSessionPickerOpen(false);
    if (tipo === tipoSesion && estado !== 'descanso') return;
    if (estado === 'pendiente') {
      Alert.alert('Cambiar sesion', 'Se descartara lo registrado hoy. Continuar?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Cambiar', style: 'destructive', onPress: () => selectSession(tipo) },
      ]);
      return;
    }
    selectSession(tipo);
  };

  const estadoMeta: Record<string, { label: string; color: string }> = {
    sugerida: { label: 'Sugerida hoy', color: theme.accent },
    pendiente: { label: 'En curso', color: theme.accent },
    completada: { label: 'Completada', color: SEMANTIC.green },
    descanso: { label: 'Dia de descanso', color: theme.text3 as string },
  };
  const meta = estadoMeta[estado] ?? estadoMeta.sugerida;

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text3 }]}>Cargando sesion...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: restTimer.active ? 180 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.enCurso, { color: meta.color }]}>{meta.label}</Text>
              <Text style={[styles.sessionName, { color: theme.text1 }]}>{tipoSesion.toUpperCase()}</Text>
            </View>
            {estado !== 'descanso' ? (
              <View style={styles.elapsedWrap}>
                <Text style={[styles.elapsedTime, { color: theme.text1 }]}>{elapsedLabel}</Text>
                <Text style={[styles.seriesCount, { color: theme.text3 }]}>{doneSeries}/{totalSeries} series</Text>
              </View>
            ) : null}
          </View>

          {estado !== 'completada' ? (
            <View style={styles.sessionControls}>
              <TouchableOpacity
                onPress={() => setSessionPickerOpen(true)}
                style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                accessibilityRole="button"
              >
                <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>Cambiar sesion</Text>
              </TouchableOpacity>
              {estado === 'descanso' ? (
                <TouchableOpacity
                  onPress={() => undoRestDay()}
                  style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>Deshacer descanso</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleMarkRest}
                  style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                  accessibilityRole="button"
                >
                  <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>No fui al gym</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : null}

          {estado === 'descanso' ? (
            <View style={[styles.restBanner, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <Icon name="moon" size={28} color={theme.text3} strokeW={1.6} />
              <Text style={[styles.restBannerTitle, { color: theme.text1 }]}>Hoy es descanso</Text>
              <Text style={[styles.restBannerSub, { color: theme.text3 }]}>
                La proxima sesion sigue siendo {tipoSesion}.
              </Text>
            </View>
          ) : null}

          {estado !== 'descanso' && totalSeries > 0 ? (
            <View style={[styles.progressTrack, { backgroundColor: theme.bg4 }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.accent, width: `${(doneSeries / totalSeries) * 100}%` as `${number}%` },
                ]}
              />
            </View>
          ) : null}

          {estado !== 'descanso' && exercises.map((ex) => {
            const exSets = sets[ex.id] ?? {};
            const isActive = expanded?.exId === ex.id;
            const progression = progressionByExercise[ex.id];
            const firstSet = exSets[0];
            const prefillWeight = firstSet?.weight ?? 0;
            const prefillReps = firstSet?.reps ?? ex.reps[0];
            const prefillUnit = firstSet?.unit ?? ex.unidadPreferida;

            return (
              <View
                key={ex.id}
                style={[
                  styles.exCard,
                  {
                    backgroundColor: theme.bg2,
                    borderColor: isActive ? theme.border2 : theme.border,
                    borderRadius: RADII.r2,
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() => setHistoryModal({ exerciseId: ex.id, exerciseName: ex.nombre })}
                  style={[styles.exHeader, { borderBottomColor: theme.border }]}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                >
                  <View style={styles.exHeaderLeft}>
                    <View style={styles.exNameRow}>
                      <Text style={[styles.exName, { color: theme.text1 }]}>{ex.nombre}</Text>
                      {progression?.readyToIncrease ? (
                        <View style={[styles.progressionBadge, { backgroundColor: SEMANTIC.greenA }]}>
                          <Text style={[styles.progressionBadgeText, { color: SEMANTIC.green }]}>Subir peso</Text>
                        </View>
                      ) : null}
                    </View>
                    <View style={styles.exChips}>
                      <View style={[styles.exChip, { backgroundColor: theme.accentA }]}>
                        <Text style={[styles.exChipAccent, { color: theme.accent }]}>
                          {ex.series}x{ex.reps[0]}-{ex.reps[1]}
                        </Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>RIR {ex.rir}</Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>{Math.round(ex.descansoSeg / 60)} min</Text>
                      </View>
                      {ex.supersetGroup ? (
                        <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                          <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>Superset</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View style={styles.exHeaderRight}>
                    <Text style={[styles.exLastLabel, { color: theme.text3 }]}>Ultima vez</Text>
                    <Text style={[styles.exLastValue, { color: theme.text2 }]}>
                      {formatSet(prefillWeight, prefillUnit, prefillReps)}
                    </Text>
                    <Text style={[styles.historialLink, { color: theme.accent }]}>Historial</Text>
                  </View>
                </TouchableOpacity>

                {!ex.esBodyweight ? (
                  <View style={[styles.unitToggle, { backgroundColor: theme.bg3, borderColor: theme.border }]}>
                    {UNITS.map((unit) => {
                      const active = ex.unidadPreferida === unit;
                      return (
                        <TouchableOpacity
                          key={unit}
                          onPress={() => setExerciseUnit(ex.id, unit)}
                          style={[styles.unitSeg, active && { backgroundColor: theme.accent }]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: active }}
                        >
                          <Text style={[styles.unitSegText, { color: active ? '#fff' : theme.text3 }]}>{unit}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null}

                {Array.from({ length: ex.series }).map((_, si) => {
                  const s = exSets[si] ?? {
                    weight: prefillWeight,
                    unit: prefillUnit,
                    reps: prefillReps,
                    rir: ex.rir,
                    done: false,
                  };
                  const isExp = expanded?.exId === ex.id && expanded?.setIdx === si;
                  const isLast = si === ex.series - 1;

                  return (
                    <View key={si}>
                      <TouchableOpacity
                        onPress={() => handleToggle(ex.id, si)}
                        style={[
                          styles.setRow,
                          {
                            borderBottomColor: theme.border,
                            borderBottomWidth: isExp || !isLast ? 1 : 0,
                            backgroundColor: isExp ? theme.bg3 : 'transparent',
                          },
                        ]}
                        activeOpacity={0.72}
                        accessibilityRole="button"
                      >
                        <TouchableOpacity
                          onPress={() => handleToggleCircle(ex.id, si)}
                          style={[
                            styles.setCircle,
                            {
                              backgroundColor: s.done ? SEMANTIC.greenA : isExp ? theme.accentA : theme.bg4,
                              borderColor: isExp ? theme.accent : 'transparent',
                            },
                          ]}
                          activeOpacity={0.7}
                          accessibilityRole="button"
                          accessibilityLabel={`Marcar serie ${si + 1} como completada`}
                        >
                          {s.done ? (
                            <Icon name="check" size={13} color={SEMANTIC.green} strokeW={2.5} />
                          ) : (
                            <Text style={[styles.setNum, { color: isExp ? theme.accent : theme.text3 }]}>{si + 1}</Text>
                          )}
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.setWeightReps, { color: s.done ? theme.text3 : theme.text1 }]}>
                            {formatSet(s.weight, s.unit, s.reps)}
                          </Text>
                          {si > 0 && !s.done && !s.dirty ? (
                            <Text style={[styles.copyHint, { color: theme.text4 }]}>Copiada de la anterior</Text>
                          ) : null}
                        </View>
                        <View style={[styles.rirBadge, { backgroundColor: s.done ? SEMANTIC.greenA : theme.bg4 }]}>
                          <Text style={[styles.rirBadgeText, { color: s.done ? SEMANTIC.green : theme.text4 }]}>
                            {s.done ? 'OK' : `RIR ${s.rir}`}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {isExp ? (
                        <View
                          style={[
                            styles.loggerExpanded,
                            {
                              backgroundColor: theme.bg3,
                              borderBottomColor: theme.border,
                              borderBottomWidth: !isLast ? 1 : 0,
                            },
                          ]}
                        >
                          <View style={styles.quickActions}>
                            {si > 0 ? (
                              <TouchableOpacity
                                onPress={() => handleCopyPrevious(ex.id, si)}
                                style={[styles.quickBtn, { backgroundColor: theme.bg4, borderColor: theme.border2 }]}
                              >
                                <Text style={[styles.quickBtnText, { color: theme.text2 }]}>= anterior</Text>
                              </TouchableOpacity>
                            ) : null}
                            {s.done ? (
                              <TouchableOpacity
                                onPress={() => handleUndoSet(ex.id, si)}
                                style={[styles.quickBtn, { backgroundColor: theme.bg4, borderColor: theme.border2 }]}
                              >
                                <Text style={[styles.quickBtnText, { color: SEMANTIC.green }]}>Deshacer</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View style={styles.steppers}>
                            <Stepper
                              value={s.weight}
                              onChange={(v) => handleUpdateSet(ex.id, si, 'weight', v)}
                              step={s.unit === 'bw' ? 0 : s.unit === 'placas' ? 1 : s.unit === 'lb' ? 5 : 2.5}
                              min={0}
                              label="Peso"
                              unit={s.unit}
                            />
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
                            {s.done ? 'Guardar cambios' : `Completar serie ${si + 1}`}
                          </BtnPrimary>
                        </View>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            );
          })}

          {estado === 'pendiente' ? (
            <View style={styles.finishWrap}>
              <BtnPrimary onPress={handleFinishSession} icon="check">
                {sessionComplete ? 'Finalizar sesion' : 'Terminar rutina'}
              </BtnPrimary>
            </View>
          ) : null}
        </ScrollView>

        {restTimer.active ? (
          <RestTimerBar
            remaining={restTimer.remaining}
            total={restTimer.total}
            nombre={restTimer.label}
            onSkip={() => restTimer.stop().catch((err) => console.error('[TrainScreen] stop rest timer error', err))}
            onAdd30={() => restTimer.addSeconds(30).catch((err) => console.error('[TrainScreen] add rest timer error', err))}
          />
        ) : null}
      </View>

      {historyModal ? (
        <ExerciseHistoryScreen
          exerciseId={historyModal.exerciseId}
          exerciseName={historyModal.exerciseName}
          onClose={() => setHistoryModal(null)}
        />
      ) : null}

      <Modal
        visible={sessionPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionPickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSessionPickerOpen(false)}
        >
          <View style={[styles.pickerCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
            <Text style={[styles.pickerTitle, { color: theme.text1 }]}>Elegir sesion de hoy</Text>
            {ROUTINE_SESSIONS.map((t) => {
              const active = t === tipoSesion;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleSelectSession(t)}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.pickerRowText, { color: active ? theme.accent : theme.text2 }]}>{t}</Text>
                  {active ? <Icon name="check" size={18} color={theme.accent} strokeW={2} /> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { gap: 12 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 8, paddingBottom: 0 },
  enCurso: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  sessionName: { fontSize: 28, fontWeight: '900', letterSpacing: 0 },
  elapsedWrap: { alignItems: 'flex-end' },
  elapsedTime: { fontSize: 20, fontWeight: '900', fontVariant: ['tabular-nums'] },
  seriesCount: { fontSize: 12, marginTop: 1 },
  sessionControls: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  ctrlBtn: { flex: 1, minHeight: 46, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ctrlBtnText: { fontSize: 13, fontWeight: '700' },
  restBanner: { marginHorizontal: 20, borderWidth: 1, borderRadius: RADII.r2, paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center', gap: 8 },
  restBannerTitle: { fontSize: 17, fontWeight: '800', marginTop: 4 },
  restBannerSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginHorizontal: 20 },
  progressFill: { height: '100%', borderRadius: 2 },
  exCard: { borderWidth: 1, overflow: 'hidden', marginHorizontal: 20 },
  exHeader: { padding: 14, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  exHeaderLeft: { flex: 1 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 5 },
  exName: { fontSize: 16, fontWeight: '800' },
  progressionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  progressionBadgeText: { fontSize: 11, fontWeight: '800' },
  exChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  exChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  exChipAccent: { fontSize: 11, fontWeight: '700' },
  exChipNeutral: { fontSize: 11, fontWeight: '700' },
  exHeaderRight: { alignItems: 'flex-end', flexShrink: 0 },
  exLastLabel: { fontSize: 11, marginBottom: 1 },
  exLastValue: { fontSize: 13, fontWeight: '800' },
  historialLink: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  unitToggle: { flexDirection: 'row', borderWidth: 1, borderRadius: RADII.r1, marginHorizontal: 14, marginTop: 10, overflow: 'hidden' },
  unitSeg: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  unitSegText: { fontSize: 12, fontWeight: '800' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  setCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setNum: { fontSize: 12, fontWeight: '800' },
  setWeightReps: { fontSize: 16, fontWeight: '800' },
  copyHint: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  rirBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  rirBadgeText: { fontSize: 12, fontWeight: '800' },
  loggerExpanded: { padding: 16 },
  quickActions: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  quickBtn: { minHeight: 40, paddingHorizontal: 14, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quickBtnText: { fontSize: 13, fontWeight: '800' },
  steppers: { gap: 18, marginBottom: 18 },
  rirRow: { marginBottom: 14 },
  finishWrap: { marginHorizontal: 20, marginTop: 4, marginBottom: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 28 },
  pickerCard: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: RADII.r2, padding: 8, paddingTop: 14 },
  pickerTitle: { fontSize: 16, fontWeight: '900', paddingHorizontal: 14, marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 54, paddingHorizontal: 14, borderTopWidth: 1 },
  pickerRowText: { fontSize: 16, fontWeight: '700' },
});
