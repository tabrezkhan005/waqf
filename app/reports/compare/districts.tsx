import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { DistrictSummary } from '@/lib/types/database';

export default function DistrictComparisonScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [districts, setDistricts] = useState<DistrictSummary[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [topN, setTopN] = useState<number | null>(null);

  useEffect(() => {
    loadDistrictData();
  }, []);

  const loadDistrictData = async () => {
    try {
      setLoading(true);
      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (!districtsData) return;

      const summaries: DistrictSummary[] = [];

      for (const district of districtsData) {
        // Get DCB data for this district (join through institutions)
        const { data: dcbData } = await supabase
          .from('institution_dcb')
          .select(`
            collection_arrears,
            collection_current,
            collection_total,
            institution:institutions!institution_dcb_institution_id_fkey (
              district_id
            )
          `)
          .eq('institution.district_id', district.id);

        // Calculate metrics from DCB data
        const pending = dcbData?.length || 0;
        const verified = 0; // DCB doesn't track verification status
        const rejected = 0;
        const verifiedAmount = 0; // DCB doesn't track verification status
        const arrearAmount = dcbData?.reduce((sum, d) => sum + Number(d.collection_arrears || 0), 0) || 0;
        const currentAmount = dcbData?.reduce((sum, d) => sum + Number(d.collection_current || 0), 0) || 0;

        summaries.push({
          district_id: district.id,
          district_name: district.name,
          pending_count: pending,
          verified_count: verified,
          rejected_count: rejected,
          verified_amount: verifiedAmount,
          arrear_amount: arrearAmount,
          current_amount: currentAmount,
        });
      }

      // Sort by verified amount
      summaries.sort((a, b) =>
        sortOrder === 'desc'
          ? b.verified_amount - a.verified_amount
          : a.verified_amount - b.verified_amount
      );

      setDistricts(summaries);
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

  const displayDistricts = topN ? districts.slice(0, topN) : districts;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
        <TouchableOpacity
          style={[styles.filterChip, !topN && styles.filterChipActive]}
          onPress={() => setTopN(null)}
        >
          <Text style={[styles.filterChipText, !topN && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, topN === 10 && styles.filterChipActive]}
          onPress={() => setTopN(10)}
        >
          <Text style={[styles.filterChipText, topN === 10 && styles.filterChipTextActive]}>
            Top 10
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, sortOrder === 'desc' && styles.filterChipActive]}
          onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
        >
          <Text style={[styles.filterChipText, sortOrder === 'desc' && styles.filterChipTextActive]}>
            {sortOrder === 'desc' ? '↓ High to Low' : '↑ Low to High'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>District Performance Comparison</Text>
        {displayDistricts.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="District Comparison Chart"
            data={{
              labels: displayDistricts.slice(0, 10).map((d) =>
                d.district_name.length > 8
                  ? d.district_name.substring(0, 8) + '...'
                  : d.district_name
              ),
              datasets: [
                {
                  data: displayDistricts.slice(0, 10).map((d) => d.verified_amount),
                },
              ],
            }}
            color="#9C27B0"
            height={300}
          />
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.emptyText}>No district data available</Text>
          </View>
        )}
      </View>

      {/* District List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>District Rankings</Text>
        {displayDistricts.map((district, index) => (
          <TouchableOpacity
            key={district.district_id}
            style={styles.districtCard}
            onPress={() => router.push(`/reports/explore/district?districtId=${district.district_id}`)}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.districtCardContent}>
              <Text style={styles.districtName}>{district.district_name}</Text>
              <View style={styles.districtStats}>
                <Text style={styles.statText}>
                  Verified: {formatCurrency(district.verified_amount)}
                </Text>
                <Text style={styles.statText}>•</Text>
                <Text style={styles.statText}>
                  Pending: {district.pending_count}
                </Text>
              </View>
              <View style={styles.amountBreakdown}>
                <Text style={styles.breakdownText}>
                  Arrear: {formatCurrency(district.arrear_amount)} | Current: {formatCurrency(district.current_amount)}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        ))}
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
  filtersContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
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
  chartCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 16,
  },
  districtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  districtCardContent: {
    flex: 1,
  },
  districtName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  districtStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  amountBreakdown: {
    marginTop: 4,
  },
  breakdownText: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    padding: 16,
  },
});
