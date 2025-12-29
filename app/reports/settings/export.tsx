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

type ExportType = 'global' | 'district' | 'institution' | 'inspector' | 'raw';

export default function ExportCenterScreen() {
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const exportOptions = [
    {
      id: 'global' as ExportType,
      title: 'Global Summary',
      description: 'Export overall collection summary and metrics',
      icon: 'globe-outline',
      color: '#9C27B0',
    },
    {
      id: 'district' as ExportType,
      title: 'District Report',
      description: 'Export district-wise collection summaries',
      icon: 'map-outline',
      color: '#003D99',
    },
    {
      id: 'institution' as ExportType,
      title: 'Institution History',
      description: 'Export institution-wise collection history',
      icon: 'business-outline',
      color: '#1A9D5C',
    },
    {
      id: 'inspector' as ExportType,
      title: 'Inspector Performance',
      description: 'Export inspector-wise performance data',
      icon: 'people-outline',
      color: '#FF9500',
    },
    {
      id: 'raw' as ExportType,
      title: 'Raw Collections Data',
      description: 'Export all collections data (CSV/Excel)',
      icon: 'document-text-outline',
      color: '#8E8E93',
    },
  ];

  const handleExport = async (type: ExportType) => {
    setExporting(type);

    // TODO: Implement export via Supabase Edge Function
    // This would:
    // 1. Collect current filters/date range
    // 2. Call Edge Function with export type and filters
    // 3. Receive file URL or blob
    // 4. Download or share the file

    setTimeout(() => {
      setExporting(null);
      Alert.alert(
        'Export',
        `${exportOptions.find((o) => o.id === type)?.title} export initiated.\n\nThis feature will be implemented using Supabase Edge Functions for secure server-side processing.`,
        [{ text: 'OK' }]
      );
    }, 1500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Export Center</Text>
      <Text style={styles.sectionDescription}>
        Export reports and data in CSV or Excel format. All exports are generated server-side for security.
      </Text>

      <View style={styles.exportOptions}>
        {exportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.exportCard}
            onPress={() => handleExport(option.id)}
            disabled={exporting !== null}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
              <Ionicons name={option.icon as any} size={32} color={option.color} />
            </View>
            <View style={styles.exportCardContent}>
              <Text style={styles.exportTitle}>{option.title}</Text>
              <Text style={styles.exportDescription}>{option.description}</Text>
            </View>
            {exporting === option.id ? (
              <ActivityIndicator color={option.color} />
            ) : (
              <Ionicons name="download-outline" size={24} color={option.color} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
        <Text style={styles.noteText}>
          Export functionality will use Supabase Edge Functions to generate CSV/Excel files server-side.
          Files can be downloaded or shared directly from the app.
        </Text>
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
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 24,
  },
  exportOptions: {
    gap: 16,
  },
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportCardContent: {
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
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginLeft: 12,
  },
});

































