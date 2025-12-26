import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExportCollectionsScreen() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      // This would call a Supabase Edge Function to generate the export
      // For now, showing a placeholder
      setTimeout(() => {
        setExporting(false);
        Alert.alert('Export', `${format.toUpperCase()} export functionality coming soon`);
      }, 1500);
    } catch (error) {
      setExporting(false);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export Collections</Text>
        <Text style={styles.subtitle}>
          Generate and download collection reports in your preferred format
        </Text>

        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.exportOption}
            onPress={() => handleExport('csv')}
            disabled={exporting}
          >
            <View style={[styles.exportIcon, { backgroundColor: '#003D9915' }]}>
              <Ionicons name="document-text-outline" size={32} color="#003D99" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export as CSV</Text>
              <Text style={styles.exportDescription}>
                Download collections data as CSV file
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator color="#003D99" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#003D99" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportOption}
            onPress={() => handleExport('excel')}
            disabled={exporting}
          >
            <View style={[styles.exportIcon, { backgroundColor: '#1A9D5C15' }]}>
              <Ionicons name="document-outline" size={32} color="#1A9D5C" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export as Excel</Text>
              <Text style={styles.exportDescription}>
                Download collections data as Excel file
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator color="#1A9D5C" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#1A9D5C" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#003D99" />
          <Text style={styles.infoText}>
            Exports will include all collections based on your current filters. Large exports may take a few moments to generate.
          </Text>
        </View>
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
    fontSize: 28,
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
  optionsSection: {
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  exportIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#003D9915',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#003D9930',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginLeft: 12,
    lineHeight: 20,
  },
});

























