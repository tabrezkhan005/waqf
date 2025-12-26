import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import type { DistrictSummary, CollectionWithRelations } from '@/lib/types/database';

export default function DistrictReportScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const districtId = params.districtId as string | null;

  const [loading, setLoading] = useState(true);
  const [district, setDistrict] = useState<{ id: string; name: string } | null>(null);
  const [summary, setSummary] = useState<DistrictSummary | null>(null);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);

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

      setDistrict(districtData);

      // Load DCB data for this district
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select(`
          *,
          institution:institutions!inner (
            id,
            name,
            code
          )
        `)
        .eq('district_name', districtData?.name || '')
        .order('created_at', { ascending: false });

      // Transform DCB data to collection-like format for compatibility
      const transformedCollections = (dcbData || []).map((d: any) => ({
        id: d.id,
        institution: d.institution,
        inspector: d.inspector_name ? { full_name: d.inspector_name } : null,
        arrear_amount: d.d_arrears,
        current_amount: d.d_current,
        collection_date: d.receipt_date || d.challan_date || d.created_at,
        status: d.receipt_no || d.challan_no ? 'verified' : 'pending',
        challan_no: d.challan_no,
        receipt_no: d.receipt_no,
        created_at: d.created_at,
      }));

      setCollections(transformedCollections as CollectionWithRelations[]);

      // Calculate summary from DCB data
      const verified = dcbData?.filter((d: any) => d.receipt_no || d.challan_no).length || 0;
      const pending = (dcbData?.length || 0) - verified;
      const rejected = 0; // DCB doesn't track rejected

      const verifiedAmount = dcbData?.filter((d: any) => d.receipt_no || d.challan_no).reduce(
        (sum: number, d: any) => sum + Number(d.c_total || 0),
        0
      ) || 0;

      const arrearAmount = dcbData?.filter((d: any) => d.receipt_no || d.challan_no).reduce(
        (sum: number, d: any) => sum + Number(d.c_arrears || 0),
        0
      ) || 0;

      const currentAmount = dcbData?.filter((d: any) => d.receipt_no || d.challan_no).reduce(
        (sum: number, d: any) => sum + Number(d.c_current || 0),
        0
      ) || 0;

      setSummary({
        district_id: districtId,
        district_name: districtData?.name || 'Unknown',
        pending_count: pending,
        verified_count: verified,
        rejected_count: rejected,
        verified_amount: verifiedAmount,
        arrear_amount: arrearAmount,
        current_amount: currentAmount,
      });
    } catch (error) {
      console.error('Error loading district data:', error);
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
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  if (!district || !summary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>District data not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Summary Cards */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{district.name} - Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.pending_count}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.verified_count}</Text>
            <Text style={styles.summaryLabel}>Verified</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{summary.rejected_count}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>
      </View>

      {/* Amount Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Amount Breakdown</Text>
        <View style={styles.amountsCard}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Verified</Text>
            <Text style={styles.amountValue}>{formatCurrency(summary.verified_amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Arrear Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(summary.arrear_amount)}</Text>
          </View>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Current Amount</Text>
            <Text style={styles.amountValue}>{formatCurrency(summary.current_amount)}</Text>
          </View>
        </View>
      </View>

      {/* Collections List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Collections</Text>
        {collections.slice(0, 10).map((collection) => {
          const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
          return (
            <View key={collection.id} style={styles.collectionItem}>
              <View style={styles.collectionItemLeft}>
                <Text style={styles.collectionInstitution}>
                  {collection.institution?.name || 'Unknown'}
                </Text>
                <Text style={styles.collectionInspector}>
                  Inspector: {collection.inspector?.full_name || 'N/A'}
                </Text>
              </View>
              <View style={styles.collectionItemRight}>
                <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
                <View style={[styles.statusBadge, { backgroundColor: collection.status === 'verified' ? '#1A9D5C20' : '#FF950020' }]}>
                  <Text style={[styles.statusText, { color: collection.status === 'verified' ? '#1A9D5C' : '#FF9500' }]}>
                    {collection.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryValue: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  amountsCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  amountValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FF9500',
  },
  collectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  collectionItemLeft: {
    flex: 1,
  },
  collectionInstitution: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  collectionInspector: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  collectionItemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  collectionAmount: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FF9500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
});
