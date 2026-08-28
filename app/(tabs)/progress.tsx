import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
  Modal,
} from 'react-native';

function formatIsoDate(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, MACRO_COLORS, SEMANTIC } from '../../src/constants/theme';
import StatCard from '../../src/components/StatCard';
import SectionLabel from '../../src/components/SectionLabel';
import LineChart from '../../src/components/LineChart';
import BtnPrimary from '../../src/components/BtnPrimary';
import { useMetrics } from '../../src/hooks/useMetrics';
import { useGoalWeight } from '../../src/hooks/useGoalWeight';
import LogMetricScreen from '../../src/screens/LogMetricScreen';
import { useActivityCalendar } from '../../src/hooks/useActivityCalendar';
import ActivityCalendar from '../../src/components/ActivityCalendar';
import { useMuscleLoad } from '../../src/hooks/useMuscleLoad';
import BodyMap from '../../src/components/BodyMap';
import { missedMuscles, workedMuscles, type MuscleWindow } from '../../src/utils/muscleLoad';

// Away-from-goal red — same color already used for this exact meaning on the Hoy dashboard.
const AWAY_FROM_GOAL = '#D95240';

const LEVEL_ALPHA = ['', '33', '66', '99', ''] as const; // index = level 0-4, matches ActivityCalendar's scale

function muscleColorsByLevel(
  levels: Partial<Record<string, 0 | 1 | 2 | 3 | 4>>,
  accent: string,
  emptyColor: string
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [muscle, level] of Object.entries(levels)) {
    if (level === undefined) continue;
    out[muscle] = level === 0 ? emptyColor : level === 4 ? accent : `${accent}${LEVEL_ALPHA[level]}`;
  }
  return out;
}

type TabKey = 'peso' | 'fuerza' | 'cintura' | 'fotos' | 'musculos';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'cintura', label: 'Cintura' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'musculos', label: 'Musculos' },
];

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<TabKey>('peso');
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [exerciseModalVisible, setExerciseModalVisible] = useState(false);

  const {
    loading,
    weightEntries,
    waistEntries,
    weeklyWeight,
    weeklyWaist,
    weightAvg,
    weightTrend,
    strengthExercises,
    strengthByExercise,
    defaultExerciseId,
    lastMetric,
    photoEntries,
    saveMetric,
    deleteMetric,
  } = useMetrics();

  const { days: activityDays } = useActivityCalendar();
  const { goalWeight } = useGoalWeight();
  const [muscleWindow, setMuscleWindow] = useState<MuscleWindow>(7);
  const { load: muscleLoad, levels: muscleLevels } = useMuscleLoad(muscleWindow);

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    defaultExerciseId
  );

  // Sync selectedExerciseId when defaultExerciseId resolves (async load)
  useEffect(() => {
    if (selectedExerciseId === null && defaultExerciseId !== null) {
      setSelectedExerciseId(defaultExerciseId);
    }
  }, [defaultExerciseId, selectedExerciseId]);

  const photoColSize = (width - 40 - 8) / 2;

  const trendArrow = useMemo(
    () => (weightTrend === 'up' ? '+' : weightTrend === 'down' ? '-' : '='),
    [weightTrend]
  );

  // Only overrides the trend color when a goal is set — otherwise StatCard keeps
  // its default neutral color (no goal = no "good/bad direction" judgement).
  const trendColor = useMemo(() => {
    if (goalWeight == null || weightAvg <= 0 || weightTrend === 'stable') return undefined;
    const towardGoal = goalWeight > weightAvg ? weightTrend === 'up' : weightTrend === 'down';
    return towardGoal ? SEMANTIC.green : AWAY_FROM_GOAL;
  }, [goalWeight, weightAvg, weightTrend]);

  const lastPeso = useMemo(
    () => (weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].pesoKg : null),
    [weightEntries]
  );
  const lastCintura = useMemo(
    () => (waistEntries.length > 0 ? waistEntries[waistEntries.length - 1].cinturaCm : null),
    [waistEntries]
  );

  const handleSaveMetric = async (
    peso: number | undefined,
    cintura: number | undefined,
    fotoUri: string | undefined
  ): Promise<void> => {
    await saveMetric({
      pesoKg: peso ?? 0,
      cinturaCm: cintura ?? null,
      fotoUri: fotoUri ?? null,
    });
  };

  // Strength chart data for the selected exercise
  const selectedStrengthPoints = useMemo(
    () => (selectedExerciseId !== null ? (strengthByExercise[selectedExerciseId] ?? []) : []),
    [selectedExerciseId, strengthByExercise]
  );
  const selectedExercise = useMemo(
    () => strengthExercises.find((e) => e.id === selectedExerciseId),
    [selectedExerciseId, strengthExercises]
  );
  const selectedExerciseName = selectedExercise?.nombre ?? '';
  const unitLabel = selectedExercise?.unidadPreferida === 'bw' ? 'BW' : selectedExercise?.unidadPreferida ?? 'kg';
  const latestStrength = useMemo(
    () => selectedStrengthPoints[selectedStrengthPoints.length - 1]?.maxPesoKg ?? null,
    [selectedStrengthPoints]
  );
  const bestStrength = useMemo(
    () => (selectedStrengthPoints.length > 0
      ? Math.max(...selectedStrengthPoints.map((p) => p.maxPesoKg))
      : null),
    [selectedStrengthPoints]
  );
  const strengthDelta = useMemo(
    () => (selectedStrengthPoints.length > 1
      ? selectedStrengthPoints[selectedStrengthPoints.length - 1].maxPesoKg - selectedStrengthPoints[0].maxPesoKg
      : null),
    [selectedStrengthPoints]
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text1 }]}>Progreso</Text>
          <TouchableOpacity
            onPress={() => setLogModalVisible(true)}
            style={[styles.fabHeader, { backgroundColor: theme.accent, borderRadius: RADII.r4 }]}
            hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Calendario de actividad */}
        <SectionLabel>Actividad</SectionLabel>
        <View
          style={[
            styles.chartCard,
            {
              backgroundColor: theme.bg2,
              borderColor: theme.border,
              borderRadius: RADII.r2,
              marginHorizontal: 20,
              marginBottom: 14,
              paddingVertical: 14,
            },
          ]}
        >
          <ActivityCalendar days={activityDays} />
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {TABS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={[
                styles.tabBtn,
                {
                  backgroundColor: tab === key ? theme.accentA : theme.bg3,
                  borderColor: tab === key ? theme.accentA : theme.border,
                  borderRadius: RADII.r1,
                },
              ]}
            >
              <Text style={[styles.tabBtnText, { color: tab === key ? theme.accent : theme.text2 }]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ===== PESO TAB ===== */}
        {tab === 'peso' && (
          <>
            {weightEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.text3 }]}>
                  Registra tu primer peso para ver el progreso
                </Text>
                <View style={styles.emptyBtn}>
                  <BtnPrimary icon="plus" onPress={() => setLogModalVisible(true)}>
                    Registrar peso de hoy
                  </BtnPrimary>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <StatCard
                      icon="weight"
                      label="Promedio 7 dias"
                      value={String(Math.round(weightAvg * 10) / 10)}
                      unit="kg"
                      sub={`${weightEntries.length} medic.`}
                    />
                  </View>
                  <View style={styles.statItem}>
                    <StatCard
                      icon="chart"
                      label="Tendencia"
                      value={trendArrow}
                      unit=""
                      sub={goalWeight != null ? `meta ${goalWeight} kg` : 'sem. vs sem. anterior'}
                      accent={trendColor == null}
                      valueColor={trendColor}
                    />
                  </View>
                </View>

                <SectionLabel>Promedio semanal</SectionLabel>
                {weeklyWeight.length >= 2 ? (
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: theme.bg2,
                        borderColor: theme.border,
                        borderRadius: RADII.r2,
                        marginHorizontal: 20,
                        marginBottom: 14,
                      },
                    ]}
                  >
                    <View style={styles.chartLabels}>
                      {weeklyWeight.map((b, i) => (
                        <View key={b.weekStart} style={styles.chartLabelItem}>
                          <Text style={[styles.chartLabelTop, { color: '#ffffff' }]}>
                            {formatIsoDate(b.weekStart)}
                          </Text>
                          <Text
                            style={[
                              styles.chartLabelVal,
                              {
                                color: '#ffffff',
                              },
                            ]}
                          >
                            {b.avg.toFixed(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <LineChart
                      points={weeklyWeight.map((b) => b.avg)}
                      color={theme.accent}
                      height={80}
                      goal={goalWeight}
                    />
                  </View>
                ) : null}

                <View style={styles.btnWrap}>
                  <BtnPrimary icon="plus" onPress={() => setLogModalVisible(true)}>
                    Registrar peso de hoy
                  </BtnPrimary>
                </View>

                <SectionLabel>Registros recientes</SectionLabel>
                <View
                  style={[
                    styles.listCard,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                      borderRadius: RADII.r2,
                      marginHorizontal: 20,
                      marginBottom: 14,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {useMemo(
                    () => [...weightEntries]
                      .reverse()
                      .slice(0, 5)
                      .map((entry, i, arr) => (
                        <TouchableOpacity
                          key={entry.id}
                          onLongPress={() => {
                            Alert.alert(
                              'Eliminar registro',
                              `Eliminar peso de ${entry.pesoKg.toFixed(1)} kg del ${entry.fecha}?`,
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Eliminar',
                                  style: 'destructive',
                                  onPress: () => deleteMetric(entry.id),
                                },
                              ]
                            );
                          }}
                          style={[
                            styles.listRow,
                            {
                              borderBottomColor: theme.border,
                              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Peso ${entry.pesoKg.toFixed(1)} kg, mantener presionado para eliminar`}
                        >
                          <Text style={[styles.listDate, { color: theme.text3 }]}>
                            {entry.fecha.slice(5)}
                          </Text>
                          <Text style={[styles.listValue, { color: theme.text1 }]}>
                            {entry.pesoKg.toFixed(1)} kg
                          </Text>
                        </TouchableOpacity>
                      )),
                    [weightEntries, deleteMetric, theme.border]
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* ===== FUERZA TAB ===== */}
        {tab === 'fuerza' && (
          <>
            {strengthExercises.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.text3 }]}>
                  Completa una sesion de entrenamiento para ver tu progreso de fuerza
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={() => setExerciseModalVisible(true)}
                  style={[
                    styles.selectorTrigger,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                      borderRadius: RADII.r2,
                      padding: 12,
                      marginHorizontal: 20,
                      marginBottom: 14,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      minHeight: 48,
                    },
                  ]}
                >
                  <Text style={{ color: theme.text1, fontWeight: '700', fontSize: 16 }}>
                    {selectedExerciseName || 'Seleccionar Ejercicio'}
                  </Text>
                  <Text style={{ color: theme.accent, fontWeight: '700' }}>Cambiar ▾</Text>
                </TouchableOpacity>

                <Modal
                  visible={exerciseModalVisible}
                  transparent={true}
                  animationType="fade"
                  onRequestClose={() => setExerciseModalVisible(false)}
                >
                  <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPressOut={() => setExerciseModalVisible(false)}
                  >
                    <View style={[styles.modalContent, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                      <Text style={[styles.modalTitle, { color: theme.text1 }]}>Seleccionar Ejercicio</Text>
                      <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={true}>
                        {strengthExercises.map((ex) => {
                          const active = ex.id === selectedExerciseId;
                          return (
                            <TouchableOpacity
                              key={ex.id}
                              style={[
                                styles.modalOption,
                                {
                                  borderBottomColor: theme.border,
                                  backgroundColor: active ? theme.accentA : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setSelectedExerciseId(ex.id);
                                setExerciseModalVisible(false);
                              }}
                            >
                              <Text style={[styles.modalOptionText, { color: active ? theme.accent : theme.text1 }]}>
                                {ex.nombre}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                      <TouchableOpacity
                        onPress={() => setExerciseModalVisible(false)}
                        style={[styles.modalCloseBtn, { backgroundColor: theme.bg3 }]}
                      >
                        <Text style={{ color: theme.text2, fontWeight: '700' }}>Cerrar</Text>
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                </Modal>

                {selectedStrengthPoints.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: theme.text3 }]}>
                      Sin registros aun para este ejercicio
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.statGrid}>
                      <View style={styles.statItem}>
                        <StatCard
                          icon="dumbbell"
                          label="Ultima"
                          value={latestStrength != null ? String(latestStrength) : '--'}
                          unit={unitLabel}
                          sub={selectedExerciseName}
                        />
                      </View>
                      <View style={styles.statItem}>
                        <StatCard
                          icon="chart"
                          label="Mejor"
                          value={bestStrength != null ? String(bestStrength) : '--'}
                          unit={unitLabel}
                          sub={strengthDelta != null ? `${strengthDelta >= 0 ? '+' : ''}${strengthDelta} desde inicio` : 'sin tendencia'}
                          accent
                        />
                      </View>
                    </View>
                    <SectionLabel>
                      {selectedExerciseName ? `${selectedExerciseName} - carga (${unitLabel})` : `Carga (${unitLabel})`}
                    </SectionLabel>
                    <View
                      style={[
                        styles.chartCard,
                        {
                          backgroundColor: theme.bg2,
                          borderColor: theme.border,
                          borderRadius: RADII.r2,
                          marginHorizontal: 20,
                          marginBottom: 14,
                        },
                      ]}
                    >
                      <LineChart
                        points={selectedStrengthPoints.map((p) => p.maxPesoKg)}
                        color={MACRO_COLORS.protein}
                        height={80}
                      />
                      <View style={styles.chartLabels}>
                        {selectedStrengthPoints.map((p, i) => (
                          <View key={p.weekStart} style={styles.chartLabelItem}>
                            <Text style={[styles.chartLabelTop, { color: '#ffffff' }]}>
                              {formatIsoDate(p.weekStart)}
                            </Text>
                            <Text
                              style={[
                                styles.chartLabelVal,
                                {
                                  color: '#ffffff',
                                },
                              ]}
                            >
                              {p.displayVal} {p.displayUnit}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* ===== FOTOS TAB ===== */}
        {tab === 'fotos' && (
          <>
            {photoEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.text3 }]}>
                  Registra una medicion con foto para ver tu progreso visual
                </Text>
                <View style={styles.emptyBtn}>
                  <BtnPrimary icon="plus" onPress={() => setLogModalVisible(true)}>
                    Registrar con foto
                  </BtnPrimary>
                </View>
              </View>
            ) : (
              <>
                <SectionLabel>
                  {photoEntries.length} foto{photoEntries.length !== 1 ? 's' : ''}
                </SectionLabel>
                <View style={styles.photoGrid}>
                  {photoEntries.map((entry) => (
                    <View key={entry.id} style={[styles.photoItem, { width: photoColSize }]}>
                      <Image
                        source={{ uri: entry.fotoUri }}
                        style={[styles.photoImg, { width: photoColSize, height: photoColSize * (4 / 3), borderRadius: RADII.r2 }]}
                        resizeMode="cover"
                      />
                      <Text style={[styles.photoDate, { color: theme.text3 }]}>
                        {entry.fecha.slice(5)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}

        {/* ===== CINTURA TAB ===== */}
        {tab === 'cintura' && (
          <>
            {waistEntries.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={[styles.emptyText, { color: theme.text3 }]}>
                  Registra tu primera medicion de cintura
                </Text>
                <View style={styles.emptyBtn}>
                  <BtnPrimary icon="plus" onPress={() => setLogModalVisible(true)}>
                    Registrar medidas hoy
                  </BtnPrimary>
                </View>
              </View>
            ) : (
              <>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}>
                    <StatCard
                      icon="weight"
                      label="Cintura"
                      value={String(waistEntries[waistEntries.length - 1].cinturaCm)}
                      unit="cm"
                      sub="ultimo registro"
                    />
                  </View>
                  <View style={styles.statItem}>
                    <StatCard
                      icon="chart"
                      label="Cambio"
                      value={
                        waistEntries.length > 1
                          ? (
                              waistEntries[waistEntries.length - 1].cinturaCm -
                              waistEntries[0].cinturaCm
                            ).toFixed(1)
                          : '?'
                      }
                      unit={waistEntries.length > 1 ? 'cm' : ''}
                      sub="vs. inicio"
                      accent
                    />
                  </View>
                </View>

                <SectionLabel>Tendencia cintura (cm)</SectionLabel>
                {weeklyWaist.length >= 2 ? (
                  <View
                    style={[
                      styles.chartCard,
                      {
                        backgroundColor: theme.bg2,
                        borderColor: theme.border,
                        borderRadius: RADII.r2,
                        marginHorizontal: 20,
                        marginBottom: 14,
                      },
                    ]}
                  >
                    <LineChart
                      points={weeklyWaist.map((b) => b.avg)}
                      color={MACRO_COLORS.carbs}
                      height={80}
                    />
                    <View style={styles.chartLabels}>
                      {weeklyWaist.map((b, i) => (
                        <View key={b.weekStart} style={styles.chartLabelItem}>
                          <Text style={[styles.chartLabelTop, { color: '#ffffff' }]}>
                            {formatIsoDate(b.weekStart)}
                          </Text>
                          <Text
                            style={[
                              styles.chartLabelVal,
                              {
                                color: '#ffffff',
                              },
                            ]}
                          >
                            {b.avg.toFixed(1)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={styles.btnWrap}>
                  <BtnPrimary icon="plus" onPress={() => setLogModalVisible(true)}>
                    Registrar medidas hoy
                  </BtnPrimary>
                </View>

                <SectionLabel>Registros recientes</SectionLabel>
                <View
                  style={[
                    styles.listCard,
                    {
                      backgroundColor: theme.bg2,
                      borderColor: theme.border,
                      borderRadius: RADII.r2,
                      marginHorizontal: 20,
                      marginBottom: 14,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  {useMemo(
                    () => [...waistEntries]
                      .reverse()
                      .slice(0, 5)
                      .map((entry, i, arr) => (
                        <TouchableOpacity
                          key={entry.id}
                          onLongPress={() => {
                            Alert.alert(
                              'Eliminar registro',
                              `Eliminar cintura de ${entry.cinturaCm.toFixed(1)} cm del ${entry.fecha}?`,
                              [
                                { text: 'Cancelar', style: 'cancel' },
                                {
                                  text: 'Eliminar',
                                  style: 'destructive',
                                  onPress: () => deleteMetric(entry.id),
                                },
                              ]
                            );
                          }}
                          style={[
                            styles.listRow,
                            {
                              borderBottomColor: theme.border,
                              borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Cintura ${entry.cinturaCm.toFixed(1)} cm, mantener presionado para eliminar`}
                        >
                          <Text style={[styles.listDate, { color: theme.text3 }]}>
                            {entry.fecha.slice(5)}
                          </Text>
                          <Text style={[styles.listValue, { color: theme.text1 }]}>
                            {entry.cinturaCm.toFixed(1)} cm
                          </Text>
                        </TouchableOpacity>
                      )),
                    [waistEntries, deleteMetric, theme.border]
                  )}
                </View>
              </>
            )}
          </>
        )}

        {/* ===== MUSCULOS TAB ===== */}
        {tab === 'musculos' && (
          <>
            <View style={styles.muscleWindowRow}>
              {([7, 30, 0] as MuscleWindow[]).map((w) => {
                const active = muscleWindow === w;
                const label = w === 0 ? 'Todo' : `${w}d`;
                return (
                  <TouchableOpacity
                    key={w}
                    onPress={() => setMuscleWindow(w)}
                    style={[
                      styles.muscleWindowBtn,
                      { backgroundColor: active ? theme.accentA : theme.bg3, borderColor: active ? theme.accent : theme.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.muscleWindowBtnText, { color: active ? theme.accent : theme.text2 }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.bodyMapRow}>
              <View style={styles.bodyMapCol}>
                <BodyMap
                  view="front"
                  width={140}
                  height={308}
                  inertColor={theme.bg4}
                  colors={muscleColorsByLevel(muscleLevels, theme.accent, theme.bg3)}
                />
                <Text style={[styles.bodyMapLabel, { color: theme.text3 }]}>Frente</Text>
              </View>
              <View style={styles.bodyMapCol}>
                <BodyMap
                  view="back"
                  width={140}
                  height={308}
                  inertColor={theme.bg4}
                  colors={muscleColorsByLevel(muscleLevels, theme.accent, theme.bg3)}
                />
                <Text style={[styles.bodyMapLabel, { color: theme.text3 }]}>Espalda</Text>
              </View>
            </View>

            <View style={styles.muscleLegendRow}>
              <Text style={[styles.legendText, { color: theme.text3 }]}>Menos</Text>
              {([0, 1, 2, 3, 4] as const).map((lvl) => (
                <View
                  key={lvl}
                  style={[
                    styles.legendCell,
                    { backgroundColor: lvl === 0 ? theme.bg3 : `${theme.accent}${['', '33', '66', '99', ''][lvl]}` },
                  ]}
                />
              ))}
              <Text style={[styles.legendText, { color: theme.text3 }]}>Mas</Text>
            </View>

            <SectionLabel>Mas trabajado</SectionLabel>
            <View style={[styles.listCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, overflow: 'hidden' }]}>
              {workedMuscles(muscleLoad).length === 0 ? (
                <Text style={[styles.emptyText, { color: theme.text3, padding: 20 }]}>
                  Sin series registradas en este periodo
                </Text>
              ) : (
                workedMuscles(muscleLoad).slice(0, 6).map((entry, i, arr) => (
                  <View
                    key={entry.muscle}
                    style={[styles.listRow, { borderBottomColor: theme.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}
                  >
                    <Text style={[styles.listDate, { color: theme.text1 }]}>{entry.muscle}</Text>
                    <Text style={[styles.listValue, { color: theme.text2 }]}>{entry.sets} series</Text>
                  </View>
                ))
              )}
            </View>

            {missedMuscles(muscleLoad).length > 0 && missedMuscles(muscleLoad).length < 12 ? (
              <>
                <SectionLabel>Sin trabajar en este periodo</SectionLabel>
                <View style={styles.missedChips}>
                  {missedMuscles(muscleLoad).map((m) => (
                    <View key={m} style={[styles.missedChip, { backgroundColor: theme.bg3 }]}>
                      <Text style={[styles.missedChipText, { color: theme.text3 }]}>{m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

      </ScrollView>

      {/* Log metric modal */}
      <LogMetricScreen
        visible={logModalVisible}
        lastPeso={lastPeso}
        lastCintura={lastCintura}
        onClose={() => setLogModalVisible(false)}
        onSave={handleSaveMetric}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles (keep the same identifiers + add new ones)
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  fabHeader: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  fabText: { color: '#fff', fontSize: 22, fontWeight: '300', lineHeight: 28 },
  tabsRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 20, paddingBottom: 14 },
  tabBtn: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center', borderWidth: 1, minHeight: 48 },
  tabBtnText: { fontSize: 13, fontWeight: '700' },
  statGrid: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 0 },
  statItem: { flex: 1 },
  chartCard: { borderWidth: 1, padding: 16 },
  chartLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  chartLabelItem: { alignItems: 'center' },
  chartLabelTop: { fontSize: 10, marginBottom: 3 },
  chartLabelVal: { fontSize: 13, fontWeight: '700' },
  btnWrap: { paddingHorizontal: 20, paddingBottom: 14 },
  listCard: { borderWidth: 1 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11 },
  listDate: { fontSize: 13, fontWeight: '500' },
  listValue: { fontSize: 15, fontWeight: '700' },
  pillsRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 6 },
  pill: { height: 34, paddingHorizontal: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  pillText: { fontSize: 13, fontWeight: '600' },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 32, paddingTop: 40, paddingBottom: 20, gap: 16 },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  emptyBtn: { width: '100%' },
  trendValue: { fontWeight: '700' },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  photoItem: {
  },
  photoImg: {
  },
  photoDate: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '70%',
    borderWidth: 1,
    borderRadius: RADII.r2,
    padding: 20,
    gap: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalScroll: {
    width: '100%',
  },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: RADII.r2,
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  selectorTrigger: {
    borderWidth: 1,
  },
  muscleWindowRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  muscleWindowBtn: { flex: 1, paddingVertical: 8, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center' },
  muscleWindowBtnText: { fontSize: 13, fontWeight: '700' },
  bodyMapRow: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 10 },
  bodyMapCol: { alignItems: 'center' },
  bodyMapLabel: { fontSize: 11, fontWeight: '600', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  muscleLegendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 20 },
  legendText: { fontSize: 11, marginHorizontal: 4 },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  missedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  missedChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADII.r1 },
  missedChipText: { fontSize: 12, fontWeight: '600' },
});
