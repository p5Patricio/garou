import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, SEMANTIC, MACRO_COLORS } from '../../src/constants/theme';
import MacroRing from '../../src/components/MacroRing';
import MacroBar from '../../src/components/MacroBar';
import StatCard from '../../src/components/StatCard';
import SectionLabel from '../../src/components/SectionLabel';
import { hoy, macros } from '../../src/data/appData';

const WEEK_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEK_SESSIONS = ['T.A', 'P.A', 'Lig', '—', 'T.B', 'P.B', '—'];

export default function HoyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const log = macros.logHoy;
  const target = macros.entrenoDia;

  const waterPct = Math.round((hoy.water.ml / hoy.water.target) * 100);
  const stepsPct = Math.round((hoy.steps.count / hoy.steps.target) * 100);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.text3 }]}>{hoy.fecha}</Text>
          <Text style={[styles.greeting, { color: theme.text1 }]}>Buenos días</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r3, marginHorizontal: 20, marginBottom: 14 }]}>
          <View style={styles.sessionTop}>
            <View style={styles.sessionDot}>
              <View style={[styles.dot, { backgroundColor: theme.accent }]} />
              <Text style={[styles.sessionTag, { color: theme.accent }]}>Sesión de hoy</Text>
            </View>
            <View style={styles.sessionBody}>
              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionName, { color: theme.text1 }]}>{hoy.sesion}</Text>
                <Text style={[styles.sessionSub, { color: theme.text3 }]}>Cuádriceps · Isquios · Glúteo · Pantorrillas</Text>
                <View style={styles.chips}>
                  {['6 ejercicios', '20 series', '~65 min'].map((t) => (
                    <View key={t} style={[styles.chip, { backgroundColor: theme.bg3 }]}>
                      <Text style={[styles.chipText, { color: theme.text3 }]}>{t}</Text>
                    </View>
                  ))}
                </View>
              </View>
              <TouchableOpacity
                onPress={() => router.push('/(tabs)/train')}
                style={[styles.startBtn, { backgroundColor: theme.accent, borderRadius: RADII.r2 }]}
              >
                <Text style={styles.startBtnText}>Empezar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.weekStrip, { borderTopColor: theme.border }]}>
            {WEEK_SESSIONS.map((s, i) => {
              const isToday = i === 1;
              const isPast = i === 0;
              return (
                <View key={i} style={styles.weekDay}>
                  <Text style={[styles.weekDayLabel, { color: isToday ? theme.accent : theme.text4 }]}>
                    {WEEK_LABELS[i]}
                  </Text>
                  <View style={[
                    styles.weekDayCircle,
                    {
                      backgroundColor: isPast ? SEMANTIC.greenA : isToday ? theme.accentA : theme.bg3,
                      borderColor: isToday ? theme.accent : 'transparent',
                    },
                  ]}>
                    <Text style={[styles.weekDaySession, {
                      color: isPast ? SEMANTIC.green : isToday ? theme.accent : theme.text4,
                    }]}>{s}</Text>
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
        <View style={[styles.statGrid, { paddingHorizontal: 20, marginBottom: 14 }]}>
          <View style={styles.statItem}>
            <StatCard icon="water" label="Agua" value={`${(hoy.water.ml / 1000).toFixed(1)}`} unit="L" sub={`Meta: ${(hoy.water.target / 1000).toFixed(1)} L · ${waterPct}%`} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="run" label="Pasos" value={hoy.steps.count.toLocaleString()} sub={`Meta: ${hoy.steps.target.toLocaleString()} · ${stepsPct}%`} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="heart" label="FC reposo" value={hoy.recovery.fcReposo} unit="ppm" sub={`HRV: ${hoy.recovery.hrv} ms`} />
          </View>
          <View style={styles.statItem}>
            <StatCard icon="sleep" label="Sueño" value={hoy.recovery.suenoH} unit="h" sub="Ayer noche" />
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, padding: 14 }]}>
          <View style={styles.pesoRow}>
            <View>
              <Text style={[styles.pesoLabel, { color: theme.text3 }]}>Peso</Text>
              <View style={styles.pesoValueRow}>
                <Text style={[styles.pesoValue, { color: theme.text1 }]}>{hoy.pesoUltimo.val}</Text>
                <Text style={[styles.pesoUnit, { color: theme.text3 }]}>kg</Text>
              </View>
              <Text style={[styles.pesoSub, { color: theme.text3 }]}>hace {hoy.pesoUltimo.dias} días</Text>
            </View>
            <View style={styles.pesoRight}>
              <Text style={[styles.pesoLabel, { color: theme.text3 }]}>Tendencia</Text>
              <Text style={[styles.pesoTendencia, { color: SEMANTIC.green }]}>
                {hoy.pesoUltimo.tendencia > 0 ? '+' : ''}{hoy.pesoUltimo.tendencia} kg
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
  pesoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pesoLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  pesoValueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  pesoValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pesoUnit: { fontSize: 13, marginBottom: 3 },
  pesoSub: { fontSize: 12, marginTop: 2 },
  pesoRight: { alignItems: 'flex-end' },
  pesoTendencia: { fontSize: 20, fontWeight: '800' },
});
