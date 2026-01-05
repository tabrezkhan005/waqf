import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { DistrictMetrics } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';
import { queryDistrictDCB } from '@/lib/dcb/district-tables';

export default function DistrictDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const districtId = params.districtId as string | null;

  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<{ id: string; name: string } | null>(null);
  const [metrics, setMetrics] = useState<DistrictMetrics | null>(null);
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{ month: string; total: number }>>([]);

  useEffect(() => {
    if (districtId) {
      loadDistrictData();
    }
  }, [districtId]);

  const loadDistrictData = async () => {
    if (!districtId) return;

    try {
      setLoading(true);

      // Load district
      const { data: districtData } = await supabase
        .from('districts')
        .select('id, name')
        .eq('id', districtId)
        .single();

      if (!districtData) {
        // Removed debug log');
        return;
      }

      setDistrict(districtData);

      // Load DCB data from district-specific table (only verified collections)
      // OPTIMIZATION: Limit rows to prevent fetching all data
      const dcbData = await queryDistrictDCB(
        districtData.name,
        'ap_gazette_no, institution_name, mandal, village, extent_dry, extent_wet, extent_total, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, remarks, created_at, updated_at, financial_year',
        { verifiedOnly: true, maxRows: 2000 } // Only count verified collections, limit rows
      );

      const rows: any[] = dcbData || [];

      // Count institutions (unique ap_gazette_no)
      const uniqueInstitutions = new Set(rows.map((d) => d.ap_gazette_no).filter(Boolean) || []);
      const institutionsCount = uniqueInstitutions.size;

      // Count inspectors (from profiles table by district_id)
      const { count: inspectorsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .eq('role', 'inspector');

      // Calculate metrics from DCB data
      const verified = 0; // DCB doesn't track verification status
      const pending = rows.length || 0;
      const rejected = 0; // DCB doesn't track rejected
      const totalCollected = rows.reduce((sum, d: any) => sum + Number(d.collection_total || 0), 0);

      const arrearAmount = rows.reduce(
        (sum, d: any) => sum + Number(d.demand_arrears || 0),
        0
      );

      const currentAmount = rows.reduce(
        (sum, d: any) => sum + Number(d.demand_current || 0),
        0
      );

      // Monthly totals (based on created_at)
      const monthMap = new Map<string, number>();
      rows.forEach((d: any) => {
        if (!d.created_at) return;
        const key = new Date(d.created_at).toISOString().slice(0, 7); // YYYY-MM
        monthMap.set(key, (monthMap.get(key) || 0) + Number(d.collection_total || 0));
      });
      setMonthlyTotals(
        Array.from(monthMap.entries())
          .map(([month, total]) => ({ month, total }))
          .sort((a, b) => a.month.localeCompare(b.month))
          .slice(-12)
      );

      // Calculate top institutions (by ap_gazette_no)
      const institutionTotals = new Map<string, { name: string; total: number }>();
      rows.forEach((d: any) => {
        if (d.ap_gazette_no) {
          const apNo = d.ap_gazette_no;
          const current = institutionTotals.get(apNo) || {
            name: d.institution_name || 'Unknown',
            total: 0
          };
          current.total += Number(d.collection_total || 0);
          institutionTotals.set(apNo, current);
        }
      });

      const topInstitutions = Array.from(institutionTotals.entries())
        .map(([apNo, data]) => ({
          institution_id: apNo, // Using ap_gazette_no as identifier
          institution_name: data.name,
          total_collected: data.total
        }))
        .sort((a, b) => b.total_collected - a.total_collected)
        .slice(0, 5);

      // Get inspector for this district
      const { data: inspectorData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('district_id', districtId)
        .eq('role', 'inspector')
        .single();

      const topInspectors = inspectorData ? [{
        inspector_id: inspectorData.id,
        inspector_name: inspectorData.full_name,
        total_collected: totalCollected,
        verification_rate: 0, // DCB doesn't track verification status
      }] : [];

      setMetrics({
        district_id: districtId,
        district_name: districtData.name,
        pending_count: pending,
        verified_count: verified,
        rejected_count: rejected,
        verified_amount: totalCollected,
        arrear_amount: arrearAmount,
        current_amount: currentAmount,
        total_institutions: institutionsCount,
        total_inspectors: inspectorsCount || 0,
        top_institutions: topInstitutions,
        top_inspectors: topInspectors,
      });
    } catch (error) {
      // Removed debug log district data:', error);
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

  const monthlyChartData = useMemo(() => {
    const labels = monthlyTotals.length > 0
      ? monthlyTotals.map((m) => new Date(m.month + '-01').toLocaleDateString('en-US', { month: 'short' }))
      : ['No Data'];
    const points = monthlyTotals.length > 0 ? monthlyTotals.map((m) => m.total) : [0];
    return {
      labels,
      datasets: [
        {
          data: points,
          color: () => theme.colors.secondary,
          strokeWidth: 3,
        },
      ],
    };
  }, [monthlyTotals]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </Screen>
    );
  }

  if (!district || !metrics) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>District data not found</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader
          title={district.name}
          subtitle={`${metrics.total_institutions} institutions • ${metrics.total_inspectors} inspectors`}
          rightActions={[
            { icon: 'search-outline', onPress: () => router.push('/reports/explore'), accessibilityLabel: 'Explore' },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.kpiGrid}>
          {[
            { title: 'Total arrear', value: formatCurrency(metrics.arrear_amount), icon: 'trending-up-outline' as const, color: theme.colors.chart[6] },
            { title: 'Total current', value: formatCurrency(metrics.current_amount), icon: 'trending-down-outline' as const, color: theme.colors.primary },
            { title: 'Total collected', value: formatCurrency(metrics.verified_amount), icon: 'cash-outline' as const, color: theme.colors.secondary },
            { title: 'DCB entries', value: String(metrics.pending_count), icon: 'documents-outline' as const, color: theme.colors.warning },
          ].map((kpi) => (
            <Card key={kpi.title} style={styles.kpiCard}>
              <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15`, borderColor: `${kpi.color}30` }]}>
                <Ionicons name={kpi.icon} size={18} color={kpi.color} />
              </View>
              <Text style={styles.kpiValue} numberOfLines={1}>
                {kpi.value}
              </Text>
              <Text style={styles.kpiTitle} numberOfLines={1}>
                {kpi.title}
              </Text>
            </Card>
          ))}
        </View>

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Monthly trends</Text>
        <AnimatedChart type="line" title="Collected (monthly)" data={monthlyChartData} color={theme.colors.secondary} height={250} />

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Top institutions</Text>
        {metrics.top_institutions.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="Top 5 Institutions by Collection"
            data={{
              labels: metrics.top_institutions.map((inst) =>
                inst.institution_name.length > 8
                  ? inst.institution_name.substring(0, 8) + '...'
                  : inst.institution_name
              ),
              datasets: [
                {
                  data: metrics.top_institutions.map((inst) => Math.round(inst.total_collected)),
                },
              ],
            }}
            color={theme.colors.secondary}
            height={250}
          />
        ) : (
          <Text style={styles.emptyText}>No institution data available</Text>
        )}
        <View style={styles.listContainer}>
          {metrics.top_institutions.length > 0 ? (
            metrics.top_institutions.map((inst, index) => (
              <TouchableOpacity
                key={inst.institution_id}
                style={{ marginBottom: theme.spacing.sm }}
                onPress={() => router.push(`/reports/explore/institution?institutionId=${inst.institution_id}`)}
                activeOpacity={0.85}
              >
                <Card style={styles.rowCard}>
                  <View style={styles.rowLeft}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{inst.institution_name}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>{formatCurrency(inst.total_collected)}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No institutions found</Text>
          )}
        </View>

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Top inspectors</Text>
        {metrics.top_inspectors.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="Inspector Performance Ranking"
            data={{
              labels: metrics.top_inspectors.map((insp) =>
                insp.inspector_name.length > 8
                  ? insp.inspector_name.substring(0, 8) + '...'
                  : insp.inspector_name
              ),
              datasets: [
                {
                  data: metrics.top_inspectors.map((insp) => Math.round(insp.total_collected)),
                },
              ],
            }}
            color={theme.colors.primary}
            height={250}
          />
        ) : (
          <Text style={styles.emptyText}>No inspector data available</Text>
        )}
        <View style={styles.listContainer}>
          {metrics.top_inspectors.length > 0 ? (
            metrics.top_inspectors.map((insp, index) => (
              <TouchableOpacity
                key={insp.inspector_id}
                style={{ marginBottom: theme.spacing.sm }}
                onPress={() => {
                  if (typeof insp.inspector_id === 'string' && insp.inspector_id !== 'Unknown') {
                    router.push(`/reports/explore/inspector?inspectorId=${insp.inspector_id}`);
                  }
                }}
                activeOpacity={0.85}
              >
                <Card style={styles.rowCard}>
                  <View style={styles.rowLeft}>
                    <View style={[styles.rankBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>{insp.inspector_name}</Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {formatCurrency(insp.total_collected)}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </Card>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No inspectors found</Text>
          )}
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
  listContainer: {
    marginTop: theme.spacing.sm,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.surface,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
    padding: 16,
  },
});
