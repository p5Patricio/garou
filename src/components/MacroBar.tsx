import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface MacroBarProps {
  label: string;
  val: number;
  max: number;
  color: string;
  unit?: string;
}

export default function MacroBar({ label, val, max, color, unit = 'g' }: MacroBarProps) {
  const { theme } = useTheme();
  const pct = Math.min(val / max, 1) * 100;

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: theme.text3 }]}>{label}</Text>
        <Text style={[styles.value, { color: theme.text2 }]}>
          {val}
          <Text style={[styles.max, { color: theme.text3 }]}>/{max}{unit}</Text>
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.bg4 }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: 13,
    fontWeight: '700',
  },
  max: {
    fontSize: 11,
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
});
