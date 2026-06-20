import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  Dimensions,
} from 'react-native';

const { width: SCREEN_W } = Dimensions.get('window');
const PHOTO_COL_SIZE = (SCREEN_W - 40 - 8) / 2;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme, RADII, MACRO_COLORS, SEMANTIC } from '../../src/constants/theme';
import StatCard from '../../src/components/StatCard';
import SectionLabel from '../../src/components/SectionLabel';
import LineChart from '../../src/components/LineChart';
import BtnPrimary from '../../src/components/BtnPrimary';
import { useMetrics } from '../../src/hooks/useMetrics';
import { getDB } from '../../src/db';
import LogMetricScreen from '../../src/screens/LogMetricScreen';

type TabKey = 'peso' | 'fuerza' | 'cintura' | 'fotos' | 'semana';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'cintura', label: 'Cintura' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'semana', label: 'Semana' },
];

// Weekly view targets
const WATER_TARGET_ML = 3000;
const KCAL_THRESHOLD = 2300;
const PROTEIN_TARGET = 160;

interface WeekDay {
  fecha: string;
  totalMl: number;
  kcal: number;
  proteina: number;
}

export default function ProgressScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabKey>('peso');
  const [logModalVisible, setLogModalVisible] = useState(false);

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
  } = useMetrics();

  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(
    defaultExerciseId
  );

  // Weekly water + nutrition history (last 7 days, most recent first)
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      let cancelled = false;

      async function loadWeek() {
        try {
          const db = getDB();

          const waterRows = await db.getAllAsync<{ fecha: string; total_ml: number }>(
            `SELECT fecha, COALESCE(SUM(ml), 0) AS total_ml
             FROM water_logs
             WHERE fecha >= date('now', '-6 days')
             GROUP BY fecha`
          );
          const kcalRows = await db.getAllAsync<{ fecha: string; kcal: number }>(
            `SELECT nl.fecha, COALESCE(SUM(nl.gramos * f.kcal_100g / 100), 0) AS kcal
             FROM nutrition_logs nl
             JOIN foods f ON f.id = nl.food_id
             WHERE nl.fecha >= date('now', '-6 days')
             GROUP BY nl.fecha`
          );
          const proteinaRows = await db.getAllAsync<{ fecha: string; proteina: number }>(
            `SELECT nl.fecha, COALESCE(SUM(nl.gramos * f.proteina_100g / 100), 0) AS proteina
             FROM nutrition_logs nl
             JOIN foods f ON f.id = nl.food_id
             WHERE nl.fecha >= date('now', '-6 days')
             GROUP BY nl.fecha`
          );

          const waterByDate = new Map(waterRows.map((r) => [r.fecha, r.total_ml]));
          const kcalByDate = new Map(kcalRows.map((r) => [r.fecha, r.kcal]));
          const proteinaByDate = new Map(proteinaRows.map((r) => [r.fecha, r.proteina]));

          // Build the 7-day grid client-side, most recent first, filling gaps with 0
          const days: WeekDay[] = [];
          for (let offset = 0; offset < 7; offset++) {
            const d = new Date();
            d.setDate(d.getDate() - offset);
            const fecha = d.toISOString().slice(0, 10);
            days.push({
              fecha,
              totalMl: waterByDate.get(fecha) ?? 0,
              kcal: kcalByDate.get(fecha) ?? 0,
              proteina: proteinaByDate.get(fecha) ?? 0,
            });
          }

          if (!cancelled) setWeekDays(days);
        } catch (err) {
          console.error('[progress] week load error', err);
        }
      }

      loadWeek();
      return () => { cancelled = true; };
    }, [])
  );

  // Sync selectedExerciseId when defaultExerciseId resolves (async load)
  useEffect(() => {
    if (selectedExerciseId === null && defaultExerciseId !== null) {
      setSelectedExerciseId(defaultExerciseId);
    }
  }, [defaultExerciseId, selectedExerciseId]);

  // Helpers
  const dayLabel = (fecha: string): string => {
    // fecha is 'YYYY-MM-DD' — parse as local date to avoid TZ shift
    const [y, m, d] = fecha.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dias[date.getDay()]} ${d}`;
  };

  const trendArrow =
    weightTrend === 'up' ? '↑' : weightTrend === 'down' ? '↓' : '→';

  const lastPeso = weightEntries.length > 0
    ? weightEntries[weightEntries.length - 1].pesoKg
    : null;
  const lastCintura = waistEntries.length > 0
    ? waistEntries[waistEntries.length - 1].cinturaCm
    : null;

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
  const selectedStrengthPoints =
    selectedExerciseId !== null
      ? (strengthByExercise[selectedExerciseId] ?? [])
      : [];
  const selectedExercise = strengthExercises.find((e) => e.id === selectedExerciseId);
  const selectedExerciseName = selectedExercise?.nombre ?? '';
  const unitLabel = selectedExercise?.usaPlacas ? 'placas' : 'kg';

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
                      label="Promedio 7 días"
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
                      sub="sem. vs sem. anterior"
                      accent
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
                          <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>
                            {b.weekStart.slice(5)}
                          </Text>
                          <Text
                            style={[
                              styles.chartLabelVal,
                              {
                                color:
                                  i === weeklyWeight.length - 1
                                    ? theme.accent
                                    : theme.text2,
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
                  {[...weightEntries]
                    .reverse()
                    .slice(0, 5)
                    .map((entry, i, arr) => (
                      <View
                        key={entry.fecha}
                        style={[
                          styles.listRow,
                          {
                            borderBottomColor: theme.border,
                            borderBottomWidth: i < arr.length - 1 ? 1 : 0,
                          },
                        ]}
                      >
                        <Text style={[styles.listDate, { color: theme.text3 }]}>
                          {entry.fecha.slice(5)}
                        </Text>
                        <Text style={[styles.listValue, { color: theme.text1 }]}>
                          {entry.pesoKg.toFixed(1)} kg
                        </Text>
                      </View>
                    ))}
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
                  Completa una sesión de entrenamiento para ver tu progreso de fuerza
                </Text>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.pillsRow}
                >
                  {strengthExercises.map((ex) => {
                    const active = ex.id === selectedExerciseId;
                    return (
                      <TouchableOpacity
                        key={ex.id}
                        onPress={() => setSelectedExerciseId(ex.id)}
                        style={[
                          styles.pill,
                          {
                            backgroundColor: active ? theme.accentA : theme.bg3,
                            borderColor: theme.border,
                            borderRadius: 17,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pillText,
                            { color: active ? theme.accent : theme.text2 },
                          ]}
                        >
                          {ex.nombre}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {selectedStrengthPoints.length === 0 ? (
                  <View style={styles.emptyWrap}>
                    <Text style={[styles.emptyText, { color: theme.text3 }]}>
                      Sin registros aún para este ejercicio
                    </Text>
                  </View>
                ) : (
                  <>
                    <SectionLabel>
                      {selectedExerciseName ? `${selectedExerciseName} — carga (${unitLabel})` : `Carga (${unitLabel})`}
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
                            <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>
                              {p.weekStart.slice(5)}
                            </Text>
                            <Text
                              style={[
                                styles.chartLabelVal,
                                {
                                  color:
                                    i === selectedStrengthPoints.length - 1
                                      ? MACRO_COLORS.protein
                                      : theme.text3,
                                },
                              ]}
                            >
                              {p.maxPesoKg}
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
                  Registra una medición con foto para ver tu progreso visual
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
                    <View key={entry.id} style={styles.photoItem}>
                      <Image
                        source={{ uri: entry.fotoUri }}
                        style={[styles.photoImg, { borderRadius: RADII.r2 }]}
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
                  Registra tu primera medición de cintura
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
                      sub="último registro"
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
                          : '—'
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
                          <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>
                            {b.weekStart.slice(5)}
                          </Text>
                          <Text
                            style={[
                              styles.chartLabelVal,
                              {
                                color:
                                  i === weeklyWaist.length - 1
                                    ? MACRO_COLORS.carbs
                                    : theme.text3,
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
              </>
            )}
          </>
        )}

        {/* ===== SEMANA TAB ===== */}
        {tab === 'semana' && (
          <>
            <SectionLabel>Últimos 7 días</SectionLabel>
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
              {weekDays.map((day, i) => {
                const waterDone = day.totalMl >= WATER_TARGET_ML;
                const kcalDone = day.kcal >= KCAL_THRESHOLD;
                const proteinDone = day.proteina >= PROTEIN_TARGET;
                const waterPct = Math.min(1, day.totalMl / WATER_TARGET_ML);
                const kcalPct = Math.min(1, day.kcal / KCAL_THRESHOLD);
                const proteinPct = Math.min(1, day.proteina / PROTEIN_TARGET);

                return (
                  <View
                    key={day.fecha}
                    style={[
                      styles.weekRow,
                      {
                        borderBottomColor: theme.border,
                        borderBottomWidth: i < weekDays.length - 1 ? 1 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.weekDayLabel, { color: theme.text2 }]}>
                      {dayLabel(day.fecha)}
                    </Text>

                    {/* Water */}
                    <View style={styles.weekMetric}>
                      <View style={styles.weekMetricHead}>
                        <Text style={[styles.weekMetricLabel, { color: theme.text3 }]}>Agua</Text>
                        <Text
                          style={[
                            styles.weekMetricVal,
                            { color: waterDone ? SEMANTIC.green : theme.text2 },
                          ]}
                        >
                          {waterDone ? '✓' : `${(day.totalMl / 1000).toFixed(1)} L`}
                        </Text>
                      </View>
                      <View style={[styles.weekBarTrack, { backgroundColor: theme.bg4 }]}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              backgroundColor: waterDone ? SEMANTIC.green : MACRO_COLORS.carbs,
                              width: `${waterPct * 100}%` as `${number}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Kcal */}
                    <View style={styles.weekMetric}>
                      <View style={styles.weekMetricHead}>
                        <Text style={[styles.weekMetricLabel, { color: theme.text3 }]}>Kcal</Text>
                        <Text
                          style={[
                            styles.weekMetricVal,
                            { color: kcalDone ? SEMANTIC.green : theme.text2 },
                          ]}
                        >
                          {kcalDone ? '✓' : Math.round(day.kcal)}
                        </Text>
                      </View>
                      <View style={[styles.weekBarTrack, { backgroundColor: theme.bg4 }]}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              backgroundColor: kcalDone ? SEMANTIC.green : theme.accent,
                              width: `${kcalPct * 100}%` as `${number}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>

                    {/* Protein */}
                    <View style={styles.weekMetric}>
                      <View style={styles.weekMetricHead}>
                        <Text style={[styles.weekMetricLabel, { color: theme.text3 }]}>Prot.</Text>
                        <Text
                          style={[
                            styles.weekMetricVal,
                            { color: proteinDone ? SEMANTIC.green : theme.text2 },
                          ]}
                        >
                          {proteinDone ? '✓' : `${Math.round(day.proteina)}g`}
                        </Text>
                      </View>
                      <View style={[styles.weekBarTrack, { backgroundColor: theme.bg4 }]}>
                        <View
                          style={[
                            styles.weekBarFill,
                            {
                              backgroundColor: proteinDone ? SEMANTIC.green : MACRO_COLORS.protein,
                              width: `${proteinPct * 100}%` as `${number}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
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
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  weekDayLabel: { fontSize: 13, fontWeight: '700', width: 44 },
  weekMetric: { flex: 1, gap: 4 },
  weekMetricHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  weekMetricLabel: { fontSize: 11, fontWeight: '500' },
  weekMetricVal: { fontSize: 12, fontWeight: '700' },
  weekBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  weekBarFill: { height: '100%', borderRadius: 2 },
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
    width: PHOTO_COL_SIZE,
  },
  photoImg: {
    width: PHOTO_COL_SIZE,
    height: PHOTO_COL_SIZE * (4 / 3),
  },
  photoDate: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
});
