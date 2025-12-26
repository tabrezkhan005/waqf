import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';

interface InstitutionPerformance {
  institution_name: string;
  ap_no: string;
  district_name: string;
  total_demand: number;
  total_collection: number;
  collection_rate: number;
}

export default function InstitutionPerformanceScreen() {
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<InstitutionPerformance[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadInstitutionPerformance();
  }, []);

  const loadInstitutionPerformance = async () => {
    try {
      setLoading(true);

      // Load DCB data grouped by institution
      const { data: dcbData, error } = await supabase
        .from('institution_dcb')
        .select(`
          institution_name,
          ap_no,
          district_name,
          d_total,
          c_total
        `)
        .not('institution_name', 'is', null);

      if (error) {
        console.error('Error loading institution performance:', error);
        setInstitutions([]);
        return;
      }

      if (!dcbData || dcbData.length === 0) {
        setInstitutions([]);
        return;
      }

      // Aggregate by institution (using ap_no as unique identifier)
      const institutionMap: { [key: string]: InstitutionPerformance } = {};

      dcbData.forEach((d) => {
        if (!d.ap_no) return;

        if (!institutionMap[d.ap_no]) {
          institutionMap[d.ap_no] = {
            institution_name: d.institution_name || 'Unknown',
            ap_no: d.ap_no,
            district_name: d.district_name || 'Unknown',
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
          };
        }

        institutionMap[d.ap_no].total_demand += Number(d.d_total || 0);
        institutionMap[d.ap_no].total_collection += Number(d.c_total || 0);
      });

      // Calculate collection rates and convert to array
      const performanceData = Object.values(institutionMap).map((institution) => ({
        ...institution,
        collection_rate: institution.total_demand > 0
          ? (institution.total_collection / institution.total_demand) * 100
          : 0,
      }));

      // Sort by total collection descending
      performanceData.sort((a, b) => b.total_collection - a.total_collection);

      setInstitutions(performanceData);
    } catch (error) {
      console.error('Error loading institution performance:', error);
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

  const filteredInstitutions = institutions.filter((inst) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      inst.institution_name.toLowerCase().includes(query) ||
      inst.ap_no.toLowerCase().includes(query) ||
      inst.district_name.toLowerCase().includes(query)
    );
  });

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
        <Text style={styles.title}>Institution Performance</Text>
        <Text style={styles.subtitle}>
          Analyze institution-wise collections and trends
        </Text>

        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, AP No, or district..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {filteredInstitutions.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery ? 'No institutions found' : 'No institution data available'}
            </Text>
          </View>
        ) : (
          <View style={styles.institutionsList}>
            {filteredInstitutions.map((institution) => (
              <View key={institution.ap_no} style={styles.institutionCard}>
                <View style={styles.institutionHeader}>
                  <Text style={styles.institutionName}>{institution.institution_name}</Text>
                  <Text style={styles.apNo}>AP: {institution.ap_no}</Text>
                </View>
                <Text style={styles.districtName}>{institution.district_name}</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Demand</Text>
                    <Text style={styles.metricValue}>{formatCurrency(institution.total_demand)}</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Total Collection</Text>
                    <Text style={[styles.metricValue, { color: '#0A7E43' }]}>
                      {formatCurrency(institution.total_collection)}
                    </Text>
                  </View>
                </View>
                <View style={styles.collectionRateContainer}>
                  <Text style={styles.collectionRateLabel}>Collection Rate</Text>
                  <Text style={[styles.collectionRateValue, { color: '#0A7E43' }]}>
                    {institution.collection_rate.toFixed(2)}%
                  </Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
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
  institutionsList: {
    gap: 12,
  },
  institutionCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  institutionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  institutionName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    flex: 1,
    marginRight: 8,
  },
  apNo: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  districtName: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
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
  collectionRateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  collectionRateLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  collectionRateValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
});
