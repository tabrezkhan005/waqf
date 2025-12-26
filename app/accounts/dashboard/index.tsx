import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import GreetingHeader from '@/components/shared/GreetingHeader';
import AnimatedKPICard from '@/components/shared/AnimatedKPICard';
import AnimatedChart from '@/components/shared/AnimatedChart';
import type { Collection, CollectionWithRelations, DistrictSummary } from '@/lib/types/database';

interface DashboardStats {
  pendingApprovals: number;
  verifiedToday: number;
  totalVerifiedThisMonth: number;
  rejectedThisMonth: number;
}

export default function AccountsDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    verifiedToday: 0,
    totalVerifiedThisMonth: 0,
    rejectedThisMonth: 0,
  });
  const [districtSummaries, setDistrictSummaries] = useState<DistrictSummary[]>([]);
  const [recentActions, setRecentActions] = useState<CollectionWithRelations[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadDistrictSummaries(),
        loadRecentActions(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthStart = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

      // Load all DCB data
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select('receipt_no, challan_no, c_total, receipt_date, challan_date, created_at, updated_at');

      // Pending approvals (no receipt or challan)
      const pendingCount = dcbData?.filter((d) => !d.receipt_no && !d.challan_no).length || 0;

      // Verified today (has receipt/challan and date is today)
      const verifiedTodayCount = dcbData?.filter((d) => {
        const hasReceipt = d.receipt_no || d.challan_no;
        const receiptDate = d.receipt_date || d.challan_date || d.created_at;
        return hasReceipt && receiptDate && receiptDate.startsWith(today);
      }).length || 0;

      // Verified this month (has receipt/challan and date is this month)
      const verifiedThisMonth = dcbData?.filter((d) => {
        const hasReceipt = d.receipt_no || d.challan_no;
        const receiptDate = d.receipt_date || d.challan_date || d.created_at;
        return hasReceipt && receiptDate && receiptDate >= monthStart;
      }) || [];

      const totalVerified = verifiedThisMonth.reduce(
        (sum, d) => sum + Number(d.c_total || 0),
        0
      );

      // Rejected this month (DCB doesn't track rejected, so 0)
      const rejectedCount = 0;

      setStats({
        pendingApprovals: pendingCount,
        verifiedToday: verifiedTodayCount,
        totalVerifiedThisMonth: totalVerified,
        rejectedThisMonth: rejectedCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDistrictSummaries = async () => {
    try {
      // Get all districts
      const { data: districts } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (!districts) return;

      // Get DCB data for each district (in parallel)
      const summaryPromises = districts.map(async (district) => {
        // Get DCB data for this district (join through institutions)
        const { data: dcbData } = await supabase
          .from('institution_dcb')
          .select(`
            collection_arrears,
            collection_current,
            collection_total,
            institution:institutions!institution_dcb_institution_id_fkey (
              district_id
            )
          `)
          .eq('institution.district_id', district.id);

        // Calculate metrics from DCB data
        const pending = dcbData?.length || 0;
        const verified = 0; // DCB doesn't track verification status
        const arrearAmount = dcbData?.reduce((sum, d) => sum + Number(d.collection_arrears || 0), 0) || 0;
        const currentAmount = dcbData?.reduce((sum, d) => sum + Number(d.collection_current || 0), 0) || 0;

        return {
          district_id: district.id,
          district_name: district.name,
          pending_count: pending,
          verified_count: verified,
          rejected_count: 0,
          verified_amount: 0, // DCB doesn't track verification status
          arrear_amount: arrearAmount,
          current_amount: currentAmount,
        };
      });

      const summaries = await Promise.all(summaryPromises);
      setDistrictSummaries(summaries);
    } catch (error) {
      console.error('Error loading district summaries:', error);
    }
  };

  const loadRecentActions = async () => {
    try {
      // Load recent DCB data
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select(`
          id,
          institution_id,
          institution_name,
          inspector_name,
          receipt_no,
          challan_no,
          c_total,
          receipt_date,
          challan_date,
          created_at,
          updated_at
        `)
        .order('updated_at', { ascending: false })
        .limit(10);

      // Transform DCB data to collection-like format
      const transformed = (dcbData || []).map((d) => ({
        id: d.id,
        institution_id: d.institution_id,
        institution: {
          id: d.institution_id,
          name: d.institution_name || 'Unknown',
          code: null,
        },
        inspector: d.inspector_name ? {
          id: d.inspector_name,
          full_name: d.inspector_name,
        } : null,
        status: d.receipt_no || d.challan_no ? 'verified' : 'pending',
        arrear_amount: 0, // Not available in DCB for recent actions
        current_amount: 0, // Not available in DCB for recent actions
        collection_date: d.receipt_date || d.challan_date || d.created_at,
        updated_at: d.updated_at || d.created_at,
        created_at: d.created_at,
      }));

      setRecentActions(transformed as CollectionWithRelations[]);
    } catch (error) {
      console.error('Error loading recent actions:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return '#1A9D5C';
      case 'rejected':
        return '#FF3B30';
      case 'sent_to_accounts':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  // Prepare chart data
  const approvalsTrendsData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    datasets: [
      {
        data: [
          Math.floor(stats.verifiedToday / 2) || 5,
          Math.floor(stats.verifiedToday / 1.8) || 8,
          Math.floor(stats.verifiedToday / 1.5) || 12,
          Math.floor(stats.verifiedToday / 1.2) || 15,
          Math.floor(stats.verifiedToday / 1.1) || 18,
          stats.verifiedToday || 20,
        ],
        color: () => '#FF9500',
        strokeWidth: 3,
      },
    ],
  };

  const statusDistributionData = [
    {
      name: 'Pending',
      population: stats.pendingApprovals,
      color: '#FF9500',
      legendFontColor: '#2A2A2A',
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Verified',
      population: stats.verifiedToday,
      color: '#1A9D5C',
      legendFontColor: '#2A2A2A',
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
    {
      name: 'Rejected',
      population: stats.rejectedThisMonth,
      color: '#FF3B30',
      legendFontColor: '#2A2A2A',
      legendFontSize: 14,
      legendFontFamily: 'Nunito-SemiBold',
    },
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {profile && <GreetingHeader profile={profile} primaryColor="#FF9500" />}
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.content}>
          {/* KPI Cards */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Verification Overview</Text>
            <View style={styles.cardsGrid}>
              <AnimatedKPICard
                title="Pending Approvals"
                value={stats.pendingApprovals}
                icon="time-outline"
                color="#FF9500"
                onPress={() => router.push('/accounts/approvals')}
                delay={0}
              />
              <AnimatedKPICard
                title="Verified Today"
                value={stats.verifiedToday}
                icon="checkmark-circle-outline"
                color="#1A9D5C"
                onPress={() => router.push('/accounts/approvals?filter=verified_today')}
                delay={100}
              />
              <AnimatedKPICard
                title="Verified This Month"
                value={formatCurrency(stats.totalVerifiedThisMonth)}
                icon="cash-outline"
                color="#003D99"
                onPress={() => router.push('/accounts/reports')}
                delay={200}
              />
              <AnimatedKPICard
                title="Rejected This Month"
                value={stats.rejectedThisMonth}
                icon="close-circle-outline"
                color="#FF3B30"
                onPress={() => router.push('/accounts/reports?filter=rejected')}
                delay={300}
              />
            </View>
          </View>

          {/* Charts Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Approval Analytics</Text>
            <AnimatedChart
              type="bar"
              title="Weekly Verification Progress"
              data={approvalsTrendsData}
              color="#FF9500"
              height={220}
            />
            <AnimatedChart
              type="pie"
              title="Status Distribution"
              data={statusDistributionData}
              height={200}
            />
          </View>

          {/* District Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>District Summary</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
              {districtSummaries.map((district) => (
                <TouchableOpacity
                  key={district.district_id}
                  style={styles.districtCard}
                  onPress={() => router.push(`/accounts/reports/district?districtId=${district.district_id}`)}
                >
                  <Text style={styles.districtName}>{district.district_name}</Text>
                  <View style={styles.districtStats}>
                    <View style={styles.districtStatItem}>
                      <Text style={styles.districtStatLabel}>Pending</Text>
                      <Text style={styles.districtStatValue}>{district.pending_count}</Text>
                    </View>
                    <View style={styles.districtStatItem}>
                      <Text style={styles.districtStatLabel}>Verified</Text>
                      <Text style={[styles.districtStatValue, styles.verifiedAmount]}>
                        {formatCurrency(district.verified_amount)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.ratioContainer}>
                    <Text style={styles.ratioText}>
                      Arrear: {formatCurrency(district.arrear_amount)} | Current: {formatCurrency(district.current_amount)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Recent Actions */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Actions</Text>
              <TouchableOpacity onPress={() => router.push('/accounts/approvals')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentActions.length > 0 ? (
              recentActions.slice(0, 5).map((collection) => (
                <TouchableOpacity
                  key={collection.id}
                  style={styles.actionItem}
                  onPress={() => router.push(`/accounts/approvals/${collection.id}`)}
                >
                  <View style={styles.actionItemLeft}>
                    <Text style={styles.actionInstitution}>
                      {collection.institution?.name || `Institution #${collection.institution_id}`}
                    </Text>
                    <Text style={styles.actionInspector}>
                      Inspector: {collection.inspector?.full_name || 'Unknown'}
                    </Text>
                    <Text style={styles.actionTime}>
                      {new Date(collection.updated_at).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                  <View style={styles.actionItemRight}>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(collection.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(collection.status) }]}>
                        {collection.status.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No recent actions</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FC',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  kpiValue: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginTop: 8,
  },
  kpiLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 4,
    textAlign: 'center',
  },
  districtScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  districtCard: {
    width: 280,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  districtName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  districtStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  districtStatItem: {
    alignItems: 'center',
  },
  districtStatLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  districtStatValue: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  verifiedAmount: {
    color: '#1A9D5C',
  },
  ratioContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  ratioText: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
  actionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actionItemLeft: {
    flex: 1,
  },
  actionInstitution: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  actionInspector: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  actionTime: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  actionItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
  seeAllText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#FF9500',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
});
