import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { theme } from '@/lib/theme';

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function Chip({ label, selected, onPress, style }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.base,
        selected ? styles.selected : styles.unselected,
        style,
      ]}
      disabled={!onPress}
    >
      <Text style={[styles.text, selected ? styles.textSelected : styles.textUnselected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  selected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  unselected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
  },
  text: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  textSelected: {
    color: theme.colors.surface,
  },
  textUnselected: {
    color: theme.colors.text,
  },
});













