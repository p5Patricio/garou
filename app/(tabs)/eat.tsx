import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, MACRO_COLORS, SEMANTIC } from '../../src/constants/theme';
import SectionLabel from '../../src/components/SectionLabel';
import Icon from '../../src/components/Icon';
import { useNutrition } from '../../src/hooks/useNutrition';
import AddFoodScreen from '../../src/screens/AddFoodScreen';
import { MEAL_NAMES, MEAL_ICONS } from '../../src/constants/meals';
import type { MealGroup } from '../../src/types/nutrition';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AddFoodModal {
  visible: boolean;
  mealNumber: 1 | 2 | 3;
  mealName: string;
}

// ---------------------------------------------------------------------------
// Water quick-add presets (ml)
// ---------------------------------------------------------------------------

const WATER_PRESETS = [250, 500, 750, 1000] as const;
const WATER_TARGET_ML = 3000;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function EatScreen() {
  const { theme } = useTheme();
  const {
    loading,
    dayType,
    target,
    totals,
    meals,
    waterMl,
    waterTarget,
    addFood,
    removeFood,
    addWater,
    searchFoods,
  } = useNutrition();

  const [addFoodModal, setAddFoodModal] = useState<AddFoodModal | null>(null);

  // --- Loading guard -------------------------------------------------------
  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.text3 }]}>Cargando nutrición…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Derived display values ----------------------------------------------
  const kcalRound = Math.round(totals.kcal);
  const kcalRest = Math.max(target.kcal - kcalRound, 0);

  // --- Handlers ------------------------------------------------------------
  const handleOpenAddFood = (meal: MealGroup) => {
    setAddFoodModal({
      visible: true,
      mealNumber: meal.numComida as 1 | 2 | 3,
      mealName: meal.nombre,
    });
  };

  const handleAddFood = async (foodId: number, grams: number) => {
    if (!addFoodModal) return;
    await addFood(addFoodModal.mealNumber, foodId, grams);
    setAddFoodModal(null);
  };

  const handleCloseAddFood = () => {
    setAddFoodModal(null);
  };

  const handleRemoveFood = (logId: number, nombre: string) => {
    Alert.alert(
      'Eliminar alimento',
      `¿Eliminar "${nombre}" del registro?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            removeFood(logId).catch((err) =>
              console.error('[EatScreen] removeFood error', err)
            );
          },
        },
      ]
    );
  };

  // --- Main render ---------------------------------------------------------
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          {/* Day type badge */}
          <Text
            style={[
              styles.dayTypeBadge,
              { color: dayType === 'entreno' ? theme.accent : theme.text3 },
            ]}
          >
            {dayType === 'entreno' ? 'Día de entreno' : 'Día de descanso'}
          </Text>
          <Text style={[styles.title, { color: theme.text1 }]}>Nutrición</Text>
        </View>

        {/* Macro summary card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.bg2,
              borderColor: theme.border,
              borderRadius: RADII.r2,
              marginHorizontal: 20,
              marginBottom: 14,
              padding: 16,
            },
          ]}
        >
          <View style={styles.kcalRow}>
            <View>
              <Text style={[styles.kcalVal, { color: theme.text1 }]}>{kcalRound}</Text>
              <Text style={[styles.kcalMax, { color: theme.text3 }]}>/ {target.kcal} kcal</Text>
            </View>
            <View style={styles.kcalRight}>
              <Text style={[styles.kcalRestLabel, { color: theme.text3 }]}>Restante</Text>
              <Text style={[styles.kcalRest, { color: theme.accent }]}>{kcalRest} kcal</Text>
            </View>
          </View>
          <View style={styles.macroCols}>
            {(
              [
                ['Prot.', Math.round(totals.p), target.p, MACRO_COLORS.protein],
                ['Carbos', Math.round(totals.c), target.c, MACRO_COLORS.carbs],
                ['Grasa', Math.round(totals.f), target.f, MACRO_COLORS.fat],
              ] as [string, number, number, string][]
            ).map(([l, v, m, c]) => {
              const pct = Math.min(v / m, 1) * 100;
              return (
                <View key={l} style={styles.macroCol}>
                  <View style={styles.macroColHeader}>
                    <Text style={[styles.macroColLabel, { color: theme.text3 }]}>{l}</Text>
                    <Text style={[styles.macroColVal, { color: theme.text2 }]}>{v}g</Text>
                  </View>
                  <View style={[styles.macroColTrack, { backgroundColor: theme.bg4 }]}>
                    <View
                      style={[
                        styles.macroColFill,
                        { width: `${pct}%`, backgroundColor: c },
                      ]}
                    />
                  </View>
                  <Text style={[styles.macroColMax, { color: theme.text4 }]}>/{m}g</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Meal sections */}
        <SectionLabel>Comidas del día</SectionLabel>
        {meals.map((meal) => {
          const mealIcon = MEAL_ICONS[meal.numComida as 1 | 2 | 3];
          const hasEntries = meal.entries.length > 0;
          const mealKcal = Math.round(meal.totals.kcal);
          const mealP = Math.round(meal.totals.p);

          return (
            <View
              key={meal.numComida}
              style={[
                styles.card,
                {
                  backgroundColor: theme.bg2,
                  borderColor: theme.border,
                  borderRadius: RADII.r2,
                  marginHorizontal: 20,
                  marginBottom: 10,
                  overflow: 'hidden',
                },
              ]}
            >
              {/* Meal header */}
              <View
                style={[
                  styles.comidaHeader,
                  {
                    borderBottomColor: theme.border,
                    borderBottomWidth: hasEntries ? 1 : 0,
                  },
                ]}
              >
                <View
                  style={[
                    styles.comidaIconWrap,
                    { backgroundColor: theme.bg3, borderRadius: RADII.r1 },
                  ]}
                >
                  <Icon name={mealIcon} size={16} color={theme.text2} strokeW={1.6} />
                </View>
                <View style={styles.comidaInfo}>
                  <Text style={[styles.comidaName, { color: theme.text1 }]}>
                    {meal.nombre}
                  </Text>
                  {hasEntries ? (
                    <Text style={[styles.comidaSummary, { color: theme.text3 }]}>
                      {mealKcal} kcal · {mealP}g P
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => handleOpenAddFood(meal)}
                  style={[
                    styles.addComidaBtn,
                    { backgroundColor: theme.accentA, borderRadius: RADII.r1 },
                  ]}
                  accessibilityLabel={`Añadir alimento a ${meal.nombre}`}
                >
                  <Text style={[styles.addComidaBtnText, { color: theme.accent }]}>
                    + Añadir
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Entry rows */}
              {meal.entries.map((entry, ii) => (
                <TouchableOpacity
                  key={entry.logId}
                  onLongPress={() => handleRemoveFood(entry.logId, entry.nombre)}
                  style={[
                    styles.comidaItem,
                    {
                      borderBottomColor: theme.border,
                      borderBottomWidth: ii < meal.entries.length - 1 ? 1 : 0,
                    },
                  ]}
                  activeOpacity={0.85}
                  accessibilityLabel={`${entry.nombre}, mantén presionado para eliminar`}
                >
                  <View style={[styles.comidaItemDot, { backgroundColor: theme.bg5 }]} />
                  <Text style={[styles.comidaItemName, { color: theme.text2 }]}>
                    {entry.nombre}
                  </Text>
                  <Text style={[styles.comidaItemGrams, { color: theme.text4 }]}>
                    {entry.gramos}g
                  </Text>
                  <Text style={[styles.comidaItemKcal, { color: theme.text3 }]}>
                    {Math.round(entry.macros.kcal)} kcal
                  </Text>
                </TouchableOpacity>
              ))}

              {hasEntries ? (
                <Text style={[styles.removeHint, { color: theme.text4 }]}>
                  Mantén presionado un alimento para eliminarlo
                </Text>
              ) : null}
            </View>
          );
        })}

        {/* Water tracker */}
        <SectionLabel>Agua</SectionLabel>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.bg2,
              borderColor: theme.border,
              borderRadius: RADII.r2,
              marginHorizontal: 20,
              marginBottom: 14,
              padding: 16,
            },
          ]}
        >
          {/* Progress row */}
          <View style={styles.waterRow}>
            <View>
              <Text style={[styles.waterVal, { color: theme.text1 }]}>
                {waterMl} ml
              </Text>
              <Text style={[styles.waterSub, { color: theme.text3 }]}>
                {Math.round(waterMl / 250)} vasos · meta {waterTarget ?? WATER_TARGET_ML} ml
              </Text>
            </View>
            <View style={[styles.waterBadge, { backgroundColor: theme.bg3 }]}>
              <Icon name="drop" size={16} color={theme.accent} strokeW={1.8} />
            </View>
          </View>

          {/* Progress bar */}
          <View style={[styles.waterTrack, { backgroundColor: theme.bg4 }]}>
            <View
              style={[
                styles.waterFill,
                {
                  width: `${Math.min(waterMl / (waterTarget ?? WATER_TARGET_ML), 1) * 100}%`,
                  backgroundColor: theme.accent,
                },
              ]}
            />
          </View>

          {/* Quick-add buttons */}
          <View style={styles.waterPresets}>
            {WATER_PRESETS.map((ml) => (
              <TouchableOpacity
                key={ml}
                onPress={() => {
                  addWater(ml).catch((err) =>
                    console.error('[EatScreen] addWater error', err)
                  );
                }}
                style={[
                  styles.waterPresetBtn,
                  { backgroundColor: theme.bg3, borderColor: theme.border },
                ]}
                accessibilityLabel={`Agregar ${ml} ml de agua`}
              >
                <Text style={[styles.waterPresetText, { color: theme.text2 }]}>
                  +{ml}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Add food modal */}
      {addFoodModal ? (
        <AddFoodScreen
          visible={addFoodModal.visible}
          mealName={addFoodModal.mealName}
          onClose={handleCloseAddFood}
          onAdd={handleAddFood}
          searchFoods={searchFoods}
        />
      ) : null}
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  dayTypeBadge: { fontSize: 13, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5 },
  card: { borderWidth: 1 },
  kcalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  kcalVal: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5 },
  kcalMax: { fontSize: 14, marginTop: 2 },
  kcalRight: { alignItems: 'flex-end' },
  kcalRestLabel: { fontSize: 12 },
  kcalRest: { fontSize: 18, fontWeight: '700' },
  macroCols: { flexDirection: 'row', gap: 10 },
  macroCol: { flex: 1 },
  macroColHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  macroColLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  macroColVal: { fontSize: 11, fontWeight: '700' },
  macroColTrack: { height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  macroColFill: { height: '100%', borderRadius: 3 },
  macroColMax: { fontSize: 10 },
  comidaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  comidaIconWrap: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  comidaInfo: { flex: 1 },
  comidaName: { fontSize: 15, fontWeight: '700' },
  comidaSummary: { fontSize: 12, marginTop: 2 },
  addComidaBtn: {
    height: 32,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
    minHeight: 48,
  },
  addComidaBtnText: { fontSize: 13, fontWeight: '700' },
  comidaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 48,
  },
  removeHint: { fontSize: 11, textAlign: 'center', paddingVertical: 8, fontStyle: 'italic' },
  comidaItemDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  comidaItemName: { flex: 1, fontSize: 13 },
  comidaItemGrams: { fontSize: 12 },
  comidaItemKcal: { fontSize: 12 },
  waterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  waterVal: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  waterSub: { fontSize: 12, marginTop: 2 },
  waterBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterTrack: { height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 16 },
  waterFill: { height: '100%', borderRadius: 3 },
  waterPresets: { flexDirection: 'row', gap: 10 },
  waterPresetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waterPresetText: { fontSize: 13, fontWeight: '700' },
});
