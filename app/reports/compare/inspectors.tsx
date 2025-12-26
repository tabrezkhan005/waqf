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
import type { InspectorSummary } from '@/lib/types/database';

export default function InspectorPerformanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState<InspectorSummary[]>([]);

  useEffect(() => {
    loadInspectorData();
  }, []);

  const loadInspectorData = async () => {
    try {
      setLoading(true);
      const { data: inspectorProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          district:districts (
            id,
            name
          )
        `)
        .eq('role', 'inspector')
        .order('full_name');

      if (!inspectorProfiles) return;

      const summaries: InspectorSummary[] = [];

      for (const inspector of inspectorProfiles) {
        // Load DCB data for this inspector
        const { data: dcbData } = await supabase
          .from('institution_dcb')
          .select('d_arrears, d_current, receipt_no, challan_no')
          .or(`inspector_name.eq.${inspector.full_name},district_name.eq.${inspector.district?.name}`);

        const total = dcbData?.length || 0;
        const verified = dcbData?.filter((d) => d.receipt_no || d.challan_no).length || 0;
        const rejected = 0; // DCB doesn't track rejected
        const pending = total - verified;

        const totalArrear = dcbData?.reduce(
          (sum, d) => sum + Number(d.d_arrears || 0),
          0
        ) || 0;

        const totalCurrent = dcbData?.reduce(
          (sum, d) => sum + Number(d.d_current || 0),
          0
        ) || 0;

        const verificationRate = total > 0 ? (verified / total) * 100 : 0;

        summaries.push({
          inspector_id: inspector.id,
          inspector_name: inspector.full_name,
          district_name: inspector.district?.name || 'Unknown',
          total_collections: total,
          verified_count: verified,
          rejected_count: rejected,
          pending_count: pending,
          total_arrear: totalArrear,
          total_current: totalCurrent,
          verification_rate: verificationRate,
        });
      }

      // Sort by total collected
      summaries.sort((a, b) => (b.total_arrear + b.total_current) - (a.total_arrear + a.total_current));

      setInspectors(summaries);
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspector Performance</Text>
        {inspectors.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="Top Inspectors by Collection"
            data={{
              labels: inspectors.slice(0, 10).map((insp) =>
                insp.inspector_name.length > 8
                  ? insp.inspector_name.substring(0, 8) + '...'
                  : insp.inspector_name
              ),
              datasets: [
                {
                  data: inspectors.slice(0, 10).map((insp) => insp.total_arrear + insp.total_current),
                },
              ],
            }}
            color="#9C27B0"
            height={300}
          />
        ) : (
          <View style={styles.chartCard}>
            <Text style={styles.emptyText}>No inspector data available</Text>
          </View>
        )}
      </View>

      {/* Leaderboard */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Inspector Rankings</Text>
        {inspectors.map((inspector, index) => {
          const totalCollected = inspector.total_arrear + inspector.total_current;
          return (
            <TouchableOpacity
              key={inspector.inspector_id}
              style={styles.leaderboardItem}
              onPress={() => router.push(`/reports/explore/inspector?inspectorId=${inspector.inspector_id}`)}
            >
              <View style={styles.rankContainer}>
                {index < 3 ? (
                  <View style={[styles.medalBadge, index === 0 && styles.gold, index === 1 && styles.silver, index === 2 && styles.bronze]}>
                    <Text style={styles.medalText}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                )}
              </View>
              <View style={styles.leaderboardContent}>
                <Text style={styles.leaderboardName}>{inspector.inspector_name}</Text>
                <Text style={styles.leaderboardDistrict}>{inspector.district_name}</Text>
                <View style={styles.leaderboardStats}>
                  <Text style={styles.statLabel}>Total:</Text>
                  <Text style={styles.statValue}>{formatCurrency(totalCollected)}</Text>
                  <Text style={styles.statDivider}>•</Text>
                  <Text style={styles.statLabel}>Collections:</Text>
                  <Text style={styles.statValue}>{inspector.total_collections}</Text>
                  <Text style={styles.statDivider}>•</Text>
                  <Text style={styles.statLabel}>Rate:</Text>
                  <Text style={styles.statValue}>{inspector.verification_rate.toFixed(1)}%</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
            </TouchableOpacity>
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
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rankContainer: {
    marginRight: 16,
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  medalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gold: {
    backgroundColor: '#FFD700',
  },
  silver: {
    backgroundColor: '#C0C0C0',
  },
  bronze: {
    backgroundColor: '#CD7F32',
  },
  medalText: {
    fontSize: 24,
  },
  leaderboardContent: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  leaderboardDistrict: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  leaderboardStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  statValue: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  statDivider: {
    fontSize: 12,
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
