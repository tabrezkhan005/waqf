import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';

interface MonthlyTrend {
  month: string;
  total_demand: number;
  total_collection: number;
  institutions_count: number;
}

export default function MonthlyTrendsScreen() {
  const [loading, setLoading] = useState(true);
  const [trends, setTrends] = useState<MonthlyTrend[]>([]);

  useEffect(() => {
    loadMonthlyTrends();
  }, []);

  const loadMonthlyTrends = async () => {
    try {
      setLoading(true);

      // Load DCB data
      const { data: dcbData, error } = await supabase
        .from('institution_dcb')
        .select(`
          d_total,
          c_total,
          receipt_date,
          challan_date,
          created_at,
          institution_name
        `);

      if (error) {
        console.error('Error loading monthly trends:', error);
        setTrends([]);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setTrends([]);
        return;
      }

      // Group by month
      const monthlyMap: { [key: string]: MonthlyTrend } = {};

      dcbData.forEach((d) => {
        // Use receipt_date, challan_date, or created_at
        const date = d.receipt_date || d.challan_date || d.created_at;
        if (!date) return;

        const monthKey = new Date(date).toISOString().slice(0, 7); // YYYY-MM
        const monthLabel = new Date(date).toLocaleDateString('en-US', {
          month: 'long',
          year: 'numeric'
        });

        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = {
            month: monthLabel,
            total_demand: 0,
            total_collection: 0,
            institutions_count: 0,
          };
        }

        monthlyMap[monthKey].total_demand += Number(d.d_total || 0);
        monthlyMap[monthKey].total_collection += Number(d.c_total || 0);
        if (d.institution_name) {
          monthlyMap[monthKey].institutions_count += 1;
        }
      });

      // Convert to array and sort by month
      const trendsData = Object.entries(monthlyMap)
        .map(([key, value]) => ({
          ...value,
          monthKey: key,
        }))
        .sort((a, b) => a.monthKey.localeCompare(b.monthKey));

      setTrends(trendsData);
    } catch (error) {
      console.error('Error loading monthly trends:', error);
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7E43" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Monthly Trends</Text>
        <Text style={styles.subtitle}>
          View collection trends over time
        </Text>

        {trends.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="trending-up-outline" size={64} color="#E5E5EA" />
            <Text style={styles.emptyText}>No trend data available</Text>
          </View>
        ) : (
          <View style={styles.trendsList}>
            {trends.map((trend) => {
              const collectionRate = trend.total_demand > 0
                ? (trend.total_collection / trend.total_demand) * 100
                : 0;

              return (
                <View key={trend.monthKey} style={styles.trendCard}>
                  <Text style={styles.monthLabel}>{trend.month}</Text>
                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Total Demand</Text>
                      <Text style={styles.metricValue}>{formatCurrency(trend.total_demand)}</Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Total Collection</Text>
                      <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                        {formatCurrency(trend.total_collection)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.metricsRow}>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Collection Rate</Text>
                      <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                        {collectionRate.toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.metric}>
                      <Text style={styles.metricLabel}>Institutions</Text>
                      <Text style={styles.metricValue}>{trend.institutions_count}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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
  emptyContainer: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 16,
  },
  trendsList: {
    gap: 12,
  },
  trendCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  monthLabel: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
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
    color: '#8E8E93',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
  },
});
