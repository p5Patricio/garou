import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from '../../src/components/Icon';
import SectionLabel from '../../src/components/SectionLabel';
import StatCard from '../../src/components/StatCard';
import { RADII, SEMANTIC, useTheme } from '../../src/constants/theme';
import { useActiveTimer } from '../../src/hooks/useActiveTimer';
import { useDashboard } from '../../src/hooks/useDashboard';

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEK_SESSIONS = ['T.A', 'P.A', 'Lig', '—', 'T.B', 'P.B', '—'];

const ESTADO_TAG: Record<string, string> = {
  sugerida: 'Sugerida hoy',
  pendiente: 'En curso',
  completada: 'Completada',
  descanso: 'Dia de descanso',
};

const START_LABEL: Record<string, string> = {
  sugerida: 'Empezar',
  pendiente: 'Continuar',
  completada: 'Ver',
  descanso: 'Descanso',
};

export default function HoyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data, loading } = useDashboard();
  const restTimer = useActiveTimer('rest');
  const cardioTimer = useActiveTimer('cardio');

  if (loading || !data) {
    return (
      <View style={[styles.safe, styles.centered, { backgroundColor: theme.bg }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const wk = data.workout;
  const estadoTag = ESTADO_TAG[wk.estado] ?? 'Sesion de hoy';
  const startLabel = START_LABEL[wk.estado] ?? 'Empezar';
  const estadoTone =
    wk.estado === 'completada' ? SEMANTIC.green : wk.estado === 'descanso' ? theme.text3 : theme.accent;
  const activeTimer = cardioTimer.active ? cardioTimer : restTimer.active ? restTimer : null;
  const activeTimerRoute = cardioTimer.active ? '/(tabs)/cardio' : '/(tabs)/train';
  const activeTimerKind = cardioTimer.active ? 'Cardio' : 'Descanso';
  const timerMins = activeTimer ? Math.floor(activeTimer.remaining / 60) : 0;
  const timerSecs = activeTimer ? activeTimer.remaining % 60 : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.text3 }]}>{data.fecha}</Text>
          <Text style={[styles.greeting, { color: theme.text1 }]}>Garou</Text>
        </View>

        <View style={[styles.heroCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <View style={styles.sessionDot}>
            <View style={[styles.dot, { backgroundColor: estadoTone }]} />
            <Text style={[styles.sessionTag, { color: estadoTone }]}>{estadoTag}</Text>
          </View>
          <View style={styles.sessionBody}>
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionName, { color: theme.text1 }]}>{wk.session.toUpperCase()}</Text>
              <Text style={[styles.sessionSub, { color: theme.text3 }]} numberOfLines={2}>
                {wk.musclesLabel}
              </Text>
              <View style={styles.chips}>
                {[`${wk.numEjercicios} ejercicios`, `${wk.numSeries} series`, `~${wk.duracionEstimada} min`].map((label) => (
                  <View key={label} style={[styles.chip, { backgroundColor: theme.bg3 }]}>
                    <Text style={[styles.chipText, { color: theme.text3 }]}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/train')}
              style={[styles.startBtn, { backgroundColor: wk.estado === 'descanso' ? theme.bg3 : theme.accent }]}
              accessibilityRole="button"
              accessibilityLabel={`${startLabel} ${wk.session}`}
            >
              <Text style={[styles.startBtnText, wk.estado === 'descanso' && { color: theme.text2 }]}>
                {startLabel}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.weekStrip, { borderTopColor: theme.border }]}>
            {WEEK_SESSIONS.map((s, i) => {
              const todayIndex = (new Date().getDay() + 6) % 7;
              const isToday = i === todayIndex;
              const isPast = i < todayIndex;
              return (
                <View key={i} style={styles.weekDay}>
                  <Text style={[styles.weekDayLabel, { color: isToday ? theme.accent : theme.text4 }]}>
                    {WEEK_LABELS[i]}
                  </Text>
                  <View
                    style={[
                      styles.weekDayCircle,
                      {
                        backgroundColor: isPast ? SEMANTIC.greenA : isToday ? theme.accentA : theme.bg3,
                        borderColor: isToday ? theme.accent : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.weekDaySession,
                        {
                          color: isPast ? SEMANTIC.green : isToday ? theme.accent : theme.text4,
                        },
                      ]}
                    >
                      {s}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {activeTimer ? (
          <TouchableOpacity
            onPress={() => router.push(activeTimerRoute)}
            style={[styles.timerBanner, { backgroundColor: theme.bg2, borderColor: theme.accent }]}
            accessibilityRole="button"
          >
            <View style={[styles.timerBannerIcon, { backgroundColor: theme.accentA }]}>
              <Icon name="timer" size={20} color={theme.accent} strokeW={2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.timerBannerLabel, { color: theme.text3 }]}>{activeTimerKind} activo</Text>
              <Text style={[styles.timerBannerTitle, { color: theme.text1 }]}>{activeTimer.label}</Text>
            </View>
            <Text style={[styles.timerBannerTime, { color: theme.accent }]}>
              {timerMins}:{String(timerSecs).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        ) : null}

        <SectionLabel>Resumen</SectionLabel>
        <View style={styles.statGrid}>
          <View style={styles.statItem}>
            <StatCard
              icon="bike"
              label="Cardio"
              value={String(data.cardio.minutos)}
              unit="min"
              sub={data.cardio.sesiones > 0 ? `${data.cardio.sesiones} registro${data.cardio.sesiones === 1 ? '' : 's'}` : 'sin registrar'}
            />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="dumbbell" label="Rutina" value={String(wk.numEjercicios)} unit="ej." sub={`${wk.numSeries} series`} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="timer" label="Duracion" value={String(wk.duracionEstimada)} unit="min" sub="estimada" />
          </View>
          <View style={styles.statItem}>
            <StatCard
              icon="weight"
              label="Peso"
              value={data.weight.ultimo != null ? data.weight.ultimo.toFixed(1) : '--'}
              unit={data.weight.ultimo != null ? 'kg' : ''}
              sub={data.weight.diasAgo != null ? `hace ${data.weight.diasAgo} dias` : 'sin datos'}
            />
          </View>
        </View>

        <View style={[styles.weightCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.weightLabel, { color: theme.text3 }]}>Tendencia corporal</Text>
            <Text style={[styles.weightValue, { color: data.weight.tendencia > 0 ? '#D95240' : SEMANTIC.green }]}>
              {data.weight.tendencia > 0 ? '+' : ''}{data.weight.tendencia} kg
            </Text>
            <Text style={[styles.weightSub, { color: theme.text3 }]}>promedio semanal</Text>
          </View>
          <View style={[styles.weightIcon, { backgroundColor: theme.bg3 }]}>
            <Icon name="chart" size={24} color={theme.accent} strokeW={1.8} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 8, paddingBottom: 14 },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  greeting: { fontSize: 30, fontWeight: '900', letterSpacing: -0.4, lineHeight: 34 },
  heroCard: { marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderRadius: RADII.r3, overflow: 'hidden' },
  sessionDot: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 16, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  sessionTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  sessionBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingBottom: 14 },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 25, fontWeight: '900', letterSpacing: -0.5, lineHeight: 29 },
  sessionSub: { fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '600' },
  startBtn: { flexShrink: 0, minHeight: 48, paddingHorizontal: 20, borderRadius: RADII.r2, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  weekStrip: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', gap: 3, minWidth: 32 },
  weekDayLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  weekDayCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekDaySession: { fontSize: 9, fontWeight: '700' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
  statItem: { width: '47%', flexGrow: 1 },
  weightCard: { marginHorizontal: 20, marginBottom: 14, padding: 16, borderWidth: 1, borderRadius: RADII.r2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timerBanner: { marginHorizontal: 20, marginBottom: 14, padding: 14, borderWidth: 1, borderRadius: RADII.r2, flexDirection: 'row', alignItems: 'center', gap: 12 },
  timerBannerIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  timerBannerLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  timerBannerTitle: { fontSize: 15, fontWeight: '800', marginTop: 2 },
  timerBannerTime: { fontSize: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  weightLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  weightValue: { fontSize: 26, fontWeight: '900', letterSpacing: -0.4 },
  weightSub: { fontSize: 12, marginTop: 2 },
  weightIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
