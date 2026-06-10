import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';

interface ToggleProps {
  value: boolean;
  onChange: (v: boolean) => void;
}

export default function Toggle({ value, onChange }: ToggleProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onChange(!value)}
      style={[
        styles.track,
        {
          backgroundColor: value ? theme.accent : theme.bg4,
          borderColor: theme.border2,
        },
      ]}
      activeOpacity={0.8}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View style={[styles.thumb, { left: value ? 22 : 2 }]} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  track: {
    width: 50,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    flexShrink: 0,
  },
  thumb: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
});
