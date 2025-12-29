import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { DistrictSummary } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

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

      // Load districts and DCB data in parallel
      const [{ data: districtRows }, dcbData] = await Promise.all([
        supabase.from('districts').select('id, name').order('name'),
        import('@/lib/dcb/district-tables').then(m => m.queryAllDistrictDCB(
          'demand_arrears, demand_current, collection_arrears, collection_current, collection_total, _district_name'
        ))
      ]);

      const byDistrict = new Map<string, DistrictSummary>();

      // Initialize all districts
      (districtRows || []).forEach((d: any) => {
        byDistrict.set(String(d.id), {
          district_id: String(d.id),
          district_name: d.name,
          pending_count: 0,
          verified_count: 0,
          rejected_count: 0,
          verified_amount: 0,
          arrear_amount: 0,
          current_amount: 0,
        });
      });

      // Aggregate DCB data by district
      dcbData.forEach((row: any) => {
        if (!row._district_name) return;

        // Find district by name
        const district = (districtRows || []).find((d: any) => d.name === row._district_name);
        if (!district) return;

        const key = String(district.id);
        const existing = byDistrict.get(key);

        if (existing) {
          existing.pending_count += 1;
          existing.arrear_amount += Number(row.demand_arrears || 0);
          existing.current_amount += Number(row.demand_current || 0);
          existing.verified_amount += Number(row.collection_total || 0);
        }
      });

      setDistricts(Array.from(byDistrict.values()));
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

  const displayDistricts = useMemo(() => {
    const sorted = [...districts].sort((a, b) => {
      return sortOrder === 'desc' ? b.verified_amount - a.verified_amount : a.verified_amount - b.verified_amount;
    });
    return topN ? sorted.slice(0, topN) : sorted;
  }, [districts, sortOrder, topN]);

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
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Compare" subtitle="Districts" />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.filtersRow}>
          <Chip label="All" selected={!topN} onPress={() => setTopN(null)} />
          <Chip label="Top 10" selected={topN === 10} onPress={() => setTopN(10)} />
          <Chip
            label={sortOrder === 'desc' ? '↓ High to Low' : '↑ Low to High'}
            selected
            onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          />
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.sectionTitle}>District comparison</Text>
        {displayDistricts.length > 0 ? (
          <AnimatedChart
            type="bar"
            title="Total collected by district"
            data={{
              labels: displayDistricts.slice(0, 10).map((d) =>
                d.district_name.length > 10 ? d.district_name.substring(0, 10) + '...' : d.district_name
              ),
              datasets: [{ data: displayDistricts.slice(0, 10).map((d) => d.verified_amount) }],
            }}
            color={theme.colors.secondary}
            height={300}
          />
        ) : (
          <EmptyState title="No district data" description="No DCB entries found." icon="map-outline" />
        )}

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.sectionTitle}>Rankings</Text>
        {displayDistricts.map((district, index) => (
          <TouchableOpacity
            key={district.district_id}
            activeOpacity={0.85}
            onPress={() => router.push(`/reports/explore/district?districtId=${district.district_id}`)}
            style={{ marginBottom: theme.spacing.sm }}
          >
            <Card style={styles.rowCard}>
              <View style={styles.rowLeft}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{district.district_name}</Text>
                  <Text style={styles.rowSubtitle} numberOfLines={2}>
                    Total: {formatCurrency(district.verified_amount)} • Entries: {district.pending_count}
                    {'\n'}
                    Arrear: {formatCurrency(district.arrear_amount)} • Current: {formatCurrency(district.current_amount)}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        ))}
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
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
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
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
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
