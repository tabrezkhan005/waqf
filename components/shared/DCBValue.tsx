import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { formatCurrency, formatNumber } from '@/lib/utils/format';

interface DCBValueProps {
  value: number | string | null | undefined;
  type?: 'currency' | 'number';
  showZero?: boolean;
  style?: any;
}

/**
 * Component to display DCB values with proper null/0 handling
 * - null/undefined -> "N/A"
 * - 0 -> "₹0" or "0" (if showZero is true)
 * - number -> formatted value
 */
export function DCBValue({
  value,
  type = 'currency',
  showZero = true,
  style,
}: DCBValueProps) {
  const displayValue =
    type === 'currency'
      ? formatCurrency(value, { showZero })
      : formatNumber(value, { showCurrency: false, showZero });

  return <Text style={[styles.value, style]}>{displayValue}</Text>;
}

const styles = StyleSheet.create({
  value: {
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
});








