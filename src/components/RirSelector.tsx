import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { RADII } from '../constants/theme';

interface RirSelectorProps {
  value: number;
  onChange: (v: number) => void;
}

export default function RirSelector({ value, onChange }: RirSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.text3 }]}>RIR</Text>
      <View style={styles.row}>
        {[0, 1, 2, 3].map((n) => {
          const active = n === value;
          return (
            <TouchableOpacity
              key={n}
              onPress={() => onChange(n)}
              style={[
                styles.btn,
                {
                  borderColor: active ? theme.accent : theme.border2,
                  borderWidth: active ? 2 : 1.5,
                  backgroundColor: active ? theme.accentA : theme.bg4,
                  borderRadius: RADII.r1,
                },
              ]}
            >
              <Text style={[styles.btnText, { color: active ? theme.accent : theme.text2 }]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '700',
  },
});
