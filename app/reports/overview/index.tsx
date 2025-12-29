import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
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
import { queryAllDistrictDCB } from '@/lib/dcb/district-tables';

export default function ReportsOverviewScreen() {
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
      console.error('Error loading districts:', error);
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
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, districtFilter]);

  const loadGlobalMetrics = async () => {
    try {
      const fromDate = dateRange.from ? dateRange.from.toISOString() : null;
      const toDate = dateRange.to ? dateRange.to.toISOString() : null;
      const districtId = districtFilter || null;

      // Load DCB data from all district tables
      let dcbData = await queryAllDistrictDCB(
        'collection_arrears, collection_current, collection_total, created_at, _district_name'
      );

      // Apply date filter
      if (fromDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() >= fromDate;
        });
      }
      if (toDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() <= toDate;
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

      // Calculate metrics from DCB
      const totalCollections = dcbData.length;
      const totalArrear = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_arrears || 0), 0);
      const totalCurrent = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_current || 0), 0);

      // Get collections status from collections table
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
      console.error('Error loading global metrics:', error);
    }
  };

  const loadStatusBreakdown = async () => {
    try {
      const fromDate = dateRange.from ? dateRange.from.toISOString() : null;
      const toDate = dateRange.to ? dateRange.to.toISOString() : null;
      const districtId = districtFilter || null;

      // Load DCB data from all district tables
      let dcbData = await queryAllDistrictDCB(
        'collection_total, created_at, _district_name'
      );

      // Apply date filter
      if (fromDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() >= fromDate;
        });
      }
      if (toDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() <= toDate;
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

      // Get collections status breakdown
      const { data: collectionsData } = await supabase
        .from('collections')
        .select('status, arrear_amount, current_amount');

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
      console.error('Error loading status breakdown:', error);
    }
  };

  const loadTimeSeries = async () => {
    try {
      // Load DCB data from all district tables
      const dcbData = await queryAllDistrictDCB(
        'demand_arrears, demand_current, receiptno_date, challanno_date, created_at, _district_name',
        {
          limit: 1000,
        }
      );

      if (!dcbData || dcbData.length === 0) {
        setTimeSeries([]);
        return;
      }

      // Apply date filter
      let filteredData = dcbData;
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        filteredData = filteredData.filter((d: any) => {
          // Prefer created_at as it's always a valid date
          let dateValue: Date | null = null;
          if (d.created_at) {
            try {
              dateValue = new Date(d.created_at);
              if (isNaN(dateValue.getTime())) dateValue = null;
            } catch (e) {
              dateValue = null;
            }
          }

          if (!dateValue) return false;

          try {
            return dateValue.toISOString().split('T')[0] >= fromDate;
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
        filteredData = filteredData.filter((d: any) => {
          // Prefer created_at as it's always a valid date
          let dateValue: Date | null = null;
          if (d.created_at) {
            try {
              dateValue = new Date(d.created_at);
              if (isNaN(dateValue.getTime())) dateValue = null;
            } catch (e) {
              dateValue = null;
            }
          }

          if (!dateValue) return false;

          try {
            return dateValue.toISOString().split('T')[0] <= endDateStr;
          } catch (e) {
            return false;
          }
        });
      }

      // Filter by district if needed
      if (districtFilter) {
        // Get district name from district_id
        const { data: districtData } = await supabase
          .from('districts')
          .select('name')
          .eq('id', districtFilter)
          .single();

        if (districtData) {
          filteredData = filteredData.filter((d: any) => d._district_name === districtData.name);
        }
      }

      // Group by month (optimized with Map)
      const monthlyData = new Map<string, { arrear: number; current: number }>();

      filteredData.forEach((d: any) => {
        // Try to get a valid date - prefer created_at as it's always a valid date
        let dateValue: Date | null = null;

        if (d.created_at) {
          try {
            dateValue = new Date(d.created_at);
            if (isNaN(dateValue.getTime())) dateValue = null;
          } catch (e) {
            dateValue = null;
          }
        }

        // If created_at is invalid, try receiptno_date or challanno_date (these are text fields)
        if (!dateValue && (d.receiptno_date || d.challanno_date)) {
          const textDate = d.receiptno_date || d.challanno_date;
          // Try to parse if it looks like a date
          if (textDate && typeof textDate === 'string') {
            try {
              const parsed = new Date(textDate);
              if (!isNaN(parsed.getTime())) {
                dateValue = parsed;
              }
            } catch (e) {
              // Ignore invalid dates
            }
          }
        }

        if (!dateValue) return;

        try {
          const monthKey = dateValue.toISOString().slice(0, 7);
          const existing = monthlyData.get(monthKey) || { arrear: 0, current: 0 };
          existing.arrear += Number(d.demand_arrears || 0);
          existing.current += Number(d.demand_current || 0);
          monthlyData.set(monthKey, existing);
        } catch (e) {
          // Skip invalid dates
          console.warn('Invalid date in time series:', dateValue);
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
      console.error('Error loading time series:', error);
    }
  };

  const loadTopDistricts = async () => {
    try {
      const fromDate = dateRange.from ? dateRange.from.toISOString() : null;
      const toDate = dateRange.to ? dateRange.to.toISOString() : null;

      // Load DCB data from all district tables
      let dcbData = await queryAllDistrictDCB(
        'collection_total, created_at, _district_name'
      );

      // Apply date filter
      if (fromDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() >= fromDate;
        });
      }
      if (toDate) {
        dcbData = dcbData.filter((d: any) => {
          const date = d.created_at;
          if (!date) return false;
          return new Date(date).toISOString() <= toDate;
        });
      }

      // Group by district and calculate totals
      const districtTotals = new Map<string, number>();
      dcbData.forEach((d: any) => {
        if (d._district_name) {
          const districtName = d._district_name;
          const current = districtTotals.get(districtName) || 0;
          districtTotals.set(districtName, current + Number(d.collection_total || 0));
        }
      });

      // Sort and get top 5
      const topDistrictsData = Array.from(districtTotals.entries())
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      setTopDistricts(topDistrictsData);
    } catch (error) {
      console.error('Error loading top districts:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

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
      }}
    >
      <View style={styles.page}>
        <AppHeader
          title="Reports"
          subtitle="Overview"
          rightActions={[
            { icon: 'options-outline', onPress: () => router.push('/reports/settings'), accessibilityLabel: 'Report settings' },
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
          <Text style={styles.sectionHint}>Tap a KPI to drill down</Text>
        </View>

        <View style={styles.kpiGrid}>
          {[
            {
              title: 'Total collections',
              value: formatNumber(metrics.total_collections),
              icon: 'receipt-outline' as const,
              color: theme.colors.secondary,
              onPress: () => router.push('/reports/explore'),
            },
            {
              title: 'Total arrear',
              value: formatCurrency(metrics.total_arrear),
              icon: 'trending-up-outline' as const,
              color: theme.colors.chart[6],
              onPress: () => router.push('/reports/explore?filter=arrear'),
            },
            {
              title: 'Total current',
              value: formatCurrency(metrics.total_current),
              icon: 'trending-down-outline' as const,
              color: theme.colors.primary,
              onPress: () => router.push('/reports/explore?filter=current'),
            },
            {
              title: 'Pending',
              value: formatNumber(metrics.pending_count),
              icon: 'time-outline' as const,
              color: theme.colors.warning,
              onPress: () => router.push('/reports/explore?filter=pending'),
            },
            {
              title: 'Verified',
              value: formatNumber(metrics.verified_count),
              icon: 'checkmark-circle-outline' as const,
              color: theme.colors.success,
              onPress: () => router.push('/reports/explore?filter=verified'),
            },
            {
              title: 'Rejected',
              value: formatNumber(metrics.rejected_count),
              icon: 'close-circle-outline' as const,
              color: theme.colors.danger,
              onPress: () => router.push('/reports/explore?filter=rejected'),
            },
          ].map((kpi) => (
            <Card key={kpi.title} style={styles.kpiCard} onPress={kpi.onPress}>
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Visual analytics</Text>
          <Text style={styles.sectionHint}>Based on district DCB tables</Text>
        </View>

        <AnimatedChart
          type="line"
          title="Arrear vs Current (monthly)"
          data={arrearVsCurrentData}
          color={theme.colors.secondary}
          height={240}
        />
        <AnimatedChart
          type="pie"
          title="Status distribution"
          data={statusPieData}
          height={240}
        />
        <AnimatedChart
          type="bar"
          title="Top districts by collection"
          data={topDistrictsData}
          color={theme.colors.secondary}
          height={240}
        />

        <View style={{ height: theme.spacing.xl }} />

        <View style={styles.executiveSummary}>
          <Text style={styles.summaryTitle}>Key Insights</Text>
          <View style={styles.insightCard}>
            <Ionicons name="trending-up-outline" size={20} color={theme.colors.success} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Total Collection</Text>
              <Text style={styles.insightValue}>
                {formatCurrency(metrics.total_arrear + metrics.total_current)}
              </Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="business-outline" size={20} color={theme.colors.secondary} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>DCB Entries</Text>
              <Text style={styles.insightValue}>{formatNumber(metrics.total_collections)}</Text>
            </View>
          </View>
          <View style={styles.insightCard}>
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <View style={styles.insightContent}>
              <Text style={styles.insightTitle}>Verification Rate</Text>
              <Text style={styles.insightValue}>
                {metrics.total_collections > 0
                  ? `${((metrics.verified_count / metrics.total_collections) * 100).toFixed(1)}%`
                  : '0%'}
              </Text>
            </View>
          </View>
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  sectionHint: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
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
  executiveSummary: {
    marginTop: theme.spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  insightValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
});
