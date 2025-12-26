import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase/client';

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

      // Load DCB data grouped by inspector
      const { data: dcbData, error } = await supabase
        .from('institution_dcb')
        .select(`
          inspector_name,
          district_name,
          d_total,
          c_total,
          institution_name
        `)
        .not('inspector_name', 'is', null);

      if (error) {
        console.error('Error loading inspector performance:', error);
        setInspectors([]);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setInspectors([]);
        return;
      }

      // Aggregate by inspector
      const inspectorMap: { [key: string]: InspectorPerformance } = {};

      dcbData.forEach((d) => {
        if (!d.inspector_name) return;

        const key = `${d.inspector_name}_${d.district_name || 'Unknown'}`;

        if (!inspectorMap[key]) {
          inspectorMap[key] = {
            inspector_name: d.inspector_name,
            district_name: d.district_name || 'Unknown',
            institutions_count: 0,
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
          };
        }

        inspectorMap[key].total_demand += Number(d.d_total || 0);
        inspectorMap[key].total_collection += Number(d.c_total || 0);
        if (d.institution_name) {
          inspectorMap[key].institutions_count += 1;
        }
      });

      // Calculate collection rates and convert to array
      const performanceData = Object.values(inspectorMap).map((inspector) => ({
        ...inspector,
        collection_rate: inspector.total_demand > 0
          ? (inspector.total_collection / inspector.total_demand) * 100
          : 0,
      }));

      // Sort by total collection descending
      performanceData.sort((a, b) => b.total_collection - a.total_collection);

      setInspectors(performanceData);
    } catch (error) {
      console.error('Error loading inspector performance:', error);
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
        <Text style={styles.title}>Inspector Performance</Text>
        <Text style={styles.subtitle}>
          Rankings and efficiency metrics for all inspectors
        </Text>

        {inspectors.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No inspector data available</Text>
          </View>
        ) : (
          <View style={styles.inspectorsList}>
            {inspectors.map((inspector, index) => (
              <View key={`${inspector.inspector_name}_${index}`} style={styles.inspectorCard}>
                <View style={styles.inspectorHeader}>
                  <View style={styles.rankBadge}>
                    <Text style={styles.rankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.inspectorInfo}>
                    <Text style={styles.inspectorName}>{inspector.inspector_name}</Text>
                    <Text style={styles.inspectorDistrict}>{inspector.district_name}</Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Institutions</Text>
                    <Text style={styles.metricValue}>{inspector.institutions_count}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Demand</Text>
                    <Text style={styles.metricValue}>{formatCurrency(inspector.total_demand)}</Text>
                  </View>
                </View>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Collection</Text>
                    <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                      {formatCurrency(inspector.total_collection)}
                    </Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Collection Rate</Text>
                    <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                      {inspector.collection_rate.toFixed(2)}%
                    </Text>
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
  },
  inspectorsList: {
    gap: 12,
  },
  inspectorCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rankBadge: {
    backgroundColor: '#0A7E43',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  inspectorDistrict: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
