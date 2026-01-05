import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import AnimatedChart from '@/components/shared/AnimatedChart';
import FilterBar from '@/components/reports/FilterBar';
import type { GlobalMetrics, TimeSeriesData, StatusBreakdown } from '@/lib/types/database';
import { theme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { queryAllDistrictDCB, getAggregatedDCBStats } from '@/lib/dcb/district-tables';

export default function AccountsReportsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState<GlobalMetrics>({
    total_collections: 0,
    total_arrear: 0,
    total_current: 0,
    pending_count: 0,
    verified_count: 0,
    rejected_count: 0,
  });
  const [statusBreakdown, setStatusBreakdown] = useState<StatusBreakdown>({
    pending: 0,
    verified: 0,
    rejected: 0,
    pending_amount: 0,
    verified_amount: 0,
    rejected_amount: 0,
  });
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [topDistricts, setTopDistricts] = useState<Array<{ name: string; amount: number }>>([]);
  const [districts, setDistricts] = useState<Array<{ id: string | number; name: string }>>([]);
  const [dateRange, setDateRange] = useState<{ label: string; from: Date | null; to: Date | null }>({
    label: 'All Time',
    from: null,
    to: null,
  });
  const [districtFilter, setDistrictFilter] = useState<string | null>(null);

  useEffect(() => {
    loadDistricts();
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [dateRange, districtFilter]);

  const loadDistricts = async () => {
    try {
      const { data } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      setDistricts(data || []);
    } catch (error) {
      // Removed debug log districts:', error);
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadGlobalMetrics(),
        loadStatusBreakdown(),
        loadTimeSeries(),
        loadTopDistricts(),
      ]);
    } catch (error) {
      // Removed debug log dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, districtFilter]);

  const loadGlobalMetrics = async () => {
    try {
      const fromDate = dateRange.from ? dateRange.from.toISOString() : null;
      const toDate = dateRange.to ? dateRange.to.toISOString() : null;
      const districtId = districtFilter || null;

      // Load DCB data from all district tables (only verified collections)
      // OPTIMIZATION: Limit rows per table to prevent fetching all data
      let dcbData = await queryAllDistrictDCB(
        'demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, created_at, updated_at, _district_name, financial_year',
        { verifiedOnly: true, maxRowsPerTable: 500 } // Only count verified collections, limit rows per table
      );

      // Apply date filter
      if (fromDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString() >= fromDate;
          } catch (e) {
            return false;
          }
        });
      }
      if (toDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString() <= toDate;
          } catch (e) {
            return false;
          }
        });
      }

      // Filter by district if needed
      if (districtId) {
        const { data: districtData } = await supabase
          .from('districts')
          .select('name')
          .eq('id', districtId)
          .single();

        if (districtData) {
          dcbData = dcbData.filter((d: any) => d._district_name === districtData.name);
        }
      }

      // Calculate metrics from DCB data
      const totalCollections = dcbData.length;
      const totalArrear = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_arrears || 0), 0);
      const totalCurrent = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_current || 0), 0);

      // Get collections status counts
      const { data: collectionsData } = await supabase
        .from('collections')
        .select('status')
        .in('status', ['pending', 'sent_to_accounts', 'verified', 'rejected']);

      const pendingCount = collectionsData?.filter((c: any) =>
        c.status === 'pending' || c.status === 'sent_to_accounts'
      ).length || 0;
      const verifiedCount = collectionsData?.filter((c: any) =>
        c.status === 'verified'
      ).length || 0;
      const rejectedCount = collectionsData?.filter((c: any) =>
        c.status === 'rejected'
      ).length || 0;

      setMetrics({
        total_collections: totalCollections,
        total_arrear: totalArrear,
        total_current: totalCurrent,
        pending_count: pendingCount,
        verified_count: verifiedCount,
        rejected_count: rejectedCount,
      });
    } catch (error) {
      // Removed debug log global metrics:', error);
    }
  };

  const loadStatusBreakdown = async () => {
    try {
      // Load collections data for status breakdown
      const { data: collectionsData, error } = await supabase
        .from('collections')
        .select(`
          id,
          arrear_amount,
          current_amount,
          status
        `);

      if (error) {
        // Removed debug log status breakdown:', error);
        return;
      }

      // Calculate breakdown
      const pending = collectionsData?.filter((c: any) =>
        c.status === 'pending' || c.status === 'sent_to_accounts'
      ) || [];
      const verified = collectionsData?.filter((c: any) =>
        c.status === 'verified'
      ) || [];
      const rejected = collectionsData?.filter((c: any) =>
        c.status === 'rejected'
      ) || [];

      const pendingAmount = pending.reduce((sum: number, c: any) =>
        sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0), 0
      );
      const verifiedAmount = verified.reduce((sum: number, c: any) =>
        sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0), 0
      );
      const rejectedAmount = rejected.reduce((sum: number, c: any) =>
        sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0), 0
      );

      setStatusBreakdown({
        pending: pending.length,
        verified: verified.length,
        rejected: rejected.length,
        pending_amount: pendingAmount,
        verified_amount: verifiedAmount,
        rejected_amount: rejectedAmount,
      });
    } catch (error) {
      // Removed debug log status breakdown:', error);
    }
  };

  const loadTimeSeries = async () => {
    try {
      // Load DCB data from all district tables for time series (only verified collections)
      // OPTIMIZATION: Limit rows per table to prevent fetching all data
      let dcbData = await queryAllDistrictDCB(
        'demand_arrears, demand_current, collection_arrears, collection_current, created_at, updated_at, _district_name, financial_year',
        { verifiedOnly: true, maxRowsPerTable: 500 } // Only count verified collections, limit rows per table
      );

      // Apply date filter
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString().split('T')[0] >= fromDate;
          } catch (e) {
            return false;
          }
        });
      }
      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString().split('T')[0] <= endDateStr;
          } catch (e) {
            return false;
          }
        });
      }

      // Filter by district if needed
      if (districtFilter) {
        const { data: districtData } = await supabase
          .from('districts')
          .select('name')
          .eq('id', districtFilter)
          .single();

        if (districtData) {
          dcbData = dcbData.filter((d: any) => d._district_name === districtData.name);
        }
      }

      // Group by month
      const monthlyData = new Map<string, { arrear: number; current: number }>();

      dcbData.forEach((d: any) => {
        const date = d.updated_at || d.created_at;
        if (!date) return;

        try {
          const dateValue = new Date(date);
          if (isNaN(dateValue.getTime())) return;

          const monthKey = dateValue.toISOString().slice(0, 7);
          const existing = monthlyData.get(monthKey) || { arrear: 0, current: 0 };
          existing.arrear += Number(d.demand_arrears || 0);
          existing.current += Number(d.demand_current || 0);
          monthlyData.set(monthKey, existing);
        } catch (e) {
          // Skip invalid dates
        }
      });

      const timeSeriesData: TimeSeriesData[] = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          date: month,
          arrear: data.arrear,
          current: data.current,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      setTimeSeries(timeSeriesData);
    } catch (error) {
      // Removed debug log time series:', error);
    }
  };

  const loadTopDistricts = async () => {
    try {
      // Load DCB data from all district tables (only verified collections)
      // OPTIMIZATION: Limit rows per table to prevent fetching all data
      let dcbData = await queryAllDistrictDCB(
        'collection_total, _district_name, created_at, updated_at, financial_year',
        { verifiedOnly: true, maxRowsPerTable: 500 } // Only count verified collections, limit rows per table
      );

      // Apply date filter
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString().split('T')[0] >= fromDate;
          } catch (e) {
            return false;
          }
        });
      }
      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        const endDateStr = endDate.toISOString().split('T')[0];
        dcbData = dcbData.filter((d: any) => {
          const date = d.updated_at || d.created_at;
          if (!date) return false;
          try {
            return new Date(date).toISOString().split('T')[0] <= endDateStr;
          } catch (e) {
            return false;
          }
        });
      }

      // Group by district and calculate totals
      const districtTotals = new Map<string, number>();
      dcbData.forEach((d: any) => {
        if (d._district_name) {
          const districtName = d._district_name;
          const current = districtTotals.get(districtName) || 0;
          const amount = Number(d.collection_total || 0);
          districtTotals.set(districtName, current + amount);
        }
      });

      const topDistrictsList = Array.from(districtTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      setTopDistricts(topDistrictsList);
    } catch (error) {
      // Removed debug log top districts:', error);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, [loadDashboardData]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    }
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatNumber = (n: number) => {
    return n.toLocaleString('en-IN');
  };

  const arrearVsCurrentData = useMemo(() => {
    const labels =
      timeSeries.length > 0
        ? timeSeries.map((t) => {
            const date = new Date(t.date + '-01');
            return date.toLocaleDateString('en-US', { month: 'short' });
          })
        : ['No Data'];

    return {
      labels,
      datasets: [
        {
          data: timeSeries.length > 0 ? timeSeries.map((t) => t.arrear) : [0],
          color: () => theme.colors.chart[6],
          strokeWidth: 3,
        },
        {
          data: timeSeries.length > 0 ? timeSeries.map((t) => t.current) : [0],
          color: () => theme.colors.primary,
          strokeWidth: 3,
        },
      ],
      legend: ['Arrear', 'Current'],
    };
  }, [timeSeries]);

  const statusPieData = [
    {
      name: 'Pending',
      population: statusBreakdown.pending || 1,
      color: theme.colors.warning,
      legendFontColor: theme.colors.text,
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Verified',
      population: statusBreakdown.verified || 1,
      color: theme.colors.success,
      legendFontColor: theme.colors.text,
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Rejected',
      population: statusBreakdown.rejected || 1,
      color: theme.colors.danger,
      legendFontColor: theme.colors.text,
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
  ];

  const topDistrictsData = {
    labels: topDistricts.length > 0
      ? topDistricts.map(d => d.name.length > 10 ? d.name.substring(0, 10) + '...' : d.name)
      : ['No Data'],
    datasets: [
      {
        data: topDistricts.length > 0
          ? topDistricts.map(d => d.amount)
          : [0],
        color: () => theme.colors.secondary,
      },
    ],
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

  return (
    <Screen
      scroll
      scrollProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.secondary} />,
        showsVerticalScrollIndicator: true,
        removeClippedSubviews: false,
      }}
    >
      <View style={styles.page}>
        <AppHeader
          title="Reports"
          subtitle="Accounts Overview"
          rightActions={[
            { icon: 'settings-outline', onPress: () => router.push('/accounts/settings'), accessibilityLabel: 'Settings' },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <FilterBar
          dateRange={dateRange}
          districtFilter={districtFilter}
          districts={districts}
          onDateRangeChange={setDateRange}
          onDistrictChange={setDistrictFilter}
        />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Executive overview</Text>
        </View>

        <View style={styles.kpiGrid}>
          {[
            {
              title: 'Total collections',
              value: formatNumber(metrics.total_collections),
              icon: 'receipt-outline' as const,
              color: theme.colors.secondary,
            },
            {
              title: 'Total arrear',
              value: formatCurrency(metrics.total_arrear),
              icon: 'trending-up-outline' as const,
              color: theme.colors.chart[6],
            },
            {
              title: 'Total current',
              value: formatCurrency(metrics.total_current),
              icon: 'trending-down-outline' as const,
              color: theme.colors.primary,
            },
            {
              title: 'Pending',
              value: formatNumber(metrics.pending_count),
              icon: 'time-outline' as const,
              color: theme.colors.warning,
            },
            {
              title: 'Verified',
              value: formatNumber(metrics.verified_count),
              icon: 'checkmark-circle-outline' as const,
              color: theme.colors.success,
            },
            {
              title: 'Rejected',
              value: formatNumber(metrics.rejected_count),
              icon: 'close-circle-outline' as const,
              color: theme.colors.danger,
            },
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

        <View style={{ height: theme.spacing.lg }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Status breakdown</Text>
        </View>

        <Card style={styles.chartCard}>
          {statusBreakdown.pending === 0 && statusBreakdown.verified === 0 && statusBreakdown.rejected === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data available</Text>
            </View>
          ) : (
            <AnimatedChart
              type="pie"
              title=""
              data={statusPieData}
              height={220}
            />
          )}
        </Card>

        <View style={{ height: theme.spacing.lg }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Arrear vs Current trend</Text>
        </View>

        <Card style={styles.chartCard}>
          {timeSeries.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data available</Text>
            </View>
          ) : (
            <AnimatedChart data={arrearVsCurrentData} type="line" />
          )}
        </Card>

        <View style={{ height: theme.spacing.lg }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top districts by collection</Text>
        </View>

        <Card style={styles.chartCard}>
          {topDistricts.length === 0 ? (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No data available</Text>
            </View>
          ) : (
            <AnimatedChart data={topDistrictsData} type="bar" />
          )}
        </Card>

        <View style={{ height: theme.spacing.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
  sectionHint: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  kpiCard: {
    width: '48%',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.md,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: theme.spacing.sm,
  },
  kpiValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  kpiTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  chartCard: {
    padding: theme.spacing.md,
    minHeight: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChart: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: theme.colors.muted,
  },
});
