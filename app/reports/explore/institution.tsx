import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import AnimatedChart from '@/components/shared/AnimatedChart';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';
import { queryAllDistrictDCB, districtNameToTableName } from '@/lib/dcb/district-tables';

export default function InstitutionDetailScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const institutionId = params.institutionId as string | null;
  const apGazetteNo = params.apGazetteNo as string | null;

  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<{
    id: string;
    name: string;
    ap_gazette_no: string | null;
    district_id: string | null;
    district_name: string | null;
  } | null>(null);
  const [dcbData, setDcbData] = useState<any | null>(null);
  const [monthlyTotals, setMonthlyTotals] = useState<Array<{ month: string; total: number }>>([]);

  useEffect(() => {
    if (institutionId || apGazetteNo) {
      loadInstitutionData();
    }
  }, [institutionId, apGazetteNo]);

  const loadInstitutionData = async () => {
    try {
      setLoading(true);

      // Load institution
      let institutionData: any = null;
      if (institutionId) {
        const { data, error } = await supabase
          .from('institutions')
          .select(`
            id,
            name,
            ap_gazette_no,
            district_id,
            district:districts (
              id,
              name
            )
          `)
          .eq('id', institutionId)
          .single();

        if (error) throw error;
        institutionData = data;
      } else if (apGazetteNo) {
        // Search by AP Gazette No across all institutions
        const { data, error } = await supabase
          .from('institutions')
          .select(`
            id,
            name,
            ap_gazette_no,
            district_id,
            district:districts (
              id,
              name
            )
          `)
          .eq('ap_gazette_no', apGazetteNo)
          .single();

        if (error) throw error;
        institutionData = data;
      }

      if (!institutionData) {
        console.error('Institution not found');
        return;
      }

      const district = institutionData.district as { id: string; name: string } | null;
      setInstitution({
        id: institutionData.id,
        name: institutionData.name,
        ap_gazette_no: institutionData.ap_gazette_no,
        district_id: institutionData.district_id,
        district_name: district?.name || null,
      });

      // Load DCB data from district-specific table
      if (district?.name && institutionData.ap_gazette_no) {
        const tableName = districtNameToTableName(district.name);
        const { data: dcb, error: dcbError } = await supabase
          .from(tableName)
          .select('*')
          .eq('ap_gazette_no', institutionData.ap_gazette_no)
          .single();

        if (dcbError && dcbError.code !== 'PGRST116') {
          console.error('Error loading DCB data:', dcbError);
        } else if (dcb) {
          setDcbData(dcb);
        }
      }
    } catch (error) {
      console.error('Error loading institution data:', error);
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
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.secondary} />
        </View>
      </Screen>
    );
  }

  if (!institution) {
    return (
      <Screen>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Institution not found</Text>
        </View>
      </Screen>
    );
  }

  const demandArrears = Number(dcbData?.demand_arrears || 0);
  const demandCurrent = Number(dcbData?.demand_current || 0);
  const demandTotal = Number(dcbData?.demand_total || 0);
  const collectionArrears = Number(dcbData?.collection_arrears || 0);
  const collectionCurrent = Number(dcbData?.collection_current || 0);
  const collectionTotal = Number(dcbData?.collection_total || 0);
  const balanceArrears = Number(dcbData?.balance_arrears || 0);
  const balanceCurrent = Number(dcbData?.balance_current || 0);
  const balanceTotal = Number(dcbData?.balance_total || 0);

  const collectionRate = demandTotal > 0 ? (collectionTotal / demandTotal) * 100 : 0;

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader
          title={institution.name}
          subtitle={institution.district_name || 'Unknown District'}
          rightActions={[
            { icon: 'search-outline', onPress: () => router.push('/reports/explore'), accessibilityLabel: 'Explore' },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.kpiGrid}>
          {[
            { title: 'Demand Arrears', value: formatCurrency(demandArrears), icon: 'trending-up-outline' as const, color: theme.colors.danger },
            { title: 'Demand Current', value: formatCurrency(demandCurrent), icon: 'trending-down-outline' as const, color: theme.colors.primary },
            { title: 'Total Demand', value: formatCurrency(demandTotal), icon: 'cash-outline' as const, color: theme.colors.secondary },
            { title: 'Collection Rate', value: `${collectionRate.toFixed(1)}%`, icon: 'stats-chart-outline' as const, color: theme.colors.success },
          ].map((kpi) => (
            <Card key={kpi.title} style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <View style={[styles.kpiIcon, { backgroundColor: `${kpi.color}15`, borderColor: `${kpi.color}30` }]}>
                  <Ionicons name={kpi.icon} size={18} color={kpi.color} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{kpi.value}</Text>
              <Text style={styles.kpiLabel}>{kpi.title}</Text>
            </Card>
          ))}
        </View>

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.dcbCard}>
          <Text style={styles.sectionTitle}>DCB Summary</Text>
          <View style={styles.dcbRow}>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>Collection Arrears</Text>
              <Text style={styles.dcbValue}>{formatCurrency(collectionArrears)}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>Collection Current</Text>
              <Text style={styles.dcbValue}>{formatCurrency(collectionCurrent)}</Text>
            </View>
          </View>
          <View style={styles.dcbRow}>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>Total Collection</Text>
              <Text style={[styles.dcbValue, { color: theme.colors.success }]}>{formatCurrency(collectionTotal)}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>Balance Total</Text>
              <Text style={[styles.dcbValue, { color: theme.colors.danger }]}>{formatCurrency(balanceTotal)}</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="document-text-outline" size={20} color={theme.colors.muted} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>AP Gazette No</Text>
              <Text style={styles.infoValue}>{institution.ap_gazette_no || 'N/A'}</Text>
            </View>
          </View>
          {institution.district_name && (
            <View style={styles.infoRow}>
              <Ionicons name="location-outline" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>District</Text>
                <Text style={styles.infoValue}>{institution.district_name}</Text>
              </View>
            </View>
          )}
          {dcbData?.mandal && (
            <View style={styles.infoRow}>
              <Ionicons name="map-outline" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Mandal</Text>
                <Text style={styles.infoValue}>{dcbData.mandal}</Text>
              </View>
            </View>
          )}
          {dcbData?.village && (
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={20} color={theme.colors.muted} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Village</Text>
                <Text style={styles.infoValue}>{dcbData.village}</Text>
              </View>
            </View>
          )}
        </Card>

        {dcbData?.remarks && (
          <>
            <View style={{ height: theme.spacing.md }} />
            <Card style={styles.remarksCard}>
              <Text style={styles.remarksLabel}>Remarks</Text>
              <Text style={styles.remarksText}>{dcbData.remarks}</Text>
            </Card>
          </>
        )}

        <View style={{ height: theme.spacing.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 60,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  kpiCard: {
    width: '48%',
    padding: theme.spacing.md,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.xs,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 4,
  },
  kpiLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  dcbCard: {
    padding: theme.spacing.lg,
  },
  dcbRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  dcbItem: {
    flex: 1,
  },
  dcbLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  dcbValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
  infoCard: {
    padding: theme.spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 2,
  },
  infoValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: theme.colors.text,
  },
  remarksCard: {
    padding: theme.spacing.lg,
  },
  remarksLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  remarksText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: theme.colors.muted,
    lineHeight: 20,
  },
});




