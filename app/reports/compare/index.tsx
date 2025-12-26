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

export default function CompareHomeScreen() {
  const router = useRouter();

  const compareOptions = [
    {
      id: 'districts',
      title: 'District Comparison',
      description: 'Compare performance across all districts',
      icon: 'map-outline',
      color: '#9C27B0',
      route: '/reports/compare/districts',
    },
    {
      id: 'inspectors',
      title: 'Inspector Performance',
      description: 'Ranking and performance metrics for inspectors',
      icon: 'people-outline',
      color: '#FF9500',
      route: '/reports/compare/inspectors',
    },
    {
      id: 'institutions',
      title: 'Institution Ranking',
      description: 'Top institutions by collection and performance',
      icon: 'business-outline',
      color: '#1A9D5C',
      route: '/reports/compare/institutions',
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Performance Comparisons</Text>
      <Text style={styles.sectionDescription}>
        Compare and rank districts, inspectors, and institutions
      </Text>

      <View style={styles.optionsGrid}>
        {compareOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={styles.optionCard}
            onPress={() => router.push(option.route as any)}
          >
            <View style={[styles.iconContainer, { backgroundColor: option.color + '20' }]}>
              <Ionicons name={option.icon as any} size={40} color={option.color} />
            </View>
            <Text style={styles.optionTitle}>{option.title}</Text>
            <Text style={styles.optionDescription}>{option.description}</Text>
            <Ionicons name="chevron-forward" size={24} color={option.color} style={styles.arrowIcon} />
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
  optionsGrid: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  arrowIcon: {
    marginTop: 8,
  },
});

























