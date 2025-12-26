import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import GreetingHeader from '@/components/shared/GreetingHeader';
import AnimatedKPICard from '@/components/shared/AnimatedKPICard';
import AnimatedChart from '@/components/shared/AnimatedChart';
import FilterBar from '@/components/reports/FilterBar';
import type { GlobalMetrics, TimeSeriesData, StatusBreakdown } from '@/lib/types/database';

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
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
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

      // Build query for DCB data
      let query = supabase
        .from('institution_dcb')
        .select(`
          demand_arrears,
          demand_current,
          collection_arrears,
          collection_current,
          collection_total,
          created_at,
          institution:institutions!institution_dcb_institution_id_fkey (
            district_id
          )
        `);

      // Apply date filter
      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }
      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      const { data: dcbData, error } = await query;

      if (error) {
        console.error('Error loading global metrics:', error);
        setMetrics({
          total_collections: 0,
          total_arrear: 0,
          total_current: 0,
          pending_count: 0,
          verified_count: 0,
          rejected_count: 0,
        });
        return;
      }

      // Filter by district if needed
      let filteredData = dcbData || [];
      if (districtId) {
        filteredData = filteredData.filter((d: any) => d.institution?.district_id === districtId);
      }

      // Calculate metrics
      const totalCollections = filteredData.length;
      const totalArrear = filteredData.reduce((sum, d) => sum + Number(d.collection_arrears || 0), 0);
      const totalCurrent = filteredData.reduce((sum, d) => sum + Number(d.collection_current || 0), 0);

      setMetrics({
        total_collections: totalCollections,
        total_arrear: totalArrear,
        total_current: totalCurrent,
        pending_count: totalCollections, // DCB doesn't track verification status
        verified_count: 0,
        rejected_count: 0,
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

      // Build query for DCB data
      let query = supabase
        .from('institution_dcb')
        .select(`
          collection_total,
          created_at,
          institution:institutions!institution_dcb_institution_id_fkey (
            district_id
          )
        `);

      // Apply date filter
      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }
      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      const { data: dcbData, error } = await query;

      if (error) {
        console.error('Error loading status breakdown:', error);
        setStatusBreakdown({
          pending: 0,
          verified: 0,
          rejected: 0,
          pending_amount: 0,
          verified_amount: 0,
          rejected_amount: 0,
        });
        return;
      }

      // Filter by district if needed
      let filteredData = dcbData || [];
      if (districtId) {
        filteredData = filteredData.filter((d: any) => d.institution?.district_id === districtId);
      }

      // Calculate breakdown (DCB doesn't track verification status)
      const pending = filteredData.length;
      const pendingAmount = filteredData.reduce((sum, d) => sum + Number(d.collection_total || 0), 0);

      setStatusBreakdown({
        pending: pending,
        verified: 0,
        rejected: 0,
        pending_amount: pendingAmount,
        verified_amount: 0,
        rejected_amount: 0,
      });
    } catch (error) {
      console.error('Error loading status breakdown:', error);
    }
  };

  const loadTimeSeries = async () => {
    try {
      // Optimized: Only fetch needed columns and limit data
      let query = supabase
        .from('institution_dcb')
        .select('d_arrears, d_current, receipt_date, challan_date, created_at')
        .limit(1000); // Limit to prevent loading all 782 records

      // Apply date filter
      if (dateRange.from) {
        const fromDate = dateRange.from.toISOString().split('T')[0];
        query = query.gte('created_at', fromDate);
      }
      if (dateRange.to) {
        const toDate = dateRange.to.toISOString().split('T')[0];
        const endDate = new Date(dateRange.to);
        endDate.setDate(endDate.getDate() + 1);
        query = query.lte('created_at', endDate.toISOString().split('T')[0]);
      }

      if (districtFilter) {
        const district = districts.find(d => d.id.toString() === districtFilter);
        if (district) {
          query = query.eq('district_name', district.name);
        }
      }

      const { data: dcbData, error } = await query;

      if (error) {
        console.error('Error loading time series:', error);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setTimeSeries([]);
        return;
      }

      // Group by month (optimized with Map)
      const monthlyData = new Map<string, { arrear: number; current: number }>();

      dcbData.forEach((d) => {
        const date = d.receipt_date || d.challan_date || d.created_at;
        if (!date) return;

        const monthKey = new Date(date).toISOString().slice(0, 7);
        const existing = monthlyData.get(monthKey) || { arrear: 0, current: 0 };
        existing.arrear += Number(d.d_arrears || 0);
        existing.current += Number(d.d_current || 0);
        monthlyData.set(monthKey, existing);
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

      // Build query for DCB data
      let query = supabase
        .from('institution_dcb')
        .select(`
          collection_total,
          created_at,
          institution:institutions!institution_dcb_institution_id_fkey (
            district_id,
            district:districts!institutions_district_id_fkey (
              id,
              name
            )
          )
        `);

      // Apply date filter
      if (fromDate) {
        query = query.gte('created_at', fromDate);
      }
      if (toDate) {
        query = query.lte('created_at', toDate);
      }

      const { data: dcbData, error } = await query;

      if (error) {
        console.error('Error loading top districts:', error);
        setTopDistricts([]);
        return;
      }

      // Group by district and calculate totals
      const districtTotals = new Map<string, number>();
      (dcbData || []).forEach((d: any) => {
        if (d.institution?.district) {
          const districtName = d.institution.district.name;
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

  // Prepare chart data from real time series
  const arrearVsCurrentData = {
    labels: timeSeries.length > 0
      ? timeSeries.map(t => {
          const date = new Date(t.date + '-01');
          return date.toLocaleDateString('en-US', { month: 'short' });
        })
      : ['No Data'],
    datasets: [
      {
        data: timeSeries.length > 0
          ? timeSeries.map(t => t.arrear)
          : [0],
        color: () => '#FF6B35',
        strokeWidth: 3,
      },
      {
        data: timeSeries.length > 0
          ? timeSeries.map(t => t.current)
          : [0],
        color: () => '#1A9D5C',
        strokeWidth: 3,
      },
    ],
    legend: ['Arrear', 'Current'],
  };

  const statusPieData = [
    {
      name: 'Pending',
      population: statusBreakdown.pending || 1,
      color: '#FF9500',
      legendFontColor: '#2A2A2A',
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Verified',
      population: statusBreakdown.verified || 1,
      color: '#1A9D5C',
      legendFontColor: '#2A2A2A',
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Rejected',
      population: statusBreakdown.rejected || 1,
      color: '#FF3B30',
      legendFontColor: '#2A2A2A',
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
        color: () => '#9C27B0',
      },
    ],
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile && <GreetingHeader profile={profile} primaryColor="#9C27B0" />}
      <FilterBar
        dateRange={dateRange}
        districtFilter={districtFilter}
        districts={districts}
        onDateRangeChange={setDateRange}
        onDistrictChange={setDistrictFilter}
      />
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* Global KPIs */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Executive Overview</Text>
            <View style={styles.kpiGrid}>
              <AnimatedKPICard
                title="Total Collections"
                value={formatCurrency(metrics.total_collections)}
                icon="cash-outline"
                color="#9C27B0"
                onPress={() => router.push('/reports/explore')}
                delay={0}
              />
              <AnimatedKPICard
                title="Total Arrear"
                value={formatCurrency(metrics.total_arrear)}
                icon="trending-up-outline"
                color="#FF6B35"
                onPress={() => router.push('/reports/explore?filter=arrear')}
                delay={100}
              />
              <AnimatedKPICard
                title="Total Current"
                value={formatCurrency(metrics.total_current)}
                icon="trending-down-outline"
                color="#1A9D5C"
                onPress={() => router.push('/reports/explore?filter=current')}
                delay={200}
              />
              <AnimatedKPICard
                title="Pending"
                value={metrics.pending_count}
                icon="time-outline"
                color="#FF9500"
                onPress={() => router.push('/reports/explore?filter=pending')}
                delay={300}
              />
              <AnimatedKPICard
                title="Verified"
                value={metrics.verified_count}
                icon="checkmark-circle-outline"
                color="#1A9D5C"
                onPress={() => router.push('/reports/explore?filter=verified')}
                delay={400}
              />
              <AnimatedKPICard
                title="Rejected"
                value={metrics.rejected_count}
                icon="close-circle-outline"
                color="#FF3B30"
                onPress={() => router.push('/reports/explore?filter=rejected')}
                delay={500}
              />
            </View>
          </View>

          {/* Charts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visual Analytics</Text>
            <AnimatedChart
              type="line"
              title="Arrear vs Current Over Time"
              data={arrearVsCurrentData}
              color="#9C27B0"
              height={240}
            />
            <AnimatedChart
              type="pie"
              title="Collections Status Distribution"
              data={statusPieData}
              height={240}
            />
            <AnimatedChart
              type="bar"
              title="Top 5 Districts by Collection"
              data={topDistrictsData}
              color="#9C27B0"
              height={240}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 18,
    letterSpacing: 0.3,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -6,
  },
});
