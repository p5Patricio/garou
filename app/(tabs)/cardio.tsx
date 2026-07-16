import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import BtnPrimary from '../../src/components/BtnPrimary';
import Icon from '../../src/components/Icon';
import SectionLabel from '../../src/components/SectionLabel';
import Stepper from '../../src/components/Stepper';
import { RADII, SEMANTIC, useTheme } from '../../src/constants/theme';
import { getDB, initDB } from '../../src/db';
import { useActiveTimer } from '../../src/hooks/useActiveTimer';

interface CardioLog {
  id: number;
  fecha: string;
  tipo: string;
  minutos: number;
  fc_promedio_ppm: number | null;
  zona: number | null;
}

const CARDIO_TIPOS = [
  { key: 'bici', label: 'Bici', icon: 'bike' },
  { key: 'pasos', label: 'Pasos', icon: 'run' },
  { key: 'otro', label: 'Otro', icon: 'heart' },
] as const;

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

function todayLocal(): string {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function formatLocalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const raw = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function formatClock(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

export default function CardioScreen() {
  const { theme } = useTheme();
  const cardioTimer = useActiveTimer('cardio');
  const restTimer = useActiveTimer('rest');
  const refreshCardioTimer = cardioTimer.refresh;
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [tipo, setTipo] = useState('bici');
  const [minutos, setMinutos] = useState(30);
  const [fcPromedio, setFcPromedio] = useState(125);
  const [zona, setZona] = useState(2);

  const today = useMemo(() => todayLocal(), []);
  const totalMin = logs.reduce((acc, log) => acc + log.minutos, 0);
  const timerPct = cardioTimer.total > 0
    ? Math.min(1, Math.max(0, 1 - cardioTimer.remaining / cardioTimer.total))
    : 0;

  const loadCardio = useCallback(async () => {
    try {
      await initDB();
      const rows = await getDB().getAllAsync<CardioLog>(
        `SELECT id, fecha, tipo, minutos, fc_promedio_ppm, zona
         FROM cardio_logs
         WHERE fecha = ?
         ORDER BY id DESC`,
        [todayLocal()]
      );
      setLogs(rows);
    } catch (err) {
      console.error('[CardioScreen] loadCardio error', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCardio();
      refreshCardioTimer().catch((err) => console.error('[CardioScreen] refresh timer error', err));
    }, [loadCardio, refreshCardioTimer])
  );

  const saveCardio = useCallback(async (minutesToSave: number, typeToSave = tipo, hrToSave = fcPromedio, zoneToSave = zona) => {
    try {
      await getDB().runAsync(
        'INSERT INTO cardio_logs (fecha, tipo, minutos, fc_promedio_ppm, zona) VALUES (?, ?, ?, ?, ?)',
        [todayLocal(), typeToSave, Math.max(1, minutesToSave), hrToSave > 0 ? hrToSave : null, zoneToSave]
      );
      await loadCardio();
    } catch (err) {
      console.error('[CardioScreen] saveCardio error', err);
      Alert.alert('Cardio', 'No se pudo guardar el cardio.');
    }
  }, [fcPromedio, loadCardio, tipo, zona]);

  const handleStartTimer = async () => {
    const label = CARDIO_TIPO_LABEL[tipo] ?? 'Cardio';
    if (restTimer.active) {
      Alert.alert('Descanso activo', 'Hay un timer de descanso corriendo. Iniciar cardio lo dejara separado, pero puede confundirte en notificaciones.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Iniciar cardio', onPress: () => cardioTimer.start(label, minutos * 60) },
      ]);
      return;
    }
    await cardioTimer.start(label, minutos * 60);
  };

  const handleFinishTimer = async () => {
    const elapsed = Math.max(1, Math.round(((cardioTimer.timer?.totalSeg ?? minutos * 60) - cardioTimer.remaining) / 60));
    const label = cardioTimer.label.toLowerCase();
    const typeFromLabel = Object.entries(CARDIO_TIPO_LABEL).find(([, value]) => value.toLowerCase() === label)?.[0] ?? tipo;
    await cardioTimer.stop();
    await saveCardio(elapsed, typeFromLabel);
  };

  const handleManualSave = async () => {
    await saveCardio(minutos);
    setTipo('bici');
    setMinutos(30);
  };

  const handleDelete = (log: CardioLog) => {
    Alert.alert('Eliminar cardio', `Eliminar ${CARDIO_TIPO_LABEL[log.tipo] ?? log.tipo} de ${log.minutos} min?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          getDB().runAsync('DELETE FROM cardio_logs WHERE id = ?', [log.id])
            .then(loadCardio)
            .catch((err) => {
              console.error('[CardioScreen] deleteCardio error', err);
              Alert.alert('Cardio', 'No se pudo eliminar el registro.');
            });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text3 }]}>Cargando cardio...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.text3 }]}>{formatLocalDate(today)}</Text>
          <Text style={[styles.title, { color: theme.text1 }]}>Cardio</Text>
        </View>

        <View style={[styles.timerCard, { backgroundColor: theme.bg2, borderColor: cardioTimer.active ? theme.accent : theme.border }]}>
          <View style={styles.timerTop}>
            <View>
              <Text style={[styles.timerLabel, { color: theme.text3 }]}>
                {cardioTimer.active ? cardioTimer.label : 'Timer'}
              </Text>
              <Text style={[styles.timerValue, { color: theme.text1 }]}>
                {cardioTimer.active ? formatClock(cardioTimer.remaining) : `${minutos}:00`}
              </Text>
            </View>
            <View style={[styles.timerIcon, { backgroundColor: cardioTimer.active ? theme.accentA : theme.bg3 }]}>
              <Icon name="timer" size={28} color={cardioTimer.active ? theme.accent : theme.text3} strokeW={1.8} />
            </View>
          </View>
          <View style={[styles.timerTrack, { backgroundColor: theme.bg4 }]}>
            <View style={[styles.timerFill, { backgroundColor: theme.accent, width: `${timerPct * 100}%` as `${number}%` }]} />
          </View>
          {cardioTimer.active ? (
            <View style={styles.timerActions}>
              <TouchableOpacity
                onPress={() => cardioTimer.addSeconds(300)}
                style={[styles.secondaryBtn, { backgroundColor: theme.bg3, borderColor: theme.border2 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: theme.text2 }]}>+5 min</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => cardioTimer.stop()}
                style={[styles.secondaryBtn, { backgroundColor: theme.bg3, borderColor: theme.border2 }]}
              >
                <Text style={[styles.secondaryBtnText, { color: theme.text2 }]}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <BtnPrimary icon={cardioTimer.active ? 'check' : 'timer'} onPress={cardioTimer.active ? handleFinishTimer : handleStartTimer}>
            {cardioTimer.active ? 'Guardar cardio' : 'Iniciar timer'}
          </BtnPrimary>
        </View>

        {!cardioTimer.active ? (
          <>
            <SectionLabel>Configurar</SectionLabel>
            <View style={[styles.formCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
              <View style={styles.chipsRow}>
                {CARDIO_TIPOS.map((item) => {
                  const active = tipo === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key}
                      onPress={() => setTipo(item.key)}
                      style={[
                        styles.typeChip,
                        {
                          backgroundColor: active ? theme.accentA : theme.bg3,
                          borderColor: active ? theme.accent : theme.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Icon name={item.icon} size={16} color={active ? theme.accent : theme.text3} strokeW={1.8} />
                      <Text style={[styles.typeChipText, { color: active ? theme.accent : theme.text2 }]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Stepper value={minutos} onChange={(v) => setMinutos(Math.min(180, v))} step={5} min={5} label="Minutos" unit="min" />
              <View style={styles.cardioDetails}>
                <Stepper value={fcPromedio} onChange={(v) => setFcPromedio(Math.min(220, v))} step={1} min={0} label="FC prom." unit="ppm" />
                <View style={styles.zoneWrap}>
                  <Text style={[styles.zoneLabel, { color: theme.text3 }]}>Zona</Text>
                  <View style={styles.zoneRow}>
                    {[1, 2, 3, 4, 5].map((z) => {
                      const active = zona === z;
                      return (
                        <TouchableOpacity
                          key={z}
                          onPress={() => setZona(z)}
                          style={[styles.zoneBtn, { backgroundColor: active ? theme.accentA : theme.bg4, borderColor: active ? theme.accent : theme.border2 }]}
                        >
                          <Text style={[styles.zoneBtnText, { color: active ? theme.accent : theme.text2 }]}>{z}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
              <TouchableOpacity onPress={handleManualSave} style={[styles.manualBtn, { borderColor: theme.border2 }]}>
                <Text style={[styles.manualBtnText, { color: theme.text2 }]}>Guardar sin timer</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : null}

        <SectionLabel>Hoy</SectionLabel>
        <View style={[styles.summaryCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.summaryLabel, { color: theme.text3 }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: theme.text1 }]}>{totalMin}</Text>
            <Text style={[styles.summaryUnit, { color: theme.text3 }]}>min registrados</Text>
          </View>
          <View style={[styles.summaryIcon, { backgroundColor: theme.accentA }]}>
            <Icon name="heart" size={28} color={theme.accent} strokeW={1.8} />
          </View>
        </View>

        <View style={[styles.listCard, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
          {logs.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.text3 }]}>Sin cardio registrado hoy</Text>
          ) : (
            logs.map((log, index) => (
              <TouchableOpacity
                key={log.id}
                onLongPress={() => handleDelete(log)}
                style={[styles.logRow, { borderBottomColor: theme.border, borderBottomWidth: index < logs.length - 1 ? 1 : 0 }]}
                accessibilityRole="button"
              >
                <View style={[styles.logIcon, { backgroundColor: theme.bg3 }]}>
                  <Icon name={CARDIO_TIPO_ICON[log.tipo] ?? 'heart'} size={16} color={theme.text2} strokeW={1.8} />
                </View>
                <View style={styles.logBody}>
                  <Text style={[styles.logTitle, { color: theme.text1 }]}>{CARDIO_TIPO_LABEL[log.tipo] ?? log.tipo}</Text>
                  <Text style={[styles.logSub, { color: theme.text3 }]}>
                    {log.fc_promedio_ppm ? `${log.fc_promedio_ppm} ppm - Zona ${log.zona ?? '-'}` : 'Mantener presionado para eliminar'}
                  </Text>
                </View>
                <Text style={[styles.logMinutes, { color: SEMANTIC.green }]}>{log.minutos} min</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, marginTop: 8 },
  header: { padding: 20, paddingTop: 8, paddingBottom: 14 },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 30, fontWeight: '900', letterSpacing: -0.4, lineHeight: 34 },
  timerCard: { marginHorizontal: 20, marginBottom: 14, padding: 18, borderWidth: 1, borderRadius: RADII.r3, gap: 16 },
  timerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timerLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  timerValue: { fontSize: 50, fontWeight: '900', letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  timerIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  timerTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  timerFill: { height: '100%', borderRadius: 4 },
  timerActions: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, minHeight: 48, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryBtnText: { fontSize: 13, fontWeight: '800' },
  formCard: { marginHorizontal: 20, marginBottom: 14, padding: 16, borderWidth: 1, borderRadius: RADII.r2, gap: 16 },
  chipsRow: { flexDirection: 'row', gap: 8 },
  typeChip: { flex: 1, minHeight: 52, borderWidth: 1, borderRadius: RADII.r1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  typeChipText: { fontSize: 13, fontWeight: '800' },
  cardioDetails: { gap: 16 },
  zoneWrap: { gap: 8 },
  zoneLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, textAlign: 'center' },
  zoneRow: { flexDirection: 'row', gap: 8 },
  zoneBtn: { flex: 1, minHeight: 44, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  zoneBtnText: { fontSize: 14, fontWeight: '900' },
  manualBtn: { minHeight: 48, borderRadius: RADII.r1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  manualBtnText: { fontSize: 13, fontWeight: '800' },
  summaryCard: { marginHorizontal: 20, marginBottom: 14, padding: 18, borderWidth: 1, borderRadius: RADII.r2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryValue: { fontSize: 40, fontWeight: '900', letterSpacing: -1, marginTop: 2 },
  summaryUnit: { fontSize: 13, fontWeight: '600' },
  summaryIcon: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  listCard: { marginHorizontal: 20, marginBottom: 14, borderWidth: 1, borderRadius: RADII.r2, overflow: 'hidden' },
  emptyText: { fontSize: 14, textAlign: 'center', padding: 18 },
  logRow: { minHeight: 62, paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  logIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logBody: { flex: 1 },
  logTitle: { fontSize: 15, fontWeight: '700' },
  logSub: { fontSize: 12, marginTop: 2 },
  logMinutes: { fontSize: 15, fontWeight: '900' },
});
