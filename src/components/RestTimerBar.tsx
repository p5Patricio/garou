import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, RADII } from '../constants/theme';
import Icon from './Icon';

interface RestTimerBarProps {
  remaining: number;
  total: number;
  nombre: string;
  onSkip: () => void;
  onAdd30: () => void;
}

export default function RestTimerBar({ remaining, total, nombre, onSkip, onAdd30 }: RestTimerBarProps) {
  const { theme } = useTheme();
  const pct = total > 0 ? (1 - remaining / total) * 100 : 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${mins}:${String(secs).padStart(2, '0')}`;
  const urgent = remaining <= 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg2, borderTopColor: theme.border2 }]}>
      {/* Row 1: icon + exercise name + countdown */}
      <View style={styles.headerRow}>
        <View style={[styles.iconWrap, { backgroundColor: urgent ? theme.accentA : theme.bg3 }]}>
          <Icon name="timer" size={16} color={urgent ? theme.accent : theme.text3} strokeW={2} />
        </View>
        <Text style={[styles.nombre, { color: theme.text2 }]} numberOfLines={1}>
          Descanso · {nombre}
        </Text>
        <Text style={[styles.time, { color: urgent ? theme.accent : theme.text1 }]}>{label}</Text>
      </View>

      {/* Row 2: progress bar */}
      <View style={[styles.track, { backgroundColor: theme.bg4 }]}>
        <View style={[styles.fill, { width: `${pct}%` as `${number}%`, backgroundColor: theme.accent }]} />
      </View>

      {/* Row 3: action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          onPress={onAdd30}
          style={[styles.actionBtn, { backgroundColor: theme.bg3, borderColor: theme.border2 }]}
          accessibilityLabel="Agregar 30 segundos al descanso"
        >
          <Text style={[styles.actionBtnText, { color: theme.text2 }]}>+30s</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onSkip}
          style={[styles.actionBtn, styles.skipBtn, { backgroundColor: theme.bg3, borderColor: theme.border2 }]}
          accessibilityLabel="Saltar descanso"
        >
          <Icon name="skip" size={14} strokeW={2} color={theme.text2} />
          <Text style={[styles.actionBtnText, { color: theme.text2 }]}>Saltar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  nombre: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 0,
  },
  track: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    height: 44,
    borderRadius: RADII.r1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  skipBtn: {
    flexDirection: 'row',
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
