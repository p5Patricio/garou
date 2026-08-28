import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RADII, useTheme } from '../constants/theme';
import Icon from '../components/Icon';
import BtnPrimary from '../components/BtnPrimary';
import { searchDataset, datasetMediaUrl, type DatasetExercise } from '../data/exerciseDataset';

const BODY_PART_ES: Record<string, string> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Abdomen',
};
const BODY_PARTS = Object.keys(BODY_PART_ES);

interface ExerciseLibraryScreenProps {
  visible: boolean;
  onClose: () => void;
  /** When set, the detail view offers "Vincular este ejercicio" instead of just browsing. */
  onSelect?: (entry: DatasetExercise) => void;
}

export default function ExerciseLibraryScreen({ visible, onClose, onSelect }: ExerciseLibraryScreenProps) {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [bodyPartFilter, setBodyPartFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<DatasetExercise | null>(null);

  const results = useMemo(() => {
    const base = searchDataset(query, 200);
    return bodyPartFilter ? base.filter((e) => e.bodyPart === bodyPartFilter) : base;
  }, [query, bodyPartFilter]);

  const handleClose = () => {
    setDetail(null);
    setQuery('');
    setBodyPartFilter(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top', 'bottom']}>
        {detail ? (
          <>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <TouchableOpacity onPress={() => setDetail(null)} style={styles.headerBtn} accessibilityRole="button">
                <Text style={[styles.backCaret, { color: theme.text2 }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text1 }]} numberOfLines={1}>{detail.name}</Text>
              <TouchableOpacity onPress={handleClose} style={styles.headerBtn} accessibilityRole="button">
                <Icon name="x" size={20} color={theme.text2} strokeW={2} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={styles.detailScroll}>
              <Image
                source={{ uri: datasetMediaUrl(detail.gif) }}
                style={[styles.detailGif, { backgroundColor: theme.bg3 }]}
                contentFit="contain"
                cachePolicy="disk"
                accessibilityLabel={`Animacion de ${detail.name}`}
              />
              <View style={styles.detailChips}>
                <View style={[styles.chip, { backgroundColor: theme.accentA }]}>
                  <Text style={[styles.chipText, { color: theme.accent }]}>
                    {BODY_PART_ES[detail.bodyPart] ?? detail.bodyPart}
                  </Text>
                </View>
                <View style={[styles.chip, { backgroundColor: theme.bg3 }]}>
                  <Text style={[styles.chipTextNeutral, { color: theme.text3 }]}>{detail.equipment}</Text>
                </View>
                <View style={[styles.chip, { backgroundColor: theme.bg3 }]}>
                  <Text style={[styles.chipTextNeutral, { color: theme.text3 }]}>{detail.target}</Text>
                </View>
              </View>

              {detail.stepsEs.length > 0 ? (
                <View style={styles.stepsWrap}>
                  <Text style={[styles.sectionLabel, { color: theme.text3 }]}>Como se hace</Text>
                  {detail.stepsEs.map((step, i) => (
                    <View key={i} style={styles.stepRow}>
                      <Text style={[styles.stepNum, { color: theme.accent }]}>{i + 1}</Text>
                      <Text style={[styles.stepText, { color: theme.text2 }]}>{step}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.attribution, { color: theme.text4 }]}>© Gym visual — via exercises-dataset</Text>

              {onSelect ? (
                <View style={styles.selectBtnWrap}>
                  <BtnPrimary icon="link" onPress={() => { onSelect(detail); handleClose(); }}>
                    Vincular este ejercicio
                  </BtnPrimary>
                </View>
              ) : null}
            </ScrollView>
          </>
        ) : (
          <>
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
              <Text style={[styles.headerTitle, { color: theme.text1 }]}>
                {onSelect ? 'Elegir referencia visual' : 'Libreria de ejercicios'}
              </Text>
              <TouchableOpacity onPress={handleClose} style={styles.headerBtn} accessibilityRole="button">
                <Icon name="x" size={20} color={theme.text2} strokeW={2} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchWrap}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Buscar ejercicio (en ingles)..."
                placeholderTextColor={theme.text4}
                style={[styles.searchInput, { backgroundColor: theme.bg3, borderColor: theme.border, color: theme.text1 }]}
                autoCorrect={false}
                accessibilityLabel="Buscar ejercicio"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bodyPartRow}>
                {BODY_PARTS.map((bp) => {
                  const active = bodyPartFilter === bp;
                  return (
                    <TouchableOpacity
                      key={bp}
                      onPress={() => setBodyPartFilter(active ? null : bp)}
                      style={[
                        styles.bodyPartChip,
                        { backgroundColor: active ? theme.accentA : theme.bg3, borderColor: active ? theme.accent : theme.border },
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[styles.bodyPartChipText, { color: active ? theme.accent : theme.text2 }]}>
                        {BODY_PART_ES[bp]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
            <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled">
              {results.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  onPress={() => setDetail(ex)}
                  style={[styles.resultRow, { borderBottomColor: theme.border }]}
                  accessibilityRole="button"
                >
                  <Image
                    source={{ uri: datasetMediaUrl(ex.image) }}
                    style={[styles.resultThumb, { backgroundColor: theme.bg3 }]}
                    contentFit="cover"
                    cachePolicy="disk"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.resultName, { color: theme.text1 }]} numberOfLines={1}>{ex.name}</Text>
                    <Text style={[styles.resultSub, { color: theme.text3 }]} numberOfLines={1}>
                      {BODY_PART_ES[ex.bodyPart] ?? ex.bodyPart} · {ex.equipment}
                    </Text>
                  </View>
                  <Icon name="chevron" size={16} color={theme.text4} strokeW={2} />
                </TouchableOpacity>
              ))}
              {results.length === 0 ? (
                <Text style={[styles.empty, { color: theme.text3 }]}>Sin resultados</Text>
              ) : null}
            </ScrollView>
          </>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerBtn: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  backCaret: { fontSize: 30, fontWeight: '700', lineHeight: 30 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', textAlign: 'center' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 10 },
  searchInput: { minHeight: 48, borderWidth: 1, borderRadius: RADII.r1, paddingHorizontal: 14, fontSize: 15 },
  bodyPartRow: { flexGrow: 0 },
  bodyPartChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: RADII.r1, borderWidth: 1, marginRight: 8 },
  bodyPartChipText: { fontSize: 12, fontWeight: '700' },
  list: { paddingBottom: 40 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    minHeight: 64,
  },
  resultThumb: { width: 48, height: 48, borderRadius: RADII.r1 },
  resultName: { fontSize: 15, fontWeight: '700' },
  resultSub: { fontSize: 12, marginTop: 2, textTransform: 'capitalize' },
  empty: { textAlign: 'center', paddingVertical: 40, fontSize: 13 },
  detailScroll: { paddingBottom: 40 },
  detailGif: { width: '100%', aspectRatio: 1, marginBottom: 14 },
  detailChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: RADII.r1 },
  chipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  chipTextNeutral: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  stepsWrap: { paddingHorizontal: 16, marginTop: 18, gap: 10 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  stepRow: { flexDirection: 'row', gap: 10 },
  stepNum: { fontSize: 14, fontWeight: '900', width: 20 },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  attribution: { fontSize: 10, textAlign: 'center', marginTop: 18 },
  selectBtnWrap: { paddingHorizontal: 16, marginTop: 18 },
});
