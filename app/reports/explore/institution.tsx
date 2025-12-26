import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import KPICard from '@/components/reports/KPICard';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { InstitutionMetrics } from '@/lib/types/database';

export default function InstitutionDetailScreen() {
  const params = useLocalSearchParams();
  const institutionId = params.institutionId as string | null;

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<InstitutionMetrics | null>(null);

  useEffect(() => {
    if (institutionId) {
      loadInstitutionData();
    }
  }, [institutionId]);

  const loadInstitutionData = async () => {
    if (!institutionId) return;

    try {
      setLoading(true);

      // Load institution
      const { data: institution } = await supabase
        .from('institutions')
        .select(`
          id,
          name,
          ap_gazette_no,
          district:districts (
            id,
            name
          )
        `)
        .eq('id', institutionId)
        .single();

      // Load DCB data for this institution
      const { data: dcbData, error: dcbError } = await supabase
        .from('institution_dcb')
        .select(`
          id,
          demand_arrears,
          demand_current,
          demand_total,
          collection_arrears,
          collection_current,
          collection_total,
          balance_arrears,
          balance_current,
          balance_total,
          financial_year,
          created_at,
          inspector:profiles!institution_dcb_inspector_id_fkey (
            id,
            full_name
          )
        `)
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (dcbError) {
        console.error('Error loading DCB data:', dcbError);
        return;
      }

      // Calculate totals from DCB data
      const totalArrear = dcbData?.reduce(
        (sum, d) => sum + Number(d.demand_arrears || 0),
        0
      ) || 0;

      const totalCurrent = dcbData?.reduce(
        (sum, d) => sum + Number(d.demand_current || 0),
        0
      ) || 0;

      const totalCollection = dcbData?.reduce(
        (sum, d) => sum + Number(d.collection_total || 0),
        0
      ) || 0;

      // Status counts - DCB doesn't track verification status
      const verified = 0;
      const pending = dcbData?.length || 0;
      const rejected = 0;

      // Get date range
      const dates = dcbData?.map(d => d.created_at).filter(Boolean) || [];
      const firstDate = dates.length > 0 ? dates[dates.length - 1] : null;
      const lastDate = dates.length > 0 ? dates[0] : null;

      // Calculate outstanding balance (d_total - c_total)
      const totalOutstanding = dcbData?.reduce(
        (sum, d) => sum + (Number(d.d_total || 0) - Number(d.c_total || 0)),
        0
      ) || 0;

      // Format collections for display
      const collections = dcbData?.map((d, index) => ({
        id: d.id,
        collection_date: d.receipt_date || d.challan_date || d.created_at,
        arrear_amount: Number(d.d_arrears || 0),
        current_amount: Number(d.d_current || 0),
        status: d.receipt_no || d.challan_no ? 'verified' : 'pending',
        challan_no: d.challan_no,
        receipt_no: d.receipt_no,
        inspector: d.inspector_name ? { full_name: d.inspector_name } : null,
      })) || [];

      setMetrics({
        institution_id: institutionId,
        institution_name: institution?.name || 'Unknown',
        institution_code: institution?.code || null,
        district_name: institution?.district?.name || 'Unknown',
        total_arrear: totalArrear,
        total_current: totalCurrent,
        total_outstanding: totalOutstanding,
        collection_count: dcbData?.length || 0,
        first_collection_date: firstDate,
        last_collection_date: lastDate,
        collections: collections as any,
      });
    } catch (error) {
      console.error('Error loading institution data:', error);
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#1A9D5C';
      case 'rejected':
        return '#FF3B30';
      case 'sent_to_accounts':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Institution data not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.institutionName}>{metrics.institution_name}</Text>
        {metrics.institution_code && (
          <Text style={styles.institutionCode}>Code: {metrics.institution_code}</Text>
        )}
        <Text style={styles.districtName}>{metrics.district_name}</Text>
      </View>

      {/* Metrics */}
      <View style={styles.section}>
        <View style={styles.kpiGrid}>
          <KPICard
            title="Total Arrear"
            value={formatCurrency(metrics.total_arrear)}
            icon="trending-up-outline"
            color="#FF6B35"
          />
          <KPICard
            title="Total Current"
            value={formatCurrency(metrics.total_current)}
            icon="trending-down-outline"
            color="#1A9D5C"
          />
          <KPICard
            title="Collections"
            value={metrics.collection_count}
            icon="receipt-outline"
            color="#9C27B0"
          />
          {metrics.total_outstanding > 0 && (
            <KPICard
              title="Outstanding"
              value={formatCurrency(metrics.total_outstanding)}
              icon="alert-circle-outline"
              color="#FF9500"
            />
          )}
        </View>
      </View>

      {/* Timeline Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collection Timeline</Text>
        {metrics.collections.length > 0 ? (
          <AnimatedChart
            type="line"
            title="Collections Over Time"
            data={{
              labels: metrics.collections.slice(0, 6).map((c, i) => {
                const date = c.collection_date ? new Date(c.collection_date) : new Date();
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              }),
              datasets: [
                {
                  data: metrics.collections.slice(0, 6).map((c) =>
                    Number(c.arrear_amount || 0) + Number(c.current_amount || 0)
                  ),
                  color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            color="#9C27B0"
            height={250}
          />
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.emptyText}>No collection timeline data</Text>
          </View>
        )}
      </View>

      {/* Status Distribution */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status Distribution</Text>
        <AnimatedChart
          type="pie"
          title="Collections by Status"
          data={[
            {
              name: 'Verified',
              population: metrics.collections.filter((c) => c.status === 'verified').length || 1,
              color: '#1A9D5C',
              legendFontColor: '#2A2A2A',
              legendFontSize: 14,
            },
            {
              name: 'Pending',
              population: metrics.collections.filter((c) => c.status === 'pending').length || 1,
              color: '#FF9500',
              legendFontColor: '#2A2A2A',
              legendFontSize: 14,
            },
          ]}
          height={250}
        />
      </View>

      {/* History List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collection History</Text>
        {metrics.collections.length > 0 ? (
          metrics.collections.map((collection) => {
            const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
            return (
              <View key={collection.id} style={styles.historyItem}>
                <View style={styles.historyItemLeft}>
                  <Text style={styles.historyDate}>{formatDate(collection.collection_date)}</Text>
                  {collection.inspector && (
                    <Text style={styles.historyInspector}>
                      Inspector: {collection.inspector.full_name}
                    </Text>
                  )}
                  <Text style={styles.historyAmount}>₹{total.toLocaleString('en-IN')}</Text>
                  {collection.challan_no && (
                    <Text style={styles.historyChallan}>Challan: {collection.challan_no}</Text>
                  )}
                  {collection.receipt_no && (
                    <Text style={styles.historyChallan}>Receipt: {collection.receipt_no}</Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(collection.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(collection.status) }]}>
                    {collection.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No collection history found</Text>
        )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#FF3B30',
  },
  header: {
    marginBottom: 24,
  },
  institutionName: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  institutionCode: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  districtName: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 16,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chartCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  historyItemLeft: {
    flex: 1,
  },
  historyDate: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  historyInspector: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  historyAmount: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#9C27B0',
    marginBottom: 4,
  },
  historyChallan: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
  },
});
