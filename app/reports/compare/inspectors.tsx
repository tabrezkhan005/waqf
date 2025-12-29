import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { InspectorSummary } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

export default function InspectorPerformanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState<InspectorSummary[]>([]);

  useEffect(() => {
    loadInspectorData();
  }, []);

  const loadInspectorData = async () => {
    try {
      setLoading(true);

      // Load inspectors and DCB data in parallel
      const [{ data: inspectorRows }, dcbData] = await Promise.all([
        supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            district_id,
            district:districts (
              name
            )
          `)
          .eq('role', 'inspector')
          .order('full_name'),
        import('@/lib/dcb/district-tables').then(m => m.queryAllDistrictDCB(
          'collection_arrears, collection_current, receiptno_date, challanno_date, _district_name'
        ))
      ]);

      const byInspector = new Map<string, InspectorSummary>();

      // Initialize inspectors
      (inspectorRows || []).forEach((insp: any) => {
        byInspector.set(String(insp.id), {
          inspector_id: String(insp.id),
          inspector_name: insp.full_name || 'Unknown',
          district_name: insp.district?.name || 'Unknown',
          total_collections: 0,
          verified_count: 0,
          rejected_count: 0,
          pending_count: 0,
          total_arrear: 0,
          total_current: 0,
          verification_rate: 0,
        });
      });

      // Aggregate DCB data by inspector's district
      dcbData.forEach((row: any) => {
        if (!row._district_name) return;

        // Find inspector by district
        const inspector = (inspectorRows || []).find((insp: any) =>
          insp.district?.name === row._district_name
        );

        if (!inspector) return;

        const key = String(inspector.id);
        const existing = byInspector.get(key);

        if (existing) {
          existing.total_collections += 1;
          existing.total_arrear += Number(row.collection_arrears || 0);
          existing.total_current += Number(row.collection_current || 0);
          if (row.receiptno_date || row.challanno_date) {
            existing.verified_count += 1;
          }
        }
      });

      const summaries = Array.from(byInspector.values()).map((s) => {
        const pending = s.total_collections - s.verified_count;
        const verificationRate = s.total_collections > 0 ? (s.verified_count / s.total_collections) * 100 : 0;
        return { ...s, pending_count: pending, verification_rate: verificationRate };
      });

      summaries.sort((a, b) => (b.total_arrear + b.total_current) - (a.total_arrear + a.total_current));
      setInspectors(summaries);
    } catch (error) {
      console.error('Error loading inspector data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </Screen>
    );
  }

  const top10 = inspectors.slice(0, 10);

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Compare" subtitle="Inspectors" />

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.sectionTitle}>Top inspectors</Text>
        {top10.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="Total collected (top 10)"
            data={{
              labels: top10.map((insp) =>
                insp.inspector_name.length > 10 ? insp.inspector_name.substring(0, 10) + '...' : insp.inspector_name
              ),
              datasets: [{ data: top10.map((insp) => insp.total_arrear + insp.total_current) }],
            }}
            color={theme.colors.secondary}
            height={300}
          />
        ) : (
          <EmptyState title="No inspector data" description="No DCB entries found." icon="people-outline" />
        )}

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Rankings</Text>
        {inspectors.map((inspector, index) => {
          const totalCollected = inspector.total_arrear + inspector.total_current;
          const badgeBg = index === 0 ? '#FFD700' : index === 1 ? '#C0C0C0' : index === 2 ? '#CD7F32' : theme.colors.secondary;
          const badgeText = index < 3 ? (index === 0 ? '1' : index === 1 ? '2' : '3') : String(index + 1);
          return (
            <TouchableOpacity
              key={inspector.inspector_id}
              activeOpacity={0.85}
              onPress={() => router.push(`/reports/explore/inspector?inspectorId=${inspector.inspector_id}`)}
              style={{ marginBottom: theme.spacing.sm }}
            >
              <Card style={styles.rowCard}>
                <View style={styles.rowLeft}>
                  <View style={[styles.rankBadge, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.rankText, index < 3 && { color: '#111827' }]}>{badgeText}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{inspector.inspector_name}</Text>
                    <Text style={styles.rowSubtitle} numberOfLines={2}>
                      {inspector.district_name} • Total: {formatCurrency(totalCollected)}
                      {'\n'}
                      Entries: {inspector.total_collections} • Verified: {inspector.verification_rate.toFixed(1)}%
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
              </Card>
            </TouchableOpacity>
          );
        })}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.surface,
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
});
