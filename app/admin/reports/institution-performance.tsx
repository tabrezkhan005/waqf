import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB } from '@/lib/dcb/district-tables';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

interface InstitutionPerformance {
  institution_id: string;
  institution_name: string;
  ap_no: string | null;
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

      // Load DCB data from all district tables
      const dcbData = await queryAllDistrictDCB('ap_gazette_no, institution_name, demand_total, collection_total');

      if (!dcbData || dcbData.length === 0) {
        setInstitutions([]);
        return;
      }

      const institutionMap: { [key: string]: InstitutionPerformance } = {};

      dcbData.forEach((d: any) => {
        // Use ap_gazette_no as unique identifier
        const key = d.ap_gazette_no || d.institution_name;
        if (!key) return;

        if (!institutionMap[key]) {
          institutionMap[key] = {
            institution_id: key,
            institution_name: d.institution_name || 'Unknown',
            ap_no: d.ap_gazette_no || null,
            district_name: d._district_name || 'Unknown',
            total_demand: 0,
            total_collection: 0,
            collection_rate: 0,
          };
        }

        institutionMap[key].total_demand += Number(d.demand_total || 0);
        institutionMap[key].total_collection += Number(d.collection_total || 0);
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

  const filteredInstitutions = useMemo(() => {
    if (!searchQuery.trim()) return institutions;
    const query = searchQuery.toLowerCase();
    return institutions.filter((inst) => {
      return (
        inst.institution_name.toLowerCase().includes(query) ||
        (inst.ap_no || '').toLowerCase().includes(query) ||
        inst.district_name.toLowerCase().includes(query)
      );
    });
  }, [institutions, searchQuery]);

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
        <AppHeader title="Institution Performance" subtitle="Demand vs Collection" />

        <View style={{ height: theme.spacing.md }} />

        <TextField
          leftIcon="search-outline"
          placeholder="Search by name, AP No, or district..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ height: theme.spacing.md }} />

        {filteredInstitutions.length === 0 ? (
          <EmptyState
            title={searchQuery ? 'No institutions found' : 'No institution data'}
            description={searchQuery ? 'Try a different keyword.' : 'No DCB entries found.'}
            icon="business-outline"
          />
        ) : (
          filteredInstitutions.map((institution) => (
            <Card key={institution.institution_id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{institution.institution_name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {institution.district_name}
                    {institution.ap_no ? ` • AP: ${institution.ap_no}` : ''}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Demand</Text>
                  <Text style={styles.metricValue}>{formatCurrency(institution.total_demand)}</Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Collected</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                    {formatCurrency(institution.total_collection)}
                  </Text>
                </View>
                <View style={styles.metric}>
                  <Text style={styles.metricLabel}>Rate</Text>
                  <Text style={[styles.metricValue, { color: theme.colors.primary }]}>
                    {institution.collection_rate.toFixed(2)}%
                  </Text>
                </View>
              </View>
            </Card>
          ))
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
  rowTop: {
    marginBottom: theme.spacing.md,
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
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  metric: {
    minWidth: '30%',
    flexGrow: 1,
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
