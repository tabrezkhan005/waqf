import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function ReportsIndexScreen() {
  const router = useRouter();

  const reportOptions = [
    {
      id: 'district',
      title: 'District Performance',
      description: 'Compare performance across all 26 districts',
      icon: 'map-outline',
      route: '/admin/reports/district-performance',
      color: '#003D99',
    },
    {
      id: 'inspector',
      title: 'Inspector Performance',
      description: 'View inspector rankings and efficiency',
      icon: 'people-outline',
      route: '/admin/reports/inspector-performance',
      color: '#1A9D5C',
    },
    {
      id: 'institution',
      title: 'Institution Performance',
      description: 'Analyze institution-wise collections',
      icon: 'business-outline',
      route: '/admin/reports/institution-performance',
      color: '#003D99',
    },
    {
      id: 'trends',
      title: 'Monthly Trends',
      description: 'View monthly collection trends and charts',
      icon: 'trending-up-outline',
      route: '/admin/reports/monthly-trends',
      color: '#1A9D5C',
    },
    {
      id: 'export',
      title: 'Export Reports',
      description: 'Generate and download CSV/Excel reports',
      icon: 'download-outline',
      route: '/admin/reports/export',
      color: '#FF9500',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Reports & Analytics</Text>
        <Text style={styles.subtitle}>
          Comprehensive insights and performance metrics
        </Text>

        {reportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.reportCard}
            onPress={() => router.push(option.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: `${option.color}15` }]}>
              <Ionicons name={option.icon as any} size={32} color={option.color} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{option.title}</Text>
              <Text style={styles.cardDescription}>{option.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
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
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
});

























