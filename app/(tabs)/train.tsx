import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme, RADII, SEMANTIC } from '../../src/constants/theme';
import Stepper from '../../src/components/Stepper';
import RirSelector from '../../src/components/RirSelector';
import RestTimerBar from '../../src/components/RestTimerBar';
import BtnPrimary from '../../src/components/BtnPrimary';
import Icon from '../../src/components/Icon';
import { useWorkout } from '../../src/hooks/useWorkout';
import { SESSION_ROTATION } from '../../src/utils/sessionRotation';
import { initDB, getDB } from '../../src/db';
import ExerciseHistoryScreen from '../../src/screens/ExerciseHistoryScreen';

// expo-notifications is unavailable in Expo Go on Android (SDK 53+). Use require so
// the module error is caught at runtime instead of crashing the whole screen.
type NotifModule = typeof import('expo-notifications');
let Notifs: NotifModule | null = null;
try {
  Notifs = require('expo-notifications') as NotifModule;
  Notifs.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch {
  // Expo Go on Android — notifications will work after EAS build
}

// ---------------------------------------------------------------------------
// Local types (UI-only, not persisted)
// ---------------------------------------------------------------------------

interface Expanded {
  exId: number;
  setIdx: number;
}

interface RestTimer {
  active: boolean;
  remaining: number;
  total: number;
  nombre: string;
  /** Absolute epoch ms when the timer should hit 0 (0 when inactive). */
  endTime: number;
}

interface HistoryModal {
  exerciseId: number;
  exerciseName: string;
}

interface CardioLog {
  id: number;
  tipo: string;
  minutos: number;
  fc_promedio_ppm: number | null;
  zona: number | null;
}

const CARDIO_TIPOS: { key: string; label: string; icon: string }[] = [
  { key: 'bici', label: 'Bici', icon: 'bike' },
  { key: 'pasos', label: 'Pasos', icon: 'run' },
  { key: 'otro', label: 'Otro', icon: 'heart' },
];

const CARDIO_TIPO_ICON: Record<string, string> = {
  bici: 'bike',
  pasos: 'run',
  otro: 'heart',
};

const CARDIO_TIPO_LABEL: Record<string, string> = {
  bici: 'Bici',
  pasos: 'Pasos',
  otro: 'Otro',
};

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function TrainScreen() {
  const { theme } = useTheme();

  // --- Data layer ---------------------------------------------------------
  const {
    loading,
    exercises,
    sets,
    progressionByExercise,
    sessionComplete,
    completeSet,
    updateSet,
    finishSession,
    selectSession,
    markRestDay,
    undoRestDay,
    togglePlacas,
    tipoSesion,
    estado,
  } = useWorkout();

  // --- Ephemeral UI state -------------------------------------------------
  const [expanded, setExpanded] = useState<Expanded | null>(null);
  const [restTimer, setRestTimer] = useState<RestTimer>({ active: false, remaining: 0, total: 0, nombre: '', endTime: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionPickerOpen, setSessionPickerOpen] = useState(false);
  const [historyModal, setHistoryModal] = useState<HistoryModal | null>(null);
  const notifIdRef = useRef<string | null>(null);

  // --- Cardio quick-log state ---------------------------------------------
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [cardioFormOpen, setCardioFormOpen] = useState(false);
  const [cardioForm, setCardioForm] = useState<{ tipo: string; minutos: number }>({
    tipo: 'bici',
    minutos: 30,
  });

  const loadCardio = useCallback(async () => {
    try {
      await initDB(); // ensures DB is ready — idempotent, safe to call multiple times
      const db = getDB();
      const rows = await db.getAllAsync<CardioLog>(
        `SELECT id, tipo, minutos, fc_promedio_ppm, zona
         FROM cardio_logs WHERE fecha = date('now') ORDER BY id ASC`
      );
      setCardioLogs(rows);
    } catch (err) {
      console.error('[TrainScreen] loadCardio error', err);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCardio();
    }, [loadCardio])
  );

  const handleSaveCardio = async () => {
    try {
      const db = getDB();
      await db.runAsync(
        `INSERT INTO cardio_logs (fecha, tipo, minutos) VALUES (date('now'), ?, ?)`,
        [cardioForm.tipo, cardioForm.minutos]
      );
      setCardioFormOpen(false);
      setCardioForm({ tipo: 'bici', minutos: 30 });
      await loadCardio();
    } catch (err) {
      console.error('[TrainScreen] saveCardio error', err);
    }
  };

  const handleDeleteCardio = (id: number) => {
    Alert.alert(
      'Eliminar cardio',
      '¿Eliminar este registro de cardio?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            (async () => {
              try {
                const db = getDB();
                await db.runAsync(`DELETE FROM cardio_logs WHERE id = ?`, [id]);
                await loadCardio();
              } catch (err) {
                console.error('[TrainScreen] deleteCardio error', err);
              }
            })();
          },
        },
      ]
    );
  };

  // Notification permissions + Android channel (no-op in Expo Go)
  useEffect(() => {
    if (!Notifs) return;
    Notifs.requestPermissionsAsync();
    Notifs.setNotificationChannelAsync('rest-timer', {
      name: 'Descanso entre series',
      importance: Notifs.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
    });
  }, []);

  // Session elapsed clock — only runs once the user confirms their first set
  useEffect(() => {
    if (!sessionStarted) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [sessionStarted]);

  // Rest timer countdown
  useEffect(() => {
    if (!restTimer.active || restTimer.remaining <= 0) return;
    const t = setInterval(() => {
      setRestTimer((r) => {
        if (r.remaining <= 1) {
          notifIdRef.current = null;
          return { ...r, active: false, remaining: 0 };
        }
        return { ...r, remaining: r.remaining - 1 };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [restTimer.active, restTimer.remaining > 0]);

  // Re-sync the rest timer from the absolute endTime when the app returns to
  // the foreground. The JS thread can be throttled while backgrounded, so the
  // countdown above may be stale — recompute from wall-clock time.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState !== 'active') return;
      setRestTimer((r) => {
        if (!r.active) return r;
        const remaining = Math.max(0, Math.round((r.endTime - Date.now()) / 1000));
        if (remaining <= 0) {
          notifIdRef.current = null;
          return { ...r, active: false, remaining: 0 };
        }
        return { ...r, remaining };
      });
    });
    return () => sub.remove();
  }, []);

  // --- Derived values -----------------------------------------------------
  const totalSeries = exercises.reduce((a, ex) => a + ex.series, 0);
  const doneSeries = Object.values(sets).reduce(
    (a, exSets) => a + Object.values(exSets).filter((s) => s.done).length,
    0
  );

  const elapsedMin = Math.floor(elapsed / 60);
  const elapsedSec = elapsed % 60;
  const elapsedLabel = `${elapsedMin}:${String(elapsedSec).padStart(2, '0')}`;

  // --- Notification helpers -----------------------------------------------

  const scheduleRestNotif = async (seconds: number, exName: string) => {
    if (!Notifs) return;
    if (notifIdRef.current) {
      await Notifs.cancelScheduledNotificationAsync(notifIdRef.current).catch(() => {});
      notifIdRef.current = null;
    }
    const id = await Notifs.scheduleNotificationAsync({
      content: {
        title: '¡Descanso terminado!',
        body: `Retomá la sesión — ${exName}`,
        sound: true,
        data: { type: 'rest-timer' },
      },
      trigger: {
        type: Notifs.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
    notifIdRef.current = id;
  };

  const cancelRestNotif = () => {
    if (!Notifs || !notifIdRef.current) return;
    Notifs.cancelScheduledNotificationAsync(notifIdRef.current).catch(() => {});
    notifIdRef.current = null;
  };

  // --- Handlers -----------------------------------------------------------

  const handleToggle = (exId: number, setIdx: number) => {
    if (expanded?.exId === exId && expanded?.setIdx === setIdx) {
      setExpanded(null);
    } else {
      setExpanded({ exId, setIdx });
    }
  };

  const handleUpdateSet = (exId: number, setIdx: number, field: 'weight' | 'reps' | 'rir' | 'done', val: number | boolean) => {
    updateSet(exId, setIdx, field, val);
  };

  const handleConfirm = async (exId: number, setIdx: number) => {
    const ex = exercises.find((e) => e.id === exId);
    if (!ex) return;

    const currentSet = sets[exId]?.[setIdx];
    if (!currentSet) return;

    // UPSERT to DB
    await completeSet(exId, setIdx, { ...currentSet, done: true });

    // Start the elapsed clock on the first confirmed set of this session
    if (!sessionStarted) {
      setSessionStarted(true);
    }

    // Advance expanded to next undone set or next exercise
    const nextIdx = setIdx + 1;
    if (nextIdx < ex.series) {
      setExpanded({ exId, setIdx: nextIdx });
    } else {
      const nextEx = exercises.find((e) => e.id > exId);
      setExpanded(nextEx ? { exId: nextEx.id, setIdx: 0 } : null);
    }

    // Start rest timer using the exercise's real descanso_seg
    const timerNombre = ex.nombre.split(' ').slice(0, 2).join(' ');
    setRestTimer({
      active: true,
      remaining: ex.descansoSeg,
      total: ex.descansoSeg,
      nombre: timerNombre,
      endTime: Date.now() + ex.descansoSeg * 1000,
    });
    scheduleRestNotif(ex.descansoSeg, timerNombre);
  };

  const handleFinishSession = () => {
    const msg = sessionComplete
      ? '¿Terminaste el entrenamiento? Esto marcará la sesión como completada.'
      : 'Hay ejercicios sin completar. ¿Terminar la rutina igual? Se guardará lo que registraste y contará como sesión hecha.';
    Alert.alert('Terminar rutina', msg, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Terminar', style: 'default', onPress: () => finishSession() },
    ]);
  };

  const handleMarkRest = () => {
    Alert.alert(
      'No fui al gym',
      '¿Marcar hoy como día de descanso? No avanza la rotación de la rutina.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sí, descanso', style: 'default', onPress: () => markRestDay() },
      ]
    );
  };

  const handleSelectSession = (tipo: string) => {
    setSessionPickerOpen(false);
    if (tipo === tipoSesion && estado !== 'descanso') return;
    if (estado === 'pendiente') {
      Alert.alert(
        'Cambiar sesión',
        'Vas a cambiar de sesión. Se descartará lo que registraste hoy. ¿Continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cambiar', style: 'destructive', onPress: () => selectSession(tipo) },
        ]
      );
    } else {
      selectSession(tipo);
    }
  };

  // Estado label + accent for the header
  const ESTADO_META: Record<string, { label: string; tone: 'accent' | 'green' | 'muted' }> = {
    sugerida: { label: 'Sugerida hoy', tone: 'accent' },
    pendiente: { label: 'En curso', tone: 'accent' },
    completada: { label: 'Completada', tone: 'green' },
    descanso: { label: 'Día de descanso', tone: 'muted' },
  };
  const estadoMeta = ESTADO_META[estado] ?? ESTADO_META.sugerida;
  const estadoColor =
    estadoMeta.tone === 'green' ? SEMANTIC.green : estadoMeta.tone === 'muted' ? theme.text3 : theme.accent;

  // --- Loading guard ------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text3 }]}>Cargando sesión…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Main render --------------------------------------------------------
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: restTimer.active ? 180 : 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Session header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.enCurso, { color: estadoColor }]}>{estadoMeta.label}</Text>
              <Text style={[styles.sessionName, { color: theme.text1 }]}>{tipoSesion.toUpperCase()}</Text>
            </View>
            {estado !== 'descanso' && (
              <View style={styles.elapsedWrap}>
                <Text style={[styles.elapsedTime, { color: theme.text1 }]}>{elapsedLabel}</Text>
                <Text style={[styles.seriesCount, { color: theme.text3 }]}>{doneSeries}/{totalSeries} series</Text>
              </View>
            )}
          </View>

          {/* Session controls — change session / mark rest day */}
          {estado !== 'completada' && (
            <View style={styles.sessionControls}>
              <TouchableOpacity
                onPress={() => setSessionPickerOpen(true)}
                style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                accessibilityLabel="Cambiar la sesión de hoy"
                accessibilityRole="button"
              >
                <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>Cambiar sesión</Text>
              </TouchableOpacity>
              {estado === 'descanso' ? (
                <TouchableOpacity
                  onPress={() => undoRestDay()}
                  style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                  accessibilityLabel="Deshacer el día de descanso"
                  accessibilityRole="button"
                >
                  <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>Deshacer descanso</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={handleMarkRest}
                  style={[styles.ctrlBtn, { backgroundColor: theme.bg3, borderColor: theme.border }]}
                  accessibilityLabel="Marcar que hoy no fui al gym"
                  accessibilityRole="button"
                >
                  <Text style={[styles.ctrlBtnText, { color: theme.text2 }]}>No fui al gym</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Rest day banner */}
          {estado === 'descanso' && (
            <View style={[styles.restBanner, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <Icon name="moon" size={28} color={theme.text3} strokeW={1.6} />
              <Text style={[styles.restBannerTitle, { color: theme.text1 }]}>Hoy es día de descanso</Text>
              <Text style={[styles.restBannerSub, { color: theme.text3 }]}>
                No avanza la rotación. La próxima sesión sigue siendo {tipoSesion}.
              </Text>
            </View>
          )}

          {/* Progress bar */}
          {estado !== 'descanso' && totalSeries > 0 && (
            <View style={[styles.progressTrack, { backgroundColor: theme.bg4, marginHorizontal: 20, marginBottom: 4 }]}>
              <View style={[styles.progressFill, { backgroundColor: theme.accent, width: `${(doneSeries / totalSeries) * 100}%` as `${number}%` }]} />
            </View>
          )}

          {/* Exercise cards */}
          {estado !== 'descanso' && exercises.map((ex) => {
            const exSets = sets[ex.id] ?? {};
            const isActive = expanded?.exId === ex.id;
            const progression = progressionByExercise[ex.id];
            const readyToIncrease = progression?.readyToIncrease ?? false;

            // Pre-fill fallback: first set's prefilled values or zeros
            const firstSet = exSets[0];
            const prefillPeso = firstSet?.weight ?? 0;
            const prefillReps = firstSet?.reps ?? ex.reps[0];

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
                {/* Exercise header — tap for history */}
                <TouchableOpacity
                  onPress={() => setHistoryModal({ exerciseId: ex.id, exerciseName: ex.nombre })}
                  style={[styles.exHeader, { borderBottomColor: theme.border }]}
                  activeOpacity={0.75}
                  accessibilityLabel={`Ver historial de ${ex.nombre}`}
                  accessibilityRole="button"
                >
                  <View style={styles.exHeaderLeft}>
                    <View style={styles.exNameRow}>
                      <Text style={[styles.exName, { color: theme.text1 }]}>{ex.nombre}</Text>
                      {readyToIncrease && (
                        <View style={[styles.progressionBadge, { backgroundColor: SEMANTIC.greenA }]}>
                          <Text style={[styles.progressionBadgeText, { color: SEMANTIC.green }]}>↑ Subir peso</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.exChips}>
                      <View style={[styles.exChip, { backgroundColor: theme.accentA }]}>
                        <Text style={[styles.exChipAccent, { color: theme.accent }]}>
                          {ex.series}×{ex.reps[0]}–{ex.reps[1]}
                        </Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>RIR {ex.rir}</Text>
                      </View>
                      <View style={[styles.exChip, { backgroundColor: theme.bg3 }]}>
                        <Text style={[styles.exChipNeutral, { color: theme.text3 }]}>{ex.grupoMuscular}</Text>
                      </View>
                      {!ex.esBodyweight && (
                        <View style={[styles.unitToggle, { backgroundColor: theme.bg4, borderColor: theme.border2 }]}>
                          <TouchableOpacity
                            onPress={() => { if (ex.usaPlacas) togglePlacas(ex.id); }}
                            style={[styles.unitSeg, !ex.usaPlacas && { backgroundColor: theme.accent }]}
                            hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: !ex.usaPlacas }}
                            accessibilityLabel={`Registrar ${ex.nombre} en kilogramos`}
                          >
                            <Text style={[styles.unitSegText, { color: !ex.usaPlacas ? '#fff' : theme.text3 }]}>
                              kg
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => { if (!ex.usaPlacas) togglePlacas(ex.id); }}
                            style={[styles.unitSeg, ex.usaPlacas && { backgroundColor: theme.accent }]}
                            hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: ex.usaPlacas }}
                            accessibilityLabel={`Registrar ${ex.nombre} en placas`}
                          >
                            <Text style={[styles.unitSegText, { color: ex.usaPlacas ? '#fff' : theme.text3 }]}>
                              placas
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.exHeaderRight}>
                    <Text style={[styles.exLastLabel, { color: theme.text3 }]}>Última vez</Text>
                    <Text style={[styles.exLastValue, { color: theme.text2 }]}>
                      {ex.esBodyweight
                        ? `BW × ${prefillReps}`
                        : `${prefillPeso} ${ex.usaPlacas ? 'placas' : 'kg'} × ${prefillReps}`}
                    </Text>
                    <Text style={[styles.historialLink, { color: theme.accent }]}>Historial →</Text>
                  </View>
                </TouchableOpacity>

                {/* Set rows */}
                {Array.from({ length: ex.series }).map((_, si) => {
                  const s = exSets[si] ?? { weight: prefillPeso, reps: prefillReps, rir: ex.rir, done: false };
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
                            {s.weight === 0 ? 'BW' : `${s.weight} ${ex.usaPlacas ? 'placas' : 'kg'}`}
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
                              step={ex.esBodyweight ? 0 : ex.usaPlacas ? 1 : 2.5}
                              min={0}
                              label="Peso"
                              unit={ex.usaPlacas ? 'placas' : 'kg'}
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

          {/* Finish button — available throughout an in-progress session so the
              user can end early (machine busy, has to leave). */}
          {estado === 'pendiente' && (
            <View style={{ marginHorizontal: 20, marginTop: 8, marginBottom: 16 }}>
              <BtnPrimary onPress={handleFinishSession} icon="check">
                {sessionComplete ? 'Finalizar sesión' : 'Terminar rutina'}
              </BtnPrimary>
            </View>
          )}

          {/* Cardio de hoy */}
          <View
            style={[
              styles.cardioCard,
              {
                backgroundColor: theme.bg2,
                borderColor: theme.border,
                borderRadius: RADII.r2,
                marginHorizontal: 20,
                marginTop: 8,
                marginBottom: 16,
              },
            ]}
          >
            <View style={styles.cardioHeader}>
              <Text style={[styles.cardioTitle, { color: theme.text1 }]}>Cardio de hoy</Text>
            </View>

            {cardioLogs.length === 0 ? (
              <Text style={[styles.cardioEmpty, { color: theme.text3 }]}>
                Sin cardio registrado hoy
              </Text>
            ) : (
              cardioLogs.map((c, ci) => (
                <TouchableOpacity
                  key={c.id}
                  onLongPress={() => handleDeleteCardio(c.id)}
                  style={[
                    styles.cardioRow,
                    {
                      borderTopColor: theme.border,
                      borderTopWidth: ci === 0 ? 1 : 0,
                      borderBottomColor: theme.border,
                      borderBottomWidth: ci < cardioLogs.length - 1 ? 1 : 0,
                    },
                  ]}
                  activeOpacity={0.8}
                  accessibilityLabel={`${CARDIO_TIPO_LABEL[c.tipo] ?? c.tipo}, ${c.minutos} minutos, mantén presionado para eliminar`}
                >
                  <View style={[styles.cardioIconWrap, { backgroundColor: theme.bg3 }]}>
                    <Icon name={CARDIO_TIPO_ICON[c.tipo] ?? 'heart'} size={15} color={theme.text2} strokeW={1.7} />
                  </View>
                  <Text style={[styles.cardioRowTipo, { color: theme.text1 }]}>
                    {CARDIO_TIPO_LABEL[c.tipo] ?? c.tipo}
                  </Text>
                  <Text style={[styles.cardioRowMin, { color: theme.text3 }]}>{c.minutos} min</Text>
                </TouchableOpacity>
              ))
            )}

            {!cardioFormOpen ? (
              <TouchableOpacity
                onPress={() => setCardioFormOpen(true)}
                style={[styles.cardioAddBtn, { backgroundColor: theme.accentA, borderRadius: RADII.r1 }]}
                accessibilityLabel="Registrar cardio"
                accessibilityRole="button"
              >
                <Text style={[styles.cardioAddText, { color: theme.accent }]}>＋ Registrar cardio</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.cardioForm, { borderTopColor: theme.border }]}>
                {/* Tipo chips */}
                <View style={styles.cardioChipsRow}>
                  {CARDIO_TIPOS.map((t) => {
                    const active = cardioForm.tipo === t.key;
                    return (
                      <TouchableOpacity
                        key={t.key}
                        onPress={() => setCardioForm((f) => ({ ...f, tipo: t.key }))}
                        style={[
                          styles.cardioChip,
                          {
                            backgroundColor: active ? theme.accentA : theme.bg3,
                            borderColor: active ? theme.accent : theme.border,
                          },
                        ]}
                        accessibilityLabel={`Tipo ${t.label}`}
                        accessibilityRole="button"
                      >
                        <Icon name={t.icon} size={15} color={active ? theme.accent : theme.text3} strokeW={1.7} />
                        <Text style={[styles.cardioChipText, { color: active ? theme.accent : theme.text2 }]}>
                          {t.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Minutos stepper */}
                <View style={styles.cardioStepperWrap}>
                  <Stepper
                    value={cardioForm.minutos}
                    onChange={(v) => setCardioForm((f) => ({ ...f, minutos: Math.min(180, v) }))}
                    step={5}
                    min={5}
                    label="Minutos"
                    unit="min"
                  />
                </View>

                <BtnPrimary onPress={handleSaveCardio} icon="check">
                  Guardar
                </BtnPrimary>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Rest timer overlay */}
        {restTimer.active && (
          <RestTimerBar
            remaining={restTimer.remaining}
            total={restTimer.total}
            nombre={restTimer.nombre}
            onSkip={() => {
              cancelRestNotif();
              setRestTimer((r) => ({ ...r, active: false }));
            }}
            onAdd30={() => {
              const newRemaining = restTimer.remaining + 30;
              setRestTimer((r) => ({ ...r, remaining: r.remaining + 30, endTime: r.endTime + 30 * 1000 }));
              scheduleRestNotif(newRemaining, restTimer.nombre);
            }}
          />
        )}
      </View>

      {/* Exercise history modal */}
      {historyModal && (
        <ExerciseHistoryScreen
          exerciseId={historyModal.exerciseId}
          exerciseName={historyModal.exerciseName}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {/* Session picker modal */}
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
            <Text style={[styles.pickerTitle, { color: theme.text1 }]}>Elegir sesión de hoy</Text>
            {SESSION_ROTATION.map((t) => {
              const active = t === tipoSesion;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleSelectSession(t)}
                  style={[styles.pickerRow, { borderColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`Sesión ${t}`}
                >
                  <Text style={[styles.pickerRowText, { color: active ? theme.accent : theme.text2 }]}>
                    {t}
                  </Text>
                  {active && <Icon name="check" size={18} color={theme.accent} strokeW={2} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {},
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 8, paddingBottom: 12 },
  enCurso: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.9, marginBottom: 2 },
  sessionName: { fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  elapsedWrap: { alignItems: 'flex-end' },
  elapsedTime: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
  seriesCount: { fontSize: 12, marginTop: 1 },
  sessionControls: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 10 },
  ctrlBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  ctrlBtnText: { fontSize: 13, fontWeight: '600' },
  restBanner: {
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  restBannerTitle: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  restBannerSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  pickerCard: { width: '100%', maxWidth: 360, borderWidth: 1, borderRadius: 16, padding: 8, paddingTop: 14 },
  pickerTitle: { fontSize: 16, fontWeight: '800', paddingHorizontal: 14, marginBottom: 8 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  pickerRowText: { fontSize: 16, fontWeight: '600' },
  progressTrack: { height: 4, borderRadius: 2, overflow: 'hidden', marginTop: 10, marginBottom: 10 },
  progressFill: { height: '100%', borderRadius: 2 },
  exCard: { borderWidth: 1, overflow: 'hidden' },
  exHeader: { padding: 13, paddingBottom: 11, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  exHeaderLeft: { flex: 1 },
  exNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  exName: { fontSize: 15, fontWeight: '700' },
  progressionBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  progressionBadgeText: { fontSize: 11, fontWeight: '700' },
  exChips: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  exChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  exChipAccent: { fontSize: 11, fontWeight: '600' },
  exChipNeutral: { fontSize: 11, fontWeight: '600' },
  unitToggle: { flexDirection: 'row', borderRadius: 6, borderWidth: 1, overflow: 'hidden', minHeight: 26 },
  unitSeg: { paddingHorizontal: 11, paddingVertical: 3, alignItems: 'center', justifyContent: 'center', minHeight: 24 },
  unitSegText: { fontSize: 11, fontWeight: '700' },
  exHeaderRight: { alignItems: 'flex-end', flexShrink: 0, marginLeft: 8 },
  exLastLabel: { fontSize: 11, marginBottom: 1 },
  exLastValue: { fontSize: 13, fontWeight: '700' },
  historialLink: { fontSize: 11, fontWeight: '600', marginTop: 2 },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  setCircle: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  setNum: { fontSize: 12, fontWeight: '700' },
  setWeightReps: { fontSize: 15, fontWeight: '700' },
  rirBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  rirBadgeText: { fontSize: 12, fontWeight: '700' },
  loggerExpanded: { padding: 16 },
  steppers: { flexDirection: 'column', gap: 20, marginBottom: 20 },
  rirRow: { marginBottom: 14 },
  cardioCard: { borderWidth: 1, overflow: 'hidden' },
  cardioHeader: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  cardioTitle: { fontSize: 15, fontWeight: '700' },
  cardioEmpty: { fontSize: 13, paddingHorizontal: 16, paddingBottom: 12 },
  cardioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  cardioIconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardioRowTipo: { flex: 1, fontSize: 14, fontWeight: '600' },
  cardioRowMin: { fontSize: 13, fontWeight: '600' },
  cardioAddBtn: { margin: 16, marginTop: 12, height: 48, alignItems: 'center', justifyContent: 'center' },
  cardioAddText: { fontSize: 14, fontWeight: '700' },
  cardioForm: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16, borderTopWidth: 1, gap: 16 },
  cardioChipsRow: { flexDirection: 'row', gap: 8 },
  cardioChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 48, borderRadius: 8, borderWidth: 1 },
  cardioChipText: { fontSize: 13, fontWeight: '700' },
  cardioStepperWrap: { marginVertical: 4 },
});
