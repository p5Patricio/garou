import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../constants/theme';

interface MacroRingProps {
  val: number;
  max: number;
  color: string;
  size?: number;
  strokeW?: number;
  label: string | number;
  sub?: string;
}

export default function MacroRing({ val, max, color, size = 84, strokeW = 7, label, sub }: MacroRingProps) {
  const { theme } = useTheme();
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(val / max, 1);
  const dash = circ * pct;
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, flexShrink: 0 }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={center} cy={center} r={r} fill="none" stroke={theme.bg4} strokeWidth={strokeW} />
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circ}`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.label, { color: theme.text1, fontSize: size > 70 ? 18 : 13 }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: theme.text3 }]}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 20,
  },
  sub: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
