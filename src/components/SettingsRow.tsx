import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../constants/theme';
import Icon from './Icon';

interface SettingsRowProps {
  icon?: string;
  iconBg?: string;
  label: string;
  sub?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}

export default function SettingsRow({ icon, iconBg, label, sub, right, onPress, last }: SettingsRowProps) {
  const { theme } = useTheme();

  const inner = (
    <View style={[styles.row, { borderBottomColor: theme.border, borderBottomWidth: last ? 0 : 1 }]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: iconBg ?? theme.bg3 }]}>
          <Icon name={icon} size={17} color={theme.text2} strokeW={1.8} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={[styles.label, { color: theme.text1 }]}>{label}</Text>
        {sub ? <Text style={[styles.sub, { color: theme.text3 }]}>{sub}</Text> : null}
      </View>
      {right ?? (onPress ? <Icon name="chevron" size={16} color={theme.text4} strokeW={2} /> : null)}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {inner}
      </TouchableOpacity>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  sub: {
    fontSize: 12,
    marginTop: 1,
  },
});
