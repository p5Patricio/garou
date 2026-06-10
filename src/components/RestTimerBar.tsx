import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { RADII } from '../constants/theme';
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
  const pct = (1 - remaining / total) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const label = `${mins}:${String(secs).padStart(2, '0')}`;
  const urgent = remaining <= 10;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg2, borderTopColor: theme.border2 }]}>
      <View style={styles.row}>
        <View style={[styles.iconWrap, { backgroundColor: urgent ? theme.accentA : theme.bg3 }]}>
          <Icon name="timer" size={16} color={urgent ? theme.accent : theme.text3} strokeW={2} />
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.nombre, { color: theme.text2 }]}>Descanso · {nombre}</Text>
            <Text style={[styles.time, { color: urgent ? theme.accent : theme.text1 }]}>{label}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.bg4 }]}>
            <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.accent }]} />
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onAdd30}
            style={[styles.addBtn, { backgroundColor: theme.bg3, borderColor: theme.border2 }]}
          >
            <Text style={[styles.addBtnText, { color: theme.text2 }]}>+30s</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onSkip}
            style={[styles.skipBtn, { backgroundColor: theme.bg3, borderColor: theme.border2, borderRadius: RADII.r1 }]}
          >
            <Icon name="skip" size={14} strokeW={2} color={theme.text2} />
          </TouchableOpacity>
        </View>
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
    padding: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nombre: {
    fontSize: 13,
    fontWeight: '600',
  },
  time: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  addBtn: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  addBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skipBtn: {
    width: 34,
    height: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
});
