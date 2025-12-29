import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';

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
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Export" subtitle="Reports" />

        <View style={{ height: theme.spacing.md }} />

        {exportOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleExport(option.id)}
            disabled={exporting}
            activeOpacity={0.85}
            style={{ marginBottom: theme.spacing.sm }}
          >
            <Card style={styles.rowCard}>
              <View style={styles.rowLeft}>
                <View style={styles.iconPill}>
                  <Ionicons name={option.icon as any} size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{option.title}</Text>
                  <Text style={styles.rowSubtitle}>{option.description}</Text>
                </View>
              </View>
              <Ionicons name="download-outline" size={18} color={theme.colors.primary} />
            </Card>
          </TouchableOpacity>
        ))}

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.noteCard}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.muted} />
          <Text style={styles.noteText}>
            Export can be implemented via Supabase Edge Functions (server-side CSV/Excel generation).
          </Text>
        </Card>
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
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary + '12',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  noteCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
});
