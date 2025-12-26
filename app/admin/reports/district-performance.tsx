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

interface DistrictPerformance {
  district_name: string;
  total_demand: number;
  total_collection: number;
  collection_rate: number;
  institutions_count: number;
}

export default function DistrictPerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [districtData, setDistrictData] = useState<DistrictPerformance[]>([]);

  useEffect(() => {
    loadDistrictData();
  }, []);

  const loadDistrictData = async () => {
    try {
      setLoading(true);

      // Load all DCB data grouped by district
      const { data: dcbData, error } = await supabase
        .from('institution_dcb')
        .select(`
          district_name,
          d_total,
          c_total,
          institution_name
        `);

      if (error) {
        console.error('Error loading district data:', error);
        setDistrictData([]);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setDistrictData([]);
        return;
      }

      // Aggregate by district
      const districtMap: { [key: string]: DistrictPerformance } = {};

      dcbData.forEach((d) => {
        if (!d.district_name) return;

        if (!districtMap[d.district_name]) {
          districtMap[d.district_name] = {
            district_name: d.district_name,
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
            institutions_count: 0,
          };
        }

        districtMap[d.district_name].total_demand += Number(d.d_total || 0);
        districtMap[d.district_name].total_collection += Number(d.c_total || 0);
        if (d.institution_name) {
          districtMap[d.district_name].institutions_count += 1;
        }
      });

      // Calculate collection rates and convert to array
      const performanceData = Object.values(districtMap).map((district) => ({
        ...district,
        collection_rate: district.total_demand > 0
          ? (district.total_collection / district.total_demand) * 100
          : 0,
      }));

      // Sort by total collection descending
      performanceData.sort((a, b) => b.total_collection - a.total_collection);

      setDistrictData(performanceData);
    } catch (error) {
      console.error('Error loading district data:', error);
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
        <Text style={styles.title}>District Performance</Text>
        <Text style={styles.subtitle}>
          Compare performance across all districts
        </Text>

        {districtData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="bar-chart-outline" size={64} color="#E5E5EA" />
            <Text style={styles.emptyText}>No district data available</Text>
          </View>
        ) : (
          <View style={styles.districtsList}>
            {districtData.map((district, index) => (
              <View key={district.district_name} style={styles.districtCard}>
                <View style={styles.districtHeader}>
                  <Text style={styles.districtName}>{district.district_name}</Text>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Demand</Text>
                    <Text style={styles.metricValue}>{formatCurrency(district.total_demand)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Collection</Text>
                    <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                      {formatCurrency(district.total_collection)}
                    </Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Collection Rate</Text>
                    <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                      {district.collection_rate.toFixed(2)}%
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Institutions</Text>
                    <Text style={styles.metricValue}>{district.institutions_count}</Text>
                  </View>
                </View>
              </View>
            ))}
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
  districtsList: {
    gap: 12,
  },
  districtCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  districtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  districtName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    flex: 1,
  },
  rankBadge: {
    backgroundColor: '#0A7E43',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
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
