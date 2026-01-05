import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ChartPlaceholderProps {
  title: string;
  type: 'line' | 'bar' | 'pie' | 'donut';
  height?: number;
}

const { width } = Dimensions.get('window');

export default function ChartPlaceholder({ title, type, height = 200 }: ChartPlaceholderProps) {
  const getIcon = () => {
    switch (type) {
      case 'line':
        return 'trending-up-outline';
      case 'bar':
        return 'bar-chart-outline';
      case 'pie':
      case 'donut':
        return 'pie-chart-outline';
      default:
        return 'stats-chart-outline';
    }
  };

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.iconContainer}>
        <Ionicons name={getIcon()} size={48} color="#9C27B0" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        {type === 'line' && 'Line Chart'}
        {type === 'bar' && 'Bar Chart'}
        {(type === 'pie' || type === 'donut') && 'Pie Chart'}
      </Text>
      <Text style={styles.note}>
        Chart will be rendered here using a chart library (e.g., react-native-chart-kit, victory-native)
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
    marginVertical: 8,
  },
  iconContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  note: {
    fontSize: 10,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
