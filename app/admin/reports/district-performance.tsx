import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB } from '@/lib/dcb/district-tables';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import AnimatedChart from '@/components/shared/AnimatedChart';
import { theme } from '@/lib/theme';
import { useRouter } from 'expo-router';

interface DistrictPerformance {
  district_name: string;
  total_demand: number;
  total_collection: number;
  collection_rate: number;
  institutions_count: number;
}

export default function DistrictPerformanceScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [districtData, setDistrictData] = useState<DistrictPerformance[]>([]);

  useEffect(() => {
    loadDistrictData();
  }, []);

  const loadDistrictData = async () => {
    try {
      setLoading(true);

      // Load DCB data from all district tables
      // OPTIMIZATION: Limit rows per table to prevent fetching all data
      const dcbData = await queryAllDistrictDCB('demand_total, collection_total, ap_gazette_no, institution_name', { maxRowsPerTable: 500 });

      if (!dcbData || dcbData.length === 0) {
        setDistrictData([]);
        return;
      }

      const districtMap: { [key: string]: DistrictPerformance & { _institutions: Set<string> } } = {};

      dcbData.forEach((d: any) => {
        // Use _district_name from the utility function
        const districtName = d._district_name || 'Unknown';
        const key = districtName;

        if (!districtMap[key]) {
          districtMap[key] = {
            district_name: districtName,
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
            institutions_count: 0,
            _institutions: new Set<string>(),
          };
        }

        districtMap[key].total_demand += Number(d.demand_total || 0);
        districtMap[key].total_collection += Number(d.collection_total || 0);
        // Use ap_gazette_no as unique identifier for institutions
        if (d.ap_gazette_no) districtMap[key]._institutions.add(String(d.ap_gazette_no));
      });

      const performanceData = Object.values(districtMap).map((district) => ({
        district_name: district.district_name,
        total_demand: district.total_demand,
        total_collection: district.total_collection,
        collection_rate: district.total_demand > 0 ? (district.total_collection / district.total_demand) * 100 : 0,
        institutions_count: district._institutions.size,
      }));

      // Sort by total collection descending
      performanceData.sort((a, b) => b.total_collection - a.total_collection);

      setDistrictData(performanceData);
    } catch (error) {
      // Removed debug log district data:', error);
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="District Performance" subtitle="Demand vs Collection" />

        <View style={{ height: theme.spacing.md }} />

        {districtData.length === 0 ? (
          <EmptyState title="No district data" description="No DCB entries found." icon="bar-chart-outline" />
        ) : (
          <>
            <AnimatedChart
              type="bar"
              title="Total collected (top 10)"
              data={{
                labels: districtData.slice(0, 10).map((d) =>
                  d.district_name.length > 10 ? d.district_name.substring(0, 10) + '...' : d.district_name
                ),
                datasets: [{ data: districtData.slice(0, 10).map((d) => d.total_collection) }],
              }}
              color={theme.colors.primary}
              height={300}
            />

            <View style={{ height: theme.spacing.md }} />

            {districtData.map((district, index) => (
              <TouchableOpacity
                key={district.district_name}
                activeOpacity={0.85}
                onPress={() => {
                  // best effort: navigate to global reports district compare/explore
                  router.push('/reports/compare/districts');
                }}
                style={{ marginBottom: theme.spacing.sm }}
              >
                <Card style={styles.rowCard}>
                  <View style={styles.rowLeft}>
                    <View style={styles.rankBadge}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{district.district_name}</Text>
                      <Text style={styles.rowSubtitle}>
                        Demand: {formatCurrency(district.total_demand)} • Collected: {formatCurrency(district.total_collection)}
                        {'\n'}
                        Rate: {district.collection_rate.toFixed(2)}% • Institutions: {district.institutions_count}
                      </Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}
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
  rowCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.surface,
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
});
