import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme, RADII } from '../constants/theme';
import Stepper from '../components/Stepper';
import BtnPrimary from '../components/BtnPrimary';
import Icon from '../components/Icon';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LogMetricScreenProps {
  visible: boolean;
  /** Pre-fill from most recent weightEntries[0].pesoKg — null if no data */
  lastPeso: number | null;
  /** Pre-fill from most recent waistEntries[0].cinturaCm — null if no data */
  lastCintura: number | null;
  onClose(): void;
  onSave(
    peso: number | undefined,
    cintura: number | undefined,
    fotoUri: string | undefined
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_PESO = 78.5;
const DEFAULT_CINTURA = 85;

export default function LogMetricScreen({
  visible,
  lastPeso,
  lastCintura,
  onClose,
  onSave,
}: LogMetricScreenProps) {
  const { theme } = useTheme();

  const [peso, setPeso] = useState<number>(lastPeso ?? DEFAULT_PESO);
  const [cintura, setCintura] = useState<number>(lastCintura ?? DEFAULT_CINTURA);
  const [cinturEnabled, setCinturaEnabled] = useState(false);
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [photoPermDenied, setPhotoPermDenied] = useState(false);

  // Reset state whenever the modal opens, using latest pre-fill values
  useEffect(() => {
    if (visible) {
      setPeso(lastPeso ?? DEFAULT_PESO);
      setCintura(lastCintura ?? DEFAULT_CINTURA);
      setCinturaEnabled(false);
      setFotoUri(null);
      setSaving(false);
      setWeightError(null);
      setPhotoPermDenied(false);
    }
  }, [visible, lastPeso, lastCintura]);

  const handlePickPhoto = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPhotoPermDenied(true);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      // Use array form — MediaTypeOptions.Images is deprecated in expo-image-picker v16+
      mediaTypes: ['images'] as ImagePicker.MediaType[],
      quality: 0.7,
    });
    if (!result.canceled) {
      setFotoUri(result.assets[0].uri);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (saving) return;
    if (peso < 30) {
      setWeightError('El peso debe ser mayor a 30 kg');
      return;
    }
    setWeightError(null);
    setSaving(true);
    try {
      await onSave(
        peso,
        cinturEnabled ? cintura : undefined,
        fotoUri ?? undefined
      );
      onClose();
    } catch (err) {
      console.error('[LogMetricScreen] save error', err);
      setSaving(false);
    }
  }, [saving, peso, cintura, cinturEnabled, fotoUri, onSave, onClose]);

  // Derive a short display name from the URI
  const photoLabel = fotoUri
    ? fotoUri.split('/').pop() ?? 'Foto seleccionada'
    : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: theme.bg }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.cancelBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.cancelText, { color: theme.text2 }]}>Cancelar</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text1 }]}>
            Registrar medición
          </Text>
          <View style={styles.cancelBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.body,
            { paddingBottom: Platform.OS === 'ios' ? 40 : 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Weight stepper — required */}
          <View style={[styles.section, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text2 }]}>
              Peso
            </Text>
            <View style={styles.stepperWrap}>
              <Stepper
                value={peso}
                onChange={(v) => { setPeso(v); setWeightError(null); }}
                step={0.1}
                min={30}
                label="Peso"
                unit="kg"
              />
            </View>
            {weightError && (
              <Text style={[styles.errorText, { color: '#FF4444' }]}>
                {weightError}
              </Text>
            )}
          </View>

          {/* Waist toggle + stepper — optional */}
          <View style={[styles.section, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <TouchableOpacity
              style={styles.toggleRow}
              onPress={() => setCinturaEnabled((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sectionTitle, { color: theme.text2 }]}>
                Cintura
              </Text>
              <View
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: cinturEnabled ? theme.accent : theme.bg4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    { color: cinturEnabled ? '#fff' : theme.text3 },
                  ]}
                >
                  {cinturEnabled ? 'Activada' : 'Opcional'}
                </Text>
              </View>
            </TouchableOpacity>

            {cinturEnabled && (
              <View style={styles.stepperWrap}>
                <Stepper
                  value={cintura}
                  onChange={setCintura}
                  step={0.5}
                  min={40}
                  label="Cintura"
                  unit="cm"
                />
              </View>
            )}
          </View>

          {/* Photo picker — optional */}
          <View style={[styles.section, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <Text style={[styles.sectionTitle, { color: theme.text2 }]}>
              Foto del día (opcional)
            </Text>

            {photoPermDenied ? (
              <View
                style={[
                  styles.photoBtn,
                  styles.photoBtnDisabled,
                  { borderColor: theme.border, backgroundColor: theme.bg4, borderRadius: RADII.r1 },
                ]}
              >
                <Text style={[styles.photoBtnText, { color: theme.text3 }]}>
                  Sin permiso para acceder a la galería
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handlePickPhoto}
                style={[
                  styles.photoBtn,
                  { borderColor: theme.border2, backgroundColor: theme.bg3, borderRadius: RADII.r1 },
                ]}
                activeOpacity={0.7}
              >
                <Icon name="upload" size={18} color={theme.text2} />
                <Text style={[styles.photoBtnText, { color: theme.text2 }]}>
                  {photoLabel ? 'Cambiar foto' : 'Seleccionar foto'}
                </Text>
              </TouchableOpacity>
            )}

            {photoLabel && (
              <Text
                style={[styles.photoLabel, { color: theme.accent }]}
                numberOfLines={1}
              >
                {photoLabel}
              </Text>
            )}
          </View>

          {/* Save button */}
          <View style={styles.saveWrap}>
            <BtnPrimary onPress={handleSave} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar medición'}
            </BtnPrimary>
          </View>
        </ScrollView>
      </View>
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
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 12,
  },
  section: {
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  stepperWrap: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  togglePill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  toggleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  photoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderWidth: 1,
  },
  photoBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  photoLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  photoBtnDisabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
  },
  saveWrap: {
    marginTop: 8,
  },
});
