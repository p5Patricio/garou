import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { RADII } from '../constants/theme';
import Icon from './Icon';

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent?: boolean;
}

export default function StatCard({ icon, label, value, unit, sub, accent }: StatCardProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.bg2, borderColor: theme.border, borderRadius: RADII.r2 }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: accent ? theme.accentB : theme.bg3, borderRadius: RADII.r1 }]}>
          <Icon name={icon} size={15} color={accent ? theme.accent : theme.text3} strokeW={2} />
        </View>
        <Text style={[styles.label, { color: theme.text3 }]}>{label}</Text>
      </View>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: theme.text1 }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: theme.text3 }]}>{unit}</Text> : null}
      </View>
      {sub ? <Text style={[styles.sub, { color: theme.text3 }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 13,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  unit: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  sub: {
    fontSize: 11,
    fontWeight: '500',
  },
});
