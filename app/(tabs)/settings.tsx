import React, { useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme, RADII, type AccentKey } from '../../src/constants/theme';
import Toggle from '../../src/components/Toggle';
import SettingsRow from '../../src/components/SettingsRow';
import SectionLabel from '../../src/components/SectionLabel';
import { useBackup } from '../../src/hooks/useBackup';

const ACCENT_COLORS: { key: AccentKey; hex: string; label: string }[] = [
  { key: 'amber', hex: '#D4920A', label: 'Ámbar' },
  { key: 'coral', hex: '#D95240', label: 'Coral' },
  { key: 'olive', hex: '#7BAC28', label: 'Verde oliva' },
];

export default function SettingsScreen() {
  const { theme, isDark, setIsDark, accent, setAccent } = useTheme();
  const { loading, lastResult, errorMsg, exportBackup, importBackup } = useBackup();

  const accentLabel = ACCENT_COLORS.find((a) => a.key === accent)?.label ?? 'Ámbar';

  useEffect(() => {
    if (lastResult === 'error' && errorMsg) {
      Alert.alert('Error', errorMsg);
    }
  }, [lastResult, errorMsg]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text1 }]}>Ajustes</Text>
          <View style={[styles.profileCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <View style={[styles.avatar, { backgroundColor: theme.accentA }]}>
              <Text style={[styles.avatarText, { color: theme.accent }]}>U</Text>
            </View>
            <View>
              <Text style={[styles.profileName, { color: theme.text1 }]}>Usuario</Text>
              <Text style={[styles.profileSub, { color: theme.text3 }]}>22 años · 78.5 kg · 1.70 m</Text>
              <Text style={[styles.profileSub2, { color: theme.text3 }]}>Recomposición · 2,350 kcal · 160 g P</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Apariencia</SectionLabel>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <SettingsRow
              icon={isDark ? 'moon' : 'sun'}
              label="Modo oscuro"
              sub={isDark ? 'Activo — optimizado para el gym' : 'Modo claro activo'}
              right={<Toggle value={isDark} onChange={setIsDark} />}
            />
            <SettingsRow
              icon="fire"
              label="Color de acento"
              sub={accentLabel}
              last
              right={
                <View style={styles.accentPickers}>
                  {ACCENT_COLORS.map(({ key, hex }) => (
                    <TouchableOpacity
                      key={key}
                      onPress={() => setAccent(key)}
                      style={[styles.accentDot, {
                        backgroundColor: hex,
                        borderColor: accent === key ? theme.text1 : 'transparent',
                        borderWidth: accent === key ? 3 : 2,
                      }]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    />
                  ))}
                </View>
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Datos y respaldo</SectionLabel>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <SettingsRow
              icon="upload"
              label="Exportar respaldo"
              sub={loading ? 'Procesando…' : 'Descarga todos tus registros'}
              onPress={() => { if (!loading) exportBackup(); }}
              right={loading ? <ActivityIndicator size="small" color={theme.accent} /> : undefined}
            />
            <Text style={[styles.disclaimer, { color: theme.text4 }]}>
              Las fotos no se incluyen en el respaldo, solo sus rutas de archivo.
            </Text>
            <SettingsRow
              icon="download"
              label="Importar respaldo"
              sub="Restaura desde un archivo JSON"
              onPress={() => { if (!loading) importBackup(); }}
            />
            <SettingsRow
              icon="link"
              label="Health Connect"
              last
              sub="Pasos, FC, sueño del Galaxy Watch 7"
              right={
                <View style={[styles.badge, { backgroundColor: theme.bg4 }]}>
                  <Text style={[styles.badgeText, { color: theme.text3 }]}>No conectado</Text>
                </View>
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <SectionLabel>Tu plan</SectionLabel>
          <View style={[styles.sectionCard, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
            <SettingsRow icon="weight" label="Objetivos de macros" sub="2,350 kcal · P 160 g · C 290 g · F 70 g" onPress={() => {}} />
            <SettingsRow icon="dumbbell" label="Rutina activa" sub="Torso/Pierna 4×/sem + Día ligero" onPress={() => {}} />
            <SettingsRow icon="chart" label="Frecuencias objetivo" last sub="Recomposición · −250 kcal/día" onPress={() => {}} />
          </View>
        </View>

        <View style={styles.buildInfo}>
          <Text style={[styles.buildText, { color: theme.text4 }]}>Garou v1.0 · Expo · React Native · SQLite</Text>
          <Text style={[styles.buildText, { color: theme.text4 }]}>Health Connect — Fase 5</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingBottom: 100 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },
  title: { fontSize: 27, fontWeight: '800', letterSpacing: -0.5, marginBottom: 16 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderWidth: 1 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '800' },
  profileName: { fontSize: 16, fontWeight: '700' },
  profileSub: { fontSize: 13, marginTop: 1 },
  profileSub2: { fontSize: 12, marginTop: 2 },
  section: { marginBottom: 4 },
  sectionCard: { marginHorizontal: 20, borderWidth: 1, overflow: 'hidden' },
  accentPickers: { flexDirection: 'row', gap: 8 },
  accentDot: { width: 24, height: 24, borderRadius: 12 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  buildInfo: { paddingTop: 20, paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  buildText: { fontSize: 11 },
  disclaimer: { fontSize: 11, marginHorizontal: 14, marginBottom: 2, fontStyle: 'italic' },
});
