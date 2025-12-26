import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ExportReportsScreen() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async (type: string) => {
    setExporting(true);
    // TODO: Implement export via Supabase Edge Function
    setTimeout(() => {
      setExporting(false);
      Alert.alert('Export', `Exporting ${type} report...\n\nThis feature will be implemented with Supabase Edge Functions.`);
    }, 1000);
  };

  const exportOptions = [
    {
      id: 'all',
      title: 'All Collections',
      description: 'Export all collections within date range',
      icon: 'document-text-outline',
    },
    {
      id: 'district',
      title: 'District Summary',
      description: 'Export district-wise summaries',
      icon: 'map-outline',
    },
    {
      id: 'institution',
      title: 'Institution History',
      description: 'Export institution-wise collection history',
      icon: 'business-outline',
    },
    {
      id: 'inspector',
      title: 'Inspector Summary',
      description: 'Export inspector-wise summaries',
      icon: 'people-outline',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Export Reports</Text>
      <Text style={styles.sectionDescription}>
        Select a report type to export data to CSV/Excel format
      </Text>

      <View style={styles.exportOptions}>
        {exportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.exportCard}
            onPress={() => handleExport(option.id)}
            disabled={exporting}
          >
            <Ionicons name={option.icon as any} size={32} color="#FF9500" />
            <Text style={styles.exportTitle}>{option.title}</Text>
            <Text style={styles.exportDescription}>{option.description}</Text>
            <Ionicons name="download-outline" size={24} color="#FF9500" style={styles.downloadIcon} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
        <Text style={styles.noteText}>
          Export functionality will be implemented using Supabase Edge Functions for secure server-side processing.
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
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  exportTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginTop: 12,
    marginBottom: 8,
  },
  exportDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 12,
  },
  downloadIcon: {
    marginTop: 8,
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
























