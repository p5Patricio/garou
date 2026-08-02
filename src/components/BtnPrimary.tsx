import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import { RADII } from '../constants/theme';
import Icon from './Icon';

interface BtnPrimaryProps {
  children: React.ReactNode;
  onPress?: () => void;
  icon?: string;
  disabled?: boolean;
}

export default function BtnPrimary({ children, onPress, icon, disabled }: BtnPrimaryProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.btn,
        {
          backgroundColor: disabled ? theme.bg4 : theme.accent,
          borderRadius: RADII.r2,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={typeof children === 'string' ? children : 'Boton'}
      accessibilityState={{ disabled: !!disabled }}
    >
      {icon ? <Icon name={icon} size={18} color={disabled ? theme.text3 : '#fff'} strokeW={2.5} /> : null}
      <Text style={[styles.text, { color: disabled ? theme.text3 : '#fff' }]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    height: 52,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
});
