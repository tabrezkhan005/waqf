import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AccountsReportsHomeScreen() {
  const router = useRouter();

  const reportOptions = [
    {
      id: 'district',
      title: 'District-wise Summary',
      description: 'View analytics and totals by district',
      icon: 'map-outline',
      color: '#003D99',
      route: '/accounts/reports/district',
    },
    {
      id: 'institution',
      title: 'Institution History',
      description: 'View payment history for specific institutions',
      icon: 'business-outline',
      color: '#1A9D5C',
      route: '/accounts/reports/institution',
    },
    {
      id: 'inspector',
      title: 'Inspector-wise Summary',
      description: 'View collections and verification rates by inspector',
      icon: 'people-outline',
      color: '#FF9500',
      route: '/accounts/reports/inspector',
    },
    {
      id: 'export',
      title: 'Export Reports',
      description: 'Export data to CSV/Excel',
      icon: 'download-outline',
      color: '#8E8E93',
      route: '/accounts/reports/export',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Available Reports</Text>
      <Text style={styles.sectionDescription}>
        Select a report type to view detailed analytics and summaries
      </Text>

      <View style={styles.reportsGrid}>
        {reportOptions.map((report) => (
          <TouchableOpacity
            key={report.id}
            style={styles.reportCard}
            onPress={() => router.push(report.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: report.color + '20' }]}>
              <Ionicons name={report.icon as any} size={32} color={report.color} />
            </View>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <Text style={styles.reportDescription}>{report.description}</Text>
          </TouchableOpacity>
        ))}
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
  reportsGrid: {
    gap: 16,
  },
  reportCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
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
    marginBottom: 16,
  },
  reportTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  reportDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
});
























