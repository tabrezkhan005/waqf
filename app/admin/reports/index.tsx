import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';

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
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Reports" subtitle="Admin analytics" />

        <View style={{ height: theme.spacing.md }} />

        {reportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            activeOpacity={0.85}
            onPress={() => router.push(option.route as any)}
            style={{ marginBottom: theme.spacing.sm }}
          >
            <Card style={styles.rowCard}>
              <View style={styles.rowLeft}>
                <View style={[styles.iconContainer, { backgroundColor: `${option.color}15`, borderColor: `${option.color}30` }]}>
                  <Ionicons name={option.icon as any} size={20} color={option.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{option.title}</Text>
                  <Text style={styles.cardDescription}>{option.description}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 120,
  },
  rowCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
});
