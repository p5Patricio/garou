import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, SEMANTIC, MACRO_COLORS } from '../../src/constants/theme';
import MacroRing from '../../src/components/MacroRing';
import MacroBar from '../../src/components/MacroBar';
import StatCard from '../../src/components/StatCard';
import SectionLabel from '../../src/components/SectionLabel';
import { useWatch } from '../../src/hooks/useWatch';
import { useDashboard } from '../../src/hooks/useDashboard';

// Short labels for the rotation strip
const ROTATION_ABBR: Record<string, string> = {
  'Torso A': 'T.A',
  'Pierna A': 'P.A',
  Ligero: 'Lig',
  'Torso B': 'T.B',
  'Pierna B': 'P.B',
};

const ESTADO_TAG: Record<string, string> = {
  sugerida: 'Sugerida hoy',
  pendiente: 'En curso',
  completada: 'Completada',
  descanso: 'Día de descanso',
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

  const { data: watchData, loading: watchLoading, lastSyncAt, sync } = useWatch();
  const { data: dashboardData, loading: dashboardLoading } = useDashboard();

  if (dashboardLoading || !dashboardData) {
    return (
      <View style={[styles.safe, { backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const log = dashboardData.macros.logHoy;
  const target = dashboardData.macros.target;

  const waterPct = Math.round((dashboardData.water.ml / dashboardData.water.target) * 100);

  // Watch-derived values with "--" fallback when null
  const stepsValue = watchData?.pasos != null ? watchData.pasos.toLocaleString() : '--';
  const fcValue = watchData?.fc_reposo_ppm != null ? watchData.fc_reposo_ppm.toString() : '--';
  const hrvSub = watchData?.hrv != null ? `HRV: ${watchData.hrv} ms` : 'HRV: --';
  const sleepValue = watchData?.horas_sueno != null ? watchData.horas_sueno.toFixed(1) : '--';

  const syncLabel = lastSyncAt
    ? `Última sync: ${lastSyncAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    : 'Sin datos';

  const wk = dashboardData.workout;
  const estadoTag = ESTADO_TAG[wk.estado] ?? 'Sesión de hoy';
  const startLabel = START_LABEL[wk.estado] ?? 'Empezar';
  const estadoTone =
    wk.estado === 'completada' ? SEMANTIC.green : wk.estado === 'descanso' ? theme.text3 : theme.accent;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.text3 }]}>{dashboardData.fecha}</Text>
          <Text style={[styles.greeting, { color: theme.text1 }]}>Buenos días</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r3, marginHorizontal: 20, marginBottom: 14 }]}>
          <View style={styles.sessionTop}>
            <View style={styles.sessionDot}>
              <View style={[styles.dot, { backgroundColor: estadoTone }]} />
              <Text style={[styles.sessionTag, { color: estadoTone }]}>{estadoTag}</Text>
            </View>
            <View style={styles.sessionBody}>
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionName, { color: theme.text1 }]}>{wk.session.toUpperCase()}</Text>
                <Text style={[styles.sessionSub, { color: theme.text3 }]}>{wk.musclesLabel}</Text>
                <View style={styles.chips}>
                  {[`${wk.numEjercicios} ejercicios`, `${wk.numSeries} series`, `~${wk.duracionEstimada} min`].map((t) => (
                    <View key={t} style={[styles.chip, { backgroundColor: theme.bg3 }]}>
                      <Text style={[styles.chipText, { color: theme.text3 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/train')}
                style={[
                  styles.startBtn,
                  { backgroundColor: wk.estado === 'descanso' ? theme.bg3 : theme.accent, borderRadius: RADII.r2 },
                ]}
                accessibilityLabel={`${startLabel} ${wk.session}`}
              >
                <Text style={[styles.startBtnText, wk.estado === 'descanso' && { color: theme.text2 }]}>
                  {startLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.weekStrip, { borderTopColor: theme.border }]}>
            {wk.rotation.map((s, i) => {
              const isCurrent = i === wk.rotationIndex;
              const abbr = ROTATION_ABBR[s] ?? s;
              return (
                <View key={s} style={styles.weekDay}>
                  <Text style={[styles.weekDayLabel, { color: isCurrent ? theme.accent : theme.text4 }]}>
                    {isCurrent ? 'hoy' : ''}
                  </Text>
                  <View style={[
                    styles.weekDayCircle,
                    {
                      backgroundColor: isCurrent ? theme.accentA : theme.bg3,
                      borderColor: isCurrent ? theme.accent : 'transparent',
                    },
                  ]}>
                    <Text style={[styles.weekDaySession, {
                      color: isCurrent ? theme.accent : theme.text4,
                    }]}>{abbr}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <SectionLabel>Macros de hoy</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, padding: 16 }]}>
          <View style={styles.macrosRow}>
            <MacroRing val={log.kcal} max={target.kcal} color={theme.accent} size={80} strokeW={7} label={log.kcal} sub="kcal" />
            <View style={styles.macroBars}>
              <MacroBar label="Proteína" val={log.p} max={target.p} color={MACRO_COLORS.protein} />
              <MacroBar label="Carbos" val={log.c} max={target.c} color={MACRO_COLORS.carbs} />
              <MacroBar label="Grasa" val={log.f} max={target.f} color={MACRO_COLORS.fat} />
            </View>
          </View>
          <Text style={[styles.macroFooter, { color: theme.text3 }]}>
            {target.kcal - log.kcal} kcal restantes · {target.p - log.p}g proteína pendiente
          </Text>
        </View>

        <SectionLabel>Resumen del día</SectionLabel>
        <View style={[styles.statGrid, { paddingHorizontal: 20, marginBottom: 8 }]}>
          <View style={styles.statItem}>
            <StatCard icon="water" label="Agua" value={`${(dashboardData.water.ml / 1000).toFixed(1)}`} unit="L" sub={`Meta: ${(dashboardData.water.target / 1000).toFixed(1)} L · ${waterPct}%`} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="run" label="Pasos" value={stepsValue} sub="Samsung Health" />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="heart" label="FC reposo" value={fcValue} unit={watchData?.fc_reposo_ppm != null ? 'ppm' : ''} sub={hrvSub} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="sleep" label="Sueño" value={sleepValue} unit={watchData?.horas_sueno != null ? 'h' : ''} sub="Ayer noche" />
          </View>
        </View>

        {/* Watch sync controls */}
        <View style={[styles.syncRow, { paddingHorizontal: 20, marginBottom: 14 }]}>
          <Text style={[styles.syncLabel, { color: theme.text3 }]}>{syncLabel}</Text>
          <TouchableOpacity
            onPress={sync}
            disabled={watchLoading}
            style={[
              styles.syncBtn,
              {
                backgroundColor: watchLoading ? theme.bg3 : theme.bg2,
                borderColor: theme.border,
              },
            ]}
            accessibilityLabel="Sincronizar datos del reloj"
          >
            {watchLoading ? (
              <ActivityIndicator size="small" color={theme.accent} />
            ) : (
              <Text style={[styles.syncBtnText, { color: theme.accent }]}>Sync reloj</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, padding: 14 }]}>
          <View style={styles.pesoRow}>
            <View>
              <Text style={[styles.pesoLabel, { color: theme.text3 }]}>Peso</Text>
              <View style={styles.pesoValueRow}>
                <Text style={[styles.pesoValue, { color: theme.text1 }]}>
                  {dashboardData.weight.ultimo != null ? dashboardData.weight.ultimo.toFixed(1) : '--'}
                </Text>
                <Text style={[styles.pesoUnit, { color: theme.text3 }]}>kg</Text>
              </View>
              <Text style={[styles.pesoSub, { color: theme.text3 }]}>
                {dashboardData.weight.diasAgo != null ? `hace ${dashboardData.weight.diasAgo} días` : 'sin datos'}
              </Text>
            </View>
            <View style={styles.pesoRight}>
              <Text style={[styles.pesoLabel, { color: theme.text3 }]}>Tendencia</Text>
              <Text style={[styles.pesoTendencia, { color: dashboardData.weight.tendencia > 0 ? '#D95240' : SEMANTIC.green }]}>
                {dashboardData.weight.tendencia > 0 ? '+' : ''}{dashboardData.weight.tendencia} kg
              </Text>
              <Text style={[styles.pesoSub, { color: theme.text3 }]}>promedio semanal</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { padding: 20, paddingTop: 8, paddingBottom: 14 },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  greeting: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, lineHeight: 32 },
  card: { borderWidth: 1, overflow: 'hidden' },
  sessionTop: { padding: 16, paddingBottom: 14 },
  sessionDot: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  sessionTag: { fontSize: 11, fontWeight: '700', letterSpacing: 0.9, textTransform: 'uppercase' },
  sessionBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  sessionInfo: { flex: 1 },
  sessionName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5, lineHeight: 28 },
  sessionSub: { fontSize: 13, marginTop: 4 },
  chips: { flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 11, fontWeight: '600' },
  startBtn: { flexShrink: 0, height: 48, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.1 },
  weekStrip: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', gap: 4 },
  weekDay: { flex: 1, alignItems: 'center', gap: 3, minWidth: 32 },
  weekDayLabel: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },
  weekDayCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  weekDaySession: { fontSize: 9, fontWeight: '700' },
  macrosRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  macroBars: { flex: 1, gap: 10 },
  macroFooter: { fontSize: 12, textAlign: 'center' },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statItem: { width: '47%', flexGrow: 1 },
  syncRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 0 },
  syncLabel: { fontSize: 12 },
  syncBtn: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncBtnText: { fontSize: 13, fontWeight: '600' },
  pesoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pesoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  pesoValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  pesoValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pesoUnit: { fontSize: 13, marginBottom: 3 },
  pesoSub: { fontSize: 12, marginTop: 2 },
  pesoRight: { alignItems: 'flex-end' },
  pesoTendencia: { fontSize: 20, fontWeight: '800' },
});
