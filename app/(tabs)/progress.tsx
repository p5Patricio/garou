import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, MACRO_COLORS } from '../../src/constants/theme';
import StatCard from '../../src/components/StatCard';
import SectionLabel from '../../src/components/SectionLabel';
import LineChart from '../../src/components/LineChart';
import BtnPrimary from '../../src/components/BtnPrimary';
import { pesoSemanas, cinturaSemanas, fuerzaSentadilla } from '../../src/data/appData';

type TabKey = 'peso' | 'fuerza' | 'cintura';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'peso', label: 'Peso' },
  { key: 'fuerza', label: 'Fuerza' },
  { key: 'cintura', label: 'Cintura' },
];

const RECENT_WEIGHT = [
  ['9 jun', '78.5 kg'],
  ['8 jun', '78.6 kg'],
  ['6 jun', '78.8 kg'],
  ['3 jun', '79.0 kg'],
  ['1 jun', '79.1 kg'],
];

const EJERCICIOS = ['Sentadilla', 'Banca', 'Peso muerto', 'Prensa'];

export default function ProgressScreen() {
  const { theme } = useTheme();
  const [tab, setTab] = useState<TabKey>('peso');
  const avgWeights = pesoSemanas.map((s) => s.avg);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text1 }]}>Progreso</Text>
        </View>

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
              <Text style={[styles.tabBtnText, { color: tab === key ? theme.accent : theme.text2 }]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'peso' && (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <StatCard icon="weight" label="Peso actual" value="78.5" unit="kg" sub="hace 2 días" />
              </View>
              <View style={styles.statItem}>
                <StatCard icon="chart" label="Tendencia" value="−0.3" unit="kg/sem" sub="Últimas 4 sem." accent />
              </View>
            </View>

            <SectionLabel>Promedio semanal</SectionLabel>
            <View style={[styles.chartCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14 }]}>
              <View style={styles.chartLabels}>
                {pesoSemanas.map((s, i) => (
                  <View key={i} style={styles.chartLabelItem}>
                    <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>{s.sem.replace('Sem ', '')}</Text>
                    <Text style={[styles.chartLabelVal, { color: i === pesoSemanas.length - 1 ? theme.accent : theme.text2 }]}>
                      {s.avg}
                    </Text>
                  </View>
                ))}
              </View>
              <LineChart points={avgWeights} color={theme.accent} height={80} />
            </View>

            <View style={styles.btnWrap}>
              <BtnPrimary icon="plus">Registrar peso de hoy</BtnPrimary>
            </View>

            <SectionLabel>Registros recientes</SectionLabel>
            <View style={[styles.listCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, overflow: 'hidden' }]}>
              {RECENT_WEIGHT.map(([d, w], i, arr) => (
                <View key={i} style={[styles.listRow, { borderBottomColor: theme.border, borderBottomWidth: i < arr.length - 1 ? 1 : 0 }]}>
                  <Text style={[styles.listDate, { color: theme.text3 }]}>{d}</Text>
                  <Text style={[styles.listValue, { color: theme.text1 }]}>{w}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {tab === 'fuerza' && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
              {EJERCICIOS.map((e, i) => (
                <TouchableOpacity
                  key={e}
                  style={[styles.pill, {
                    backgroundColor: i === 0 ? theme.accentA : theme.bg3,
                    borderColor: theme.border,
                    borderRadius: 17,
                  }]}
                >
                  <Text style={[styles.pillText, { color: i === 0 ? theme.accent : theme.text2 }]}>{e}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <StatCard icon="weight" label="Último" value="82.5" unit="kg × 6" sub="hace 7 días" />
              </View>
              <View style={styles.statItem}>
                <StatCard icon="chart" label="Progreso" value="+12.5" unit="kg" sub="últimas 7 ses." accent />
              </View>
            </View>

            <SectionLabel>Sentadilla — carga (kg)</SectionLabel>
            <View style={[styles.chartCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14 }]}>
              <LineChart points={fuerzaSentadilla.map((s) => s.peso)} color={MACRO_COLORS.protein} height={80} />
              <View style={styles.chartLabels}>
                {fuerzaSentadilla.map((s, i) => (
                  <View key={i} style={styles.chartLabelItem}>
                    <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>{s.fecha.slice(0, 6)}</Text>
                    <Text style={[styles.chartLabelVal, { color: i === fuerzaSentadilla.length - 1 ? MACRO_COLORS.protein : theme.text3 }]}>
                      {s.peso}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}

        {tab === 'cintura' && (
          <>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <StatCard icon="weight" label="Cintura" value="85" unit="cm" sub="hace 5 días" />
              </View>
              <View style={styles.statItem}>
                <StatCard icon="chart" label="Cambio" value="−2" unit="cm" sub="vs. inicio" accent />
              </View>
            </View>

            <SectionLabel>Tendencia cintura (cm)</SectionLabel>
            <View style={[styles.chartCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14 }]}>
              <LineChart points={cinturaSemanas} color={MACRO_COLORS.carbs} height={80} />
              <View style={styles.chartLabels}>
                {pesoSemanas.map((s, i) => (
                  <View key={i} style={styles.chartLabelItem}>
                    <Text style={[styles.chartLabelTop, { color: theme.text4 }]}>{s.sem.replace('Sem ', '')}</Text>
                    <Text style={[styles.chartLabelVal, { color: i === cinturaSemanas.length - 1 ? MACRO_COLORS.carbs : theme.text3 }]}>
                      {cinturaSemanas[i]}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.btnWrap}>
              <BtnPrimary icon="plus">Registrar medidas hoy</BtnPrimary>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
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
});
