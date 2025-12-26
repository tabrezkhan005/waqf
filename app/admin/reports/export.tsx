import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExportReportsScreen() {
  const handleExport = (format: 'csv' | 'excel') => {
    Alert.alert('Export', `${format.toUpperCase()} export functionality coming soon`);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export Reports</Text>
        <Text style={styles.subtitle}>
          Generate comprehensive reports in your preferred format
        </Text>

        <TouchableOpacity
          style={styles.exportOption}
          onPress={() => handleExport('csv')}
        >
          <Ionicons name="document-text-outline" size={32} color="#003D99" />
          <Text style={styles.exportText}>Export as CSV</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.exportOption}
          onPress={() => handleExport('excel')}
        >
          <Ionicons name="document-outline" size={32} color="#1A9D5C" />
          <Text style={styles.exportText}>Export as Excel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  exportText: {
    fontSize: 18,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginLeft: 16,
  },
});
























