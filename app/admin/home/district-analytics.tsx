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
import { queryDistrictDCB, getAggregatedDCBStats } from '@/lib/dcb/district-tables';

export default function DistrictAnalyticsScreen() {
  const { districtId } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [districtData, setDistrictData] = useState<any>(null);

  useEffect(() => {
    loadDistrictData();
  }, [districtId]);

  const loadDistrictData = async () => {
    try {
      setLoading(true);

      // Load district details
      const { data: district } = await supabase
        .from('districts')
        .select('id, name')
        .eq('id', districtId)
        .single();

      if (!district) {
        setDistrictData(null);
        return;
      }

      // Load inspector for this district
      const { data: inspector } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'inspector')
        .eq('district_id', districtId)
        .single();

      // Load DCB data for this district
      // OPTIMIZATION: Limit rows to prevent fetching all data
      const dcbData = await queryDistrictDCB(
        district.name,
        'demand_total, collection_total, balance_total, ap_gazette_no',
        { maxRows: 2000 }
      );

      const totalDemand = dcbData.reduce((sum: number, d: any) => sum + Number(d.demand_total || 0), 0);
      const totalCollection = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_total || 0), 0);
      const totalBalance = dcbData.reduce((sum: number, d: any) => sum + Number(d.balance_total || 0), 0);

      // Get institutions count
      const { count: institutionsCount } = await supabase
        .from('institutions')
        .select('*', { count: 'exact', head: true })
        .eq('district_id', districtId)
        .eq('is_active', true);

      // Get collections count
      const { data: districtInstitutions } = await supabase
        .from('institutions')
        .select('id')
        .eq('district_id', districtId)
        .eq('is_active', true);

      const institutionIds = (districtInstitutions || []).map((i: any) => i.id).filter(Boolean);

      let pendingCount = 0;
      let completedCount = 0;
      if (institutionIds.length > 0) {
        const { count: pending } = await supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .in('status', ['pending', 'sent_to_accounts'])
          .in('institution_id', institutionIds);

        const { count: completed } = await supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'verified')
          .in('institution_id', institutionIds);

        pendingCount = pending || 0;
        completedCount = completed || 0;
      }

      setDistrictData({
        name: district.name,
        inspector: inspector?.full_name || 'Not Assigned',
        totalDemand,
        totalCollection,
        totalBalance,
        institutionsCount: institutionsCount || 0,
        pendingCollections: pendingCount,
        completedCollections: completedCount,
        dcbRecordsCount: dcbData.length,
      });
    } catch (error) {
      // Removed debug log district data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else {
      return `₹${amount.toLocaleString()}`;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>District Analytics</Text>
        <Text style={styles.subtitle}>
          Detailed analytics for {districtData?.name || 'District'}
        </Text>

        {districtData && (
          <>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Inspector</Text>
              <Text style={styles.statValue}>{districtData.inspector}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Institutions</Text>
              <Text style={styles.statValue}>{districtData.institutionsCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>DCB Records</Text>
              <Text style={styles.statValue}>{districtData.dcbRecordsCount}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Demand</Text>
              <Text style={styles.statValue}>{formatCurrency(districtData.totalDemand)}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Collection</Text>
              <Text style={[styles.statValue, { color: '#0A7E43' }]}>
                {formatCurrency(districtData.totalCollection)}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Balance</Text>
              <Text style={styles.statValue}>{formatCurrency(districtData.totalBalance)}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Collection Rate</Text>
              <Text style={styles.statValue}>
                {districtData.totalDemand > 0
                  ? `${((districtData.totalCollection / districtData.totalDemand) * 100).toFixed(2)}%`
                  : '0%'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Pending Collections</Text>
              <Text style={styles.statValue}>{districtData.pendingCollections}</Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Completed Collections</Text>
              <Text style={styles.statValue}>{districtData.completedCollections}</Text>
            </View>
          </>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
  },
});
