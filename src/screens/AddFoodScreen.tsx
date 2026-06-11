import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme, RADII, MACRO_COLORS } from '../constants/theme';
import Stepper from '../components/Stepper';
import BtnPrimary from '../components/BtnPrimary';
import type { Food } from '../types/nutrition';
import { calculateMacros } from '../utils/macros';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AddFoodScreenProps {
  /** Controls Modal visibility */
  visible: boolean;
  /** Display label, e.g. "Desayuno" */
  mealName: string;
  onClose(): void;
  /** Called with food id and final grams when the user confirms */
  onAdd(foodId: number, grams: number): Promise<void>;
  /** Bound to useNutrition.searchFoods */
  searchFoods(term: string): Promise<Food[]>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEBOUNCE_MS = 300;
const DEFAULT_GRAMS = 100;
const MAX_GRAMS = 2000;

export default function AddFoodScreen({
  visible,
  mealName,
  onClose,
  onAdd,
  searchFoods,
}: AddFoodScreenProps) {
  const { theme } = useTheme();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Food[]>([]);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(DEFAULT_GRAMS);
  const [searching, setSearching] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset all local state when the modal opens
  useEffect(() => {
    if (visible) {
      setSearchTerm('');
      setSearchResults([]);
      setSelectedFood(null);
      setGrams(DEFAULT_GRAMS);
      setSearching(false);
      setConfirming(false);
    }
  }, [visible]);

  // Debounced search
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchTerm(text);
      setSelectedFood(null);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (text.trim().length === 0) {
        setSearchResults([]);
        setSearching(false);
        return;
      }

      setSearching(true);
      debounceRef.current = setTimeout(async () => {
        try {
          const results = await searchFoods(text);
          setSearchResults(results);
        } catch (err) {
          console.error('[AddFoodScreen] search error', err);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      }, DEBOUNCE_MS);
    },
    [searchFoods]
  );

  const handleSelectFood = useCallback((food: Food) => {
    setSelectedFood(food);
    setGrams(DEFAULT_GRAMS);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!selectedFood || confirming) return;
    setConfirming(true);
    try {
      // Clamp grams defensively since Stepper has no max prop
      const clampedGrams = Math.min(grams, MAX_GRAMS);
      await onAdd(selectedFood.id, clampedGrams);
      onClose();
    } catch (err) {
      console.error('[AddFoodScreen] onAdd error', err);
      setConfirming(false);
    }
  }, [selectedFood, grams, confirming, onAdd, onClose]);

  // Macro preview for the selected food at current grams
  const preview = selectedFood ? calculateMacros(selectedFood, grams) : null;

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  const renderFoodItem = useCallback(
    ({ item }: { item: Food }) => {
      const isSelected = selectedFood?.id === item.id;
      return (
        <TouchableOpacity
          onPress={() => handleSelectFood(item)}
          style={[
            styles.foodRow,
            {
              borderBottomColor: theme.border,
              backgroundColor: isSelected ? theme.accentA : 'transparent',
            },
          ]}
          activeOpacity={0.7}
        >
          <View style={styles.foodInfo}>
            <Text
              style={[
                styles.foodName,
                { color: isSelected ? theme.accent : theme.text1 },
              ]}
              numberOfLines={1}
            >
              {item.nombre}
            </Text>
            <Text style={[styles.foodMacros, { color: theme.text3 }]}>
              {Math.round(item.kcal100g)} kcal · {item.proteina100g.toFixed(1)}g P ·{' '}
              {item.carbos100g.toFixed(1)}g C · {item.grasa100g.toFixed(1)}g G
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [selectedFood, theme, handleSelectFood]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={[styles.root, { backgroundColor: theme.bg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.cancelBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.cancelText, { color: theme.text2 }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text1 }]}>{mealName}</Text>
          <View style={styles.cancelBtn} />
        </View>

        {/* Search input */}
        <View style={[styles.searchWrap, { borderBottomColor: theme.border }]}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: theme.bg3,
                borderRadius: RADII.r2,
                color: theme.text1,
              },
            ]}
            placeholder="Buscar alimento..."
            placeholderTextColor={theme.text3}
            value={searchTerm}
            onChangeText={handleSearchChange}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {searching && (
            <ActivityIndicator
              style={styles.searchSpinner}
              color={theme.accent}
              size="small"
            />
          )}
        </View>

        {/* Results list or empty state */}
        {searchTerm.trim().length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.text3 }]}>
              Escribe el nombre de un alimento para buscarlo
            </Text>
          </View>
        ) : searchResults.length === 0 && !searching ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.text3 }]}>
              Sin resultados para "{searchTerm}"
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => String(item.id)}
            renderItem={renderFoodItem}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
            )}
          />
        )}

        {/* Selection panel — shown only when a food is selected */}
        {selectedFood && preview ? (
          <View style={[styles.selectionPanel, { backgroundColor: theme.bg2, borderTopColor: theme.border }]}>
            <Text style={[styles.selectedFoodName, { color: theme.text1 }]} numberOfLines={1}>
              {selectedFood.nombre}
            </Text>

            {/* Macro preview at current grams */}
            <View style={styles.previewRow}>
              {[
                { label: 'Kcal', value: Math.round(preview.kcal), color: theme.text2 },
                { label: 'Prot', value: `${preview.p.toFixed(1)}g`, color: MACRO_COLORS.protein },
                { label: 'Carbos', value: `${preview.c.toFixed(1)}g`, color: MACRO_COLORS.carbs },
                { label: 'Grasa', value: `${preview.f.toFixed(1)}g`, color: MACRO_COLORS.fat },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.previewCell}>
                  <Text style={[styles.previewVal, { color }]}>{value}</Text>
                  <Text style={[styles.previewLabel, { color: theme.text3 }]}>{label}</Text>
                </View>
              ))}
            </View>

            {/* Grams stepper */}
            <View style={styles.stepperWrap}>
              <Stepper
                value={grams}
                onChange={setGrams}
                step={5}
                min={5}
                label="Gramos"
                unit="g"
              />
            </View>

            {/* Confirm button */}
            <View style={styles.confirmWrap}>
              <BtnPrimary onPress={handleConfirm} disabled={confirming}>
                {confirming ? 'Guardando…' : 'Agregar alimento'}
              </BtnPrimary>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  cancelBtn: {
    minWidth: 70,
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchInput: {
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  searchSpinner: {
    position: 'absolute',
    right: 28,
    top: 24,
  },
  list: {
    flex: 1,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 3,
  },
  foodMacros: {
    fontSize: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
  selectionPanel: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 20,
    gap: 12,
  },
  selectedFoodName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previewCell: {
    alignItems: 'center',
    minWidth: 60,
  },
  previewVal: {
    fontSize: 16,
    fontWeight: '700',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  stepperWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  confirmWrap: {
    marginTop: 4,
  },
});
