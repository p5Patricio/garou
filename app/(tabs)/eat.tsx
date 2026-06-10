import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, MACRO_COLORS, SEMANTIC } from '../../src/constants/theme';
import SectionLabel from '../../src/components/SectionLabel';
import Icon from '../../src/components/Icon';
import { hoy, macros, alimentos } from '../../src/data/appData';

const COMIDAS = [
  { nombre: 'Desayuno', items: macros.logHoy.comidas, done: true },
  { nombre: 'Comida', items: [] as typeof macros.logHoy.comidas, done: false },
  { nombre: 'Cena', items: [] as typeof macros.logHoy.comidas, done: false },
];

const QUICK_PILLS = ['Menú hoy', 'Recientes', 'Favoritos', 'Buscar'];

export default function EatScreen() {
  const { theme } = useTheme();
  const log = macros.logHoy;
  const target = macros.entrenoDia;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.date, { color: theme.text3 }]}>{hoy.fecha}</Text>
          <Text style={[styles.title, { color: theme.text1 }]}>Nutrición</Text>
        </View>

        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, padding: 16 }]}>
          <View style={styles.kcalRow}>
            <View>
              <Text style={[styles.kcalVal, { color: theme.text1 }]}>{log.kcal}</Text>
              <Text style={[styles.kcalMax, { color: theme.text3 }]}>/ {target.kcal} kcal</Text>
            </View>
            <View style={styles.kcalRight}>
              <Text style={[styles.kcalRestLabel, { color: theme.text3 }]}>Restante</Text>
              <Text style={[styles.kcalRest, { color: theme.accent }]}>{target.kcal - log.kcal} kcal</Text>
            </View>
          </View>
          <View style={styles.macroCols}>
            {[
              ['Prot.', log.p, target.p, MACRO_COLORS.protein],
              ['Carbos', log.c, target.c, MACRO_COLORS.carbs],
              ['Grasa', log.f, target.f, MACRO_COLORS.fat],
            ].map(([l, v, m, c]) => {
              const pct = Math.min((v as number) / (m as number), 1) * 100;
              return (
                <View key={l as string} style={styles.macroCol}>
                  <View style={styles.macroColHeader}>
                    <Text style={[styles.macroColLabel, { color: theme.text3 }]}>{l as string}</Text>
                    <Text style={[styles.macroColVal, { color: theme.text2 }]}>{v as number}g</Text>
                  </View>
                  <View style={[styles.macroColTrack, { backgroundColor: theme.bg4 }]}>
                    <View style={[styles.macroColFill, { width: `${pct}%`, backgroundColor: c as string }]} />
                  </View>
                  <Text style={[styles.macroColMax, { color: theme.text4 }]}>/{m as number}g</Text>
                </View>
              );
            })}
          </View>
        </View>

        <SectionLabel action="Ver todo">Registro rápido</SectionLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsRow}>
          {QUICK_PILLS.map((p, i) => (
            <TouchableOpacity
              key={p}
              style={[styles.pill, {
                backgroundColor: i === 0 ? theme.accentA : theme.bg3,
                borderColor: i === 0 ? theme.accentA : theme.border,
              }]}
            >
              <Text style={[styles.pillText, { color: i === 0 ? theme.accent : theme.text2 }]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <SectionLabel>Alimentos frecuentes</SectionLabel>
        <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 14, overflow: 'hidden' }]}>
          {alimentos.slice(0, 4).map((a, i) => (
            <View
              key={i}
              style={[styles.alimentoRow, { borderBottomColor: theme.border, borderBottomWidth: i < 3 ? 1 : 0 }]}
            >
              <View style={[styles.alimentoIcon, { backgroundColor: theme.bg3, borderRadius: RADII.r1 }]}>
                <Icon name="fork" size={18} color={theme.text3} strokeW={1.5} />
              </View>
              <View style={styles.alimentoInfo}>
                <Text style={[styles.alimentoName, { color: theme.text1 }]}>{a.nombre}</Text>
                <Text style={[styles.alimentoMacros, { color: theme.text3 }]}>
                  {a.kcal} kcal · {a.p}g P · {a.c}g C · {a.f}g F
                </Text>
              </View>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.accentA }]}>
                <Icon name="plus" size={15} color={theme.accent} strokeW={2.5} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <SectionLabel>Comidas del día</SectionLabel>
        {COMIDAS.map((c, ci) => (
          <View key={ci} style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2, marginHorizontal: 20, marginBottom: 10, overflow: 'hidden' }]}>
            <View style={[styles.comidaHeader, { borderBottomColor: theme.border, borderBottomWidth: c.done ? 1 : 0 }]}>
              <View style={[styles.comidaIconWrap, { backgroundColor: theme.bg3, borderRadius: RADII.r1 }]}>
                <Icon name={ci === 0 ? 'sun' : ci === 1 ? 'fire' : 'moon'} size={16} color={theme.text2} strokeW={1.6} />
              </View>
              <View style={styles.comidaInfo}>
                <Text style={[styles.comidaName, { color: theme.text1 }]}>{c.nombre}</Text>
                {c.done ? (
                  <Text style={[styles.comidaSummary, { color: theme.text3 }]}>
                    {c.items.reduce((a, item) => a + item.kcal, 0)} kcal · {c.items.reduce((a, item) => a + item.p, 0)}g P
                  </Text>
                ) : null}
              </View>
              {!c.done ? (
                <TouchableOpacity style={[styles.addComidaBtn, { backgroundColor: theme.accentA, borderRadius: RADII.r1 }]}>
                  <Text style={[styles.addComidaBtnText, { color: theme.accent }]}>+ Añadir</Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.doneBadge, { backgroundColor: SEMANTIC.greenA }]}>
                  <Text style={[styles.doneBadgeText, { color: SEMANTIC.green }]}>✓</Text>
                </View>
              )}
            </View>
            {c.done && c.items.map((item, ii) => (
              <View
                key={ii}
                style={[styles.comidaItem, { borderBottomColor: theme.border, borderBottomWidth: ii < c.items.length - 1 ? 1 : 0 }]}
              >
                <View style={[styles.comidaItemDot, { backgroundColor: theme.bg5 }]} />
                <Text style={[styles.comidaItemName, { color: theme.text2 }]}>{item.nombre}</Text>
                <Text style={[styles.comidaItemKcal, { color: theme.text3 }]}>{item.kcal} kcal</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  date: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  card: { borderWidth: 1 },
  kcalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  kcalVal: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  kcalMax: { fontSize: 14, marginTop: 2 },
  kcalRight: { alignItems: 'flex-end' },
  kcalRestLabel: { fontSize: 12 },
  kcalRest: { fontSize: 18, fontWeight: '700' },
  macroCols: { flexDirection: 'row', gap: 10 },
  macroCol: { flex: 1 },
  macroColHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroColLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  macroColVal: { fontSize: 11, fontWeight: '700' },
  macroColTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  macroColFill: { height: '100%', borderRadius: 3 },
  macroColMax: { fontSize: 10 },
  pillsRow: { paddingHorizontal: 20, paddingBottom: 14, gap: 8 },
  pill: { height: 34, paddingHorizontal: 14, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  pillText: { fontSize: 13, fontWeight: '600' },
  alimentoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 11 },
  alimentoIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  alimentoInfo: { flex: 1 },
  alimentoName: { fontSize: 14, fontWeight: '600' },
  alimentoMacros: { fontSize: 12, marginTop: 2 },
  addBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', minWidth: 48, minHeight: 48 },
  comidaHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 13 },
  comidaIconWrap: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  comidaInfo: { flex: 1 },
  comidaName: { fontSize: 15, fontWeight: '700' },
  comidaSummary: { fontSize: 12, marginTop: 2 },
  addComidaBtn: { height: 32, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minWidth: 48 },
  addComidaBtnText: { fontSize: 13, fontWeight: '700' },
  doneBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  doneBadgeText: { fontSize: 11, fontWeight: '600' },
  comidaItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 9 },
  comidaItemDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  comidaItemName: { flex: 1, fontSize: 13 },
  comidaItemKcal: { fontSize: 12 },
});
