import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { RADII } from '../constants/theme';

interface StepperProps {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  label?: string;
  unit?: string;
}

export default function Stepper({ value, onChange, step = 1, min = 0, label, unit }: StepperProps) {
  const { theme } = useTheme();

  const dec = () => onChange(Math.max(min, parseFloat((value - step).toFixed(2))));
  const inc = () => onChange(parseFloat((value + step).toFixed(2)));
  const decFast = () => onChange(Math.max(min, parseFloat((value - step * 5).toFixed(2))));
  const incFast = () => onChange(parseFloat((value + step * 5).toFixed(2)));

  const displayValue = value === 0 && (unit === 'kg' || unit === 'bw') ? 'BW' : String(value);

  return (
    <View style={styles.container}>
      {label ? <Text style={[styles.label, { color: theme.text3 }]}>{label}</Text> : null}
      <View style={styles.row}>
        <TouchableOpacity
          onPress={dec}
          onLongPress={decFast}
          style={[styles.btn, { borderColor: theme.border2, backgroundColor: theme.bg4 }]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, { color: theme.text1 }]}>−</Text>
        </TouchableOpacity>
        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color: theme.text1 }]}>{displayValue}</Text>
          {unit && value !== 0 && unit !== 'bw' ? (
            <Text style={[styles.unit, { color: theme.text3 }]}>{unit}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={inc}
          onLongPress={incFast}
          style={[styles.btn, { borderColor: theme.border2, backgroundColor: theme.bg4, borderRadius: RADII.r4 }]}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, { color: theme.text1 }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  btnText: {
    fontSize: 26,
    fontWeight: '300',
    lineHeight: 30,
  },
  valueWrap: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 3,
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  unit: {
    fontSize: 13,
    marginTop: 6,
  },
});
