import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';

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
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Compare" subtitle="Rank districts, inspectors, institutions" />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.optionsGrid}>
          {compareOptions.map((option) => (
            <TouchableOpacity key={option.id} activeOpacity={0.85} onPress={() => router.push(option.route as any)}>
              <Card style={styles.optionCard}>
                <View style={[styles.iconContainer, { backgroundColor: option.color + '15', borderColor: option.color + '30' }]}>
                  <Ionicons name={option.icon as any} size={22} color={option.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </Card>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 100,
  },
  optionsGrid: {
    gap: theme.spacing.sm,
  },
  optionCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  optionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
});
