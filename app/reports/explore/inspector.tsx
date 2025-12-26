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
import type { InspectorMetrics } from '@/lib/types/database';

export default function InspectorDetailScreen() {
  const params = useLocalSearchParams();
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

      // Load DCB data for this inspector (by inspector_id)
      const { data: dcbData, error: dcbError } = await supabase
        .from('institution_dcb')
        .select(`
          id,
          institution_id,
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
          institution:institutions (
            id,
            name,
            ap_gazette_no
          )
        `)
        .eq('inspector_id', inspector.id)
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
      const total = dcbData?.length || 0;
      const verificationRate = 0;

      // Calculate average per day
      const dates = dcbData?.map(d => d.created_at).filter(Boolean) || [];
      const firstCollection = dates.length > 0
        ? new Date(dates[dates.length - 1])
        : new Date();
      const daysDiff = Math.max(1, Math.floor((new Date().getTime() - firstCollection.getTime()) / (1000 * 60 * 60 * 24)));
      const averagePerDay = totalCollection / daysDiff;

      // Count unique institutions
      const institutionIds = new Set(dcbData?.map((d) => d.institution_id).filter(Boolean) || []);
      const institutionsServed = institutionIds.size;

      // Format collections for display
      const collections = dcbData?.map((d: any) => ({
        id: d.id,
        collection_date: d.created_at,
        arrear_amount: Number(d.collection_arrears || 0),
        current_amount: Number(d.collection_current || 0),
        status: 'pending' as const, // DCB doesn't track verification status
        institution: d.institution ? { name: d.institution.name } : null,
      })) || [];

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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  if (!metrics) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Inspector data not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.inspectorName}>{metrics.inspector_name}</Text>
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
          <KPICard
            title="Verification Rate"
            value={`${metrics.verification_rate.toFixed(1)}%`}
            icon="checkmark-circle-outline"
            color="#1A9D5C"
          />
          <KPICard
            title="Avg/Day"
            value={formatCurrency(metrics.average_per_day)}
            icon="calendar-outline"
            color="#003D99"
          />
          <KPICard
            title="Institutions"
            value={metrics.institutions_served}
            icon="business-outline"
            color="#FF9500"
          />
        </View>
      </View>

      {/* Collections Over Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Collections Over Time</Text>
        {metrics.collections.length > 0 ? (
          <AnimatedChart
            type="line"
            title="Collection Timeline"
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
                  color: (opacity = 1) => `rgba(26, 157, 92, ${opacity})`,
                  strokeWidth: 3,
                },
              ],
            }}
            color="#1A9D5C"
            height={250}
          />
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.emptyText}>No collection timeline data</Text>
          </View>
        )}
      </View>

      {/* Recent Collections */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Collections</Text>
        {metrics.collections.length > 0 ? (
          metrics.collections.slice(0, 10).map((collection) => {
            const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
            return (
              <View key={collection.id} style={styles.collectionItem}>
                <View style={styles.collectionItemLeft}>
                  <Text style={styles.collectionInstitution}>
                    {collection.institution?.name || 'Unknown'}
                  </Text>
                  <Text style={styles.collectionDate}>
                    {collection.collection_date
                      ? new Date(collection.collection_date).toLocaleDateString('en-IN')
                      : 'N/A'}
                  </Text>
                  <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: '#FF950020' }]}>
                  <Text style={[styles.statusText, { color: '#FF9500' }]}>
                    {collection.status.replace('_', ' ').toUpperCase()}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>No collections found</Text>
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
  inspectorName: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
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
  collectionItem: {
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
  collectionItemLeft: {
    flex: 1,
  },
  collectionInstitution: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  collectionDate: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  collectionAmount: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#9C27B0',
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
