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

type TimePeriod = 'today' | 'weekly' | 'monthly' | 'yearly';

interface TrendData {
  period: string;
  total_demand: number;
  total_collection: number;
  institutions_count: number;
  periodKey: string;
}

export default function MonthlyTrendsScreen() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('monthly');

  useEffect(() => {
    loadTrends();
  }, [selectedPeriod]);

  const loadTrends = async () => {
    try {
      setLoading(true);

      // Load DCB data from all district tables
      const dcbData = await queryAllDistrictDCB('demand_total, collection_total, created_at, ap_gazette_no');

      if (!dcbData || dcbData.length === 0) {
        setTrends([]);
        return;
      }

      const now = new Date();
      const trendsMap: { [key: string]: TrendData & { _institutions: Set<string> } } = {};

      dcbData.forEach((d: any) => {
        const date = new Date(d.created_at);
        if (!date || isNaN(date.getTime())) return;

        let periodKey = '';
        let periodLabel = '';

        switch (selectedPeriod) {
          case 'today':
            if (date.toDateString() !== now.toDateString()) return;
            periodKey = 'today';
            periodLabel = 'Today';
            break;

          case 'weekly':
            // Get start of week (Monday)
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay() + 1);
            weekStart.setHours(0, 0, 0, 0);

            if (date < weekStart) return;

            const dayOfWeek = date.getDay();
            const weekDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            periodKey = date.toISOString().split('T')[0];
            periodLabel = weekDayNames[dayOfWeek];
            break;

          case 'monthly':
            periodKey = date.toISOString().slice(0, 7); // YYYY-MM
            periodLabel = date.toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric'
            });
            break;

          case 'yearly':
            periodKey = date.getFullYear().toString();
            periodLabel = date.getFullYear().toString();
            break;
        }

        if (!periodKey) return;

        if (!trendsMap[periodKey]) {
          trendsMap[periodKey] = {
            period: periodLabel,
            total_demand: 0,
            total_collection: 0,
            institutions_count: 0,
            periodKey: periodKey,
            _institutions: new Set<string>(),
          };
        }

        trendsMap[periodKey].total_demand += Number(d.demand_total || 0);
        trendsMap[periodKey].total_collection += Number(d.collection_total || 0);
        // Use ap_gazette_no as unique identifier
        if (d.ap_gazette_no) {
          trendsMap[periodKey]._institutions.add(String(d.ap_gazette_no));
        }
      });

      // Convert to array and sort
      const trendsData = Object.entries(trendsMap)
        .map(([key, value]) => ({
          period: value.period,
          total_demand: value.total_demand,
          total_collection: value.total_collection,
          institutions_count: value._institutions.size,
          periodKey: key,
        }))
        .sort((a, b) => {
          if (selectedPeriod === 'weekly' || selectedPeriod === 'monthly') {
            return a.periodKey.localeCompare(b.periodKey);
          }
          return b.periodKey.localeCompare(a.periodKey);
        });

      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading trends:', error);
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

  const chartData = useMemo(() => {
    // For weekly and monthly, show last 12 periods; for yearly, show all; for today, show single point
    let displayTrends = trends;
    if (selectedPeriod === 'weekly' || selectedPeriod === 'monthly') {
      displayTrends = trends.slice(-12);
    } else if (selectedPeriod === 'today') {
      displayTrends = trends;
    }

    const labels =
      displayTrends.length > 0
        ? displayTrends.map((t) => {
            if (selectedPeriod === 'weekly') {
              return new Date(t.periodKey).toLocaleDateString('en-US', { weekday: 'short' });
            } else if (selectedPeriod === 'monthly') {
              return t.period.split(' ')[0].slice(0, 3);
            } else if (selectedPeriod === 'today') {
              return 'Today';
            } else {
              return t.period;
            }
          })
        : ['No Data'];

    const demand = displayTrends.length > 0 ? displayTrends.map((t) => t.total_demand) : [0];
    const collected = displayTrends.length > 0 ? displayTrends.map((t) => t.total_collection) : [0];

    return {
      labels,
      datasets: [
        { data: demand, color: () => '#8B5CF6', strokeWidth: 3 },
        { data: collected, color: () => theme.colors.primary, strokeWidth: 3 },
      ],
      legend: ['Demand', 'Collected'],
    };
  }, [trends, selectedPeriod]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'today':
        return 'Today\'s Trends';
      case 'weekly':
        return 'Weekly Trends';
      case 'monthly':
        return 'Monthly Trends';
      case 'yearly':
        return 'Yearly Trends';
      default:
        return 'Collection Trends';
    }
  };

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title={getPeriodTitle()} subtitle="Demand vs Collection" />

        <View style={{ height: theme.spacing.md }} />

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'today' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('today')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'today' && styles.periodButtonTextActive]}>
              Today
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'weekly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('weekly')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'weekly' && styles.periodButtonTextActive]}>
              Weekly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('monthly')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'monthly' && styles.periodButtonTextActive]}>
              Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('yearly')}
          >
            <Text style={[styles.periodButtonText, selectedPeriod === 'yearly' && styles.periodButtonTextActive]}>
              Yearly
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: theme.spacing.md }} />

        {trends.length === 0 ? (
          <EmptyState title="No trend data" description={`No DCB entries found for ${selectedPeriod} period.`} icon="trending-up-outline" />
        ) : (
          <>
            <Card style={styles.chartCard}>
              <Text style={styles.chartTitle}>Demand vs Collection</Text>

              {/* Legend */}
              <View style={styles.legendContainer}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                  <Text style={styles.legendText}>Demand</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={styles.legendText}>Collected</Text>
                </View>
              </View>

              <AnimatedChart
                type="line"
                title=""
                data={chartData}
                color={theme.colors.primary}
                height={280}
              />
            </Card>

            <View style={{ height: theme.spacing.md }} />

            {trends.slice().reverse().map((trend) => {
              const collectionRate = trend.total_demand > 0 ? (trend.total_collection / trend.total_demand) * 100 : 0;
              return (
                <Card key={trend.periodKey} style={styles.trendCard}>
                  <Text style={styles.periodLabel}>{trend.period}</Text>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Demand</Text>
                      <Text style={styles.metricValue}>{formatCurrency(trend.total_demand)}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Collected</Text>
                      <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{formatCurrency(trend.total_collection)}</Text>
                    </View>
                  </View>

                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Rate</Text>
                      <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{collectionRate.toFixed(2)}%</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Institutions</Text>
                      <Text style={styles.metricValue}>{trend.institutions_count}</Text>
                    </View>
                  </View>
                </Card>
              );
            })}
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
  periodSelector: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  periodButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  periodButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  chartCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  chartTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  trendCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  periodLabel: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  metric: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
});
