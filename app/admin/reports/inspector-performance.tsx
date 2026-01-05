import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import AnimatedChart from '@/components/shared/AnimatedChart';
import { theme } from '@/lib/theme';

interface InspectorPerformance {
  inspector_name: string;
  district_name: string;
  institutions_count: number;
  total_demand: number;
  total_collection: number;
  collection_rate: number;
}

export default function InspectorPerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState<InspectorPerformance[]>([]);

  useEffect(() => {
    loadInspectorPerformance();
  }, []);

  const loadInspectorPerformance = async () => {
    try {
      setLoading(true);

      const { data: dcbData, error } = await supabase
        .from('institution_dcb')
        .select(
          `
          inspector_id,
          demand_total,
          collection_total,
          institution_id,
          inspector:profiles!institution_dcb_inspector_id_fkey (
            full_name,
            district:districts (
              name
            )
          )
        `
        )
        .limit(10000);

      if (error) {
        // Removed debug log inspector performance:', error);
        setInspectors([]);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setInspectors([]);
        return;
      }

      const inspectorMap: { [key: string]: InspectorPerformance & { _institutions: Set<string> } } = {};

      (dcbData || []).forEach((d: any) => {
        const inspectorName = d.inspector?.full_name || 'Unknown';
        const districtName = d.inspector?.district?.name || 'Unknown';
        const key = `${inspectorName}__${districtName}`;

        if (!inspectorMap[key]) {
          inspectorMap[key] = {
            inspector_name: inspectorName,
            district_name: districtName,
            institutions_count: 0,
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
            _institutions: new Set<string>(),
          };
        }

        inspectorMap[key].total_demand += Number(d.demand_total || 0);
        inspectorMap[key].total_collection += Number(d.collection_total || 0);
        if (d.institution_id) inspectorMap[key]._institutions.add(String(d.institution_id));
      });

      const performanceData = Object.values(inspectorMap).map((inspector) => ({
        inspector_name: inspector.inspector_name,
        district_name: inspector.district_name,
        institutions_count: inspector._institutions.size,
        total_demand: inspector.total_demand,
        total_collection: inspector.total_collection,
        collection_rate: inspector.total_demand > 0 ? (inspector.total_collection / inspector.total_demand) * 100 : 0,
      }));

      // Sort by total collection descending
      performanceData.sort((a, b) => b.total_collection - a.total_collection);

      setInspectors(performanceData);
    } catch (error) {
      // Removed debug log inspector performance:', error);
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

  const top10 = useMemo(() => inspectors.slice(0, 10), [inspectors]);

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
        <AppHeader title="Inspector Performance" subtitle="Demand vs Collection" />

        <View style={{ height: theme.spacing.md }} />

        {inspectors.length === 0 ? (
          <EmptyState title="No inspector data" description="No DCB entries found." icon="people-outline" />
        ) : (
          <>
            <AnimatedChart
              type="bar"
              title="Total collected (top 10)"
              data={{
                labels: top10.map((i) => (i.inspector_name.length > 10 ? i.inspector_name.substring(0, 10) + '...' : i.inspector_name)),
                datasets: [{ data: top10.map((i) => i.total_collection) }],
              }}
              color={theme.colors.primary}
              height={300}
            />

            <View style={{ height: theme.spacing.md }} />

            {inspectors.map((inspector, index) => (
              <Card key={`${inspector.inspector_name}_${inspector.district_name}_${index}`} style={styles.rowCard}>
                <View style={styles.rowLeft}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{inspector.inspector_name}</Text>
                    <Text style={styles.rowSubtitle}>
                      {inspector.district_name} • Institutions: {inspector.institutions_count}
                      {'\n'}
                      Demand: {formatCurrency(inspector.total_demand)} • Collected: {formatCurrency(inspector.total_collection)} • Rate: {inspector.collection_rate.toFixed(2)}%
                    </Text>
                  </View>
                </View>
              </Card>
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
    marginBottom: theme.spacing.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
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
