import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { InspectorMetrics } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';

export default function InspectorDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const inspectorId = params.inspectorId as string;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<InspectorMetrics | null>(null);

  useEffect(() => {
    if (inspectorId) {
      loadInspectorData();
    }
  }, [inspectorId]);

  const loadInspectorData = async () => {
    if (!inspectorId) return;

    try {
      setLoading(true);

      // Load inspector profile
      const { data: inspector } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          district:districts (
            id,
            name
          )
        `)
        .eq('id', inspectorId)
        .single();

      if (!inspector) {
        console.error('Inspector not found');
        return;
      }

      // Load DCB data for this inspector from district-specific tables
      // First, get the inspector's district
      const inspectorDistrict = inspector.district?.name;
      if (!inspectorDistrict) {
        console.error('Inspector district not found');
        return;
      }

      // Query DCB data from the inspector's district table (only verified collections)
      const { queryAllDistrictDCB } = await import('@/lib/dcb/district-tables');
      const allDcbData = await queryAllDistrictDCB(
        'ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, receiptno_date, challanno_date, created_at, updated_at, _district_name, financial_year',
        { verifiedOnly: true } // Only count verified collections (is_provisional = false)
      );

      // Filter by inspector's district
      const dcbData = allDcbData.filter((d: any) => d._district_name === inspectorDistrict);

      // Calculate totals from DCB data
      const totalArrear = dcbData.reduce(
        (sum: number, d: any) => sum + Number(d.demand_arrears || 0),
        0
      );

      const totalCurrent = dcbData.reduce(
        (sum: number, d: any) => sum + Number(d.demand_current || 0),
        0
      );

      const totalCollection = dcbData.reduce(
        (sum: number, d: any) => sum + Number(d.collection_total || 0),
        0
      );

      const total = dcbData.length;
      const verified = dcbData.filter((d: any) => d.receiptno_date || d.challanno_date).length;
      const verificationRate = total > 0 ? (verified / total) * 100 : 0;

      // Calculate average per day
      const dates = dcbData.map((d: any) => d.updated_at || d.created_at).filter(Boolean);
      const firstCollection = dates.length > 0
        ? new Date(dates[dates.length - 1])
        : new Date();
      const daysDiff = Math.max(1, Math.floor((new Date().getTime() - firstCollection.getTime()) / (1000 * 60 * 60 * 24)));
      const averagePerDay = totalCollection / daysDiff;

      // Count unique institutions by ap_gazette_no
      const institutionIds = new Set(dcbData.map((d: any) => d.ap_gazette_no).filter(Boolean));
      const institutionsServed = institutionIds.size;

      // Format collections for display
      const collections = dcbData.map((d: any, index: number) => ({
        id: `dcb-${index}-${d.ap_gazette_no || 'unknown'}`,
        collection_date: d.updated_at || d.created_at,
        arrear_amount: Number(d.collection_arrears || 0),
        current_amount: Number(d.collection_current || 0),
        status: (d.receiptno_date || d.challanno_date ? 'verified' : 'pending') as const,
        institution: { name: d.institution_name || 'Unknown Institution' },
      }));

      setMetrics({
        inspector_id: inspectorId,
        inspector_name: inspector.full_name || 'Unknown',
        district_name: inspector.district?.name || 'Unknown',
        total_arrear: totalArrear,
        total_current: totalCurrent,
        collection_count: total,
        verification_rate: verificationRate,
        average_per_day: averagePerDay,
        institutions_served: institutionsServed,
        collections: collections as any,
      });
    } catch (error) {
      // Removed debug log inspector data:', error);
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

  if (!metrics) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Inspector data not found</Text>
        </View>
      </Screen>
    );
  }

  const totalCollected = metrics.collections.reduce(
    (sum: number, c: any) => sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0),
    0
  );

  const timelinePoints = useMemo(() => {
    const sorted = [...(metrics.collections as any[])].sort((a, b) => {
      const da = a.collection_date ? new Date(a.collection_date).getTime() : 0;
      const db = b.collection_date ? new Date(b.collection_date).getTime() : 0;
      return da - db;
    });
    return sorted.slice(-6);
  }, [metrics.collections]);

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader
          title={metrics.inspector_name}
          subtitle={metrics.district_name}
          rightActions={[
            { icon: 'search-outline', onPress: () => router.push('/reports/explore'), accessibilityLabel: 'Explore' },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.kpiGrid}>
          {[
            { title: 'Total collected', value: formatCurrency(totalCollected), icon: 'cash-outline' as const, color: theme.colors.secondary },
            { title: 'Arrear demand', value: formatCurrency(metrics.total_arrear), icon: 'trending-up-outline' as const, color: theme.colors.chart[6] },
            { title: 'Current demand', value: formatCurrency(metrics.total_current), icon: 'trending-down-outline' as const, color: theme.colors.primary },
            { title: 'Institutions', value: String(metrics.institutions_served), icon: 'business-outline' as const, color: theme.colors.warning },
            { title: 'Avg/day', value: formatCurrency(metrics.average_per_day), icon: 'calendar-outline' as const, color: theme.colors.secondary },
            { title: 'Verified %', value: `${metrics.verification_rate.toFixed(1)}%`, icon: 'checkmark-circle-outline' as const, color: theme.colors.success },
          ].map((kpi) => (
            <Card key={kpi.title} style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15`, borderColor: `${kpi.color}30` }]}>
                <Ionicons name={kpi.icon} size={18} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>{kpi.value}</Text>
              <Text style={styles.kpiTitle} numberOfLines={1}>{kpi.title}</Text>
            </Card>
          ))}
        </View>

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Collections over time</Text>
        {timelinePoints.length > 0 ? (
          <AnimatedChart
            type="line"
            title="Collected (timeline)"
            data={{
              labels: timelinePoints.map((c: any) => {
                const date = c.collection_date ? new Date(c.collection_date) : new Date();
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }),
              datasets: [
                {
                  data: timelinePoints.map((c: any) => Number(c.arrear_amount || 0) + Number(c.current_amount || 0)),
                  color: () => theme.colors.primary,
                  strokeWidth: 3,
                },
              ],
            }}
            color={theme.colors.primary}
            height={250}
          />
        ) : (
          <Text style={styles.emptyText}>No collection timeline data</Text>
        )}

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Recent entries</Text>
        {metrics.collections.length > 0 ? (
          metrics.collections.slice(0, 10).map((collection: any) => {
            const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
            const statusColor = collection.status === 'verified' ? theme.colors.success : theme.colors.warning;
            return (
              <TouchableOpacity
                key={collection.id}
                activeOpacity={0.85}
                onPress={() => {
                  // best-effort deep link if institutionId exists
                  if ((collection as any).institution_id) {
                    router.push(`/reports/explore/institution?institutionId=${(collection as any).institution_id}`);
                  }
                }}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <Card style={styles.rowCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>{collection.institution?.name || 'Unknown'}</Text>
                    <Text style={styles.rowSubtitle}>
                      {collection.collection_date ? new Date(collection.collection_date).toLocaleDateString('en-IN') : 'N/A'}
                    </Text>
                    <Text style={styles.rowAmount}>₹{total.toLocaleString('en-IN')}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{String(collection.status).toUpperCase()}</Text>
                  </View>
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No collections found</Text>
        )}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.danger,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  kpiCard: {
    width: '48%',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'flex-start',
    gap: 8,
  },
  kpiIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  kpiValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
  kpiTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  rowCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
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
    marginBottom: 6,
  },
  rowAmount: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.secondary,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
    padding: 16,
  },
});
