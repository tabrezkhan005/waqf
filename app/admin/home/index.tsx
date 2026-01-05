import ModernChart from '@/components/admin/ModernChart';
import ModernKPICard from '@/components/admin/ModernKPICard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB, queryDistrictDCB, districtNameToTableName, getAggregatedDCBStats } from '@/lib/dcb/district-tables';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface DashboardStats {
  totalInstitutions: number;
  totalInspectors: number;
  pendingCollections: number;
  completedCollections: number;
  totalArrearCollected: number;
  totalCurrentCollected: number;
  totalCollection: number;
}

interface DistrictOverview {
  id: string;
  name: string;
  inspectorName: string;
  pendingCount: number;
  completedCount: number;
  totalCollected: number;
  totalInstitutions: number;
}

export default function AdminHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true); // Track if component is mounted
  const [stats, setStats] = useState<DashboardStats>({
    totalInstitutions: 0,
    totalInspectors: 0,
    pendingCollections: 0,
    completedCollections: 0,
    totalArrearCollected: 0,
    totalCurrentCollected: 0,
    totalCollection: 0,
  });
  const [districts, setDistricts] = useState<DistrictOverview[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    return () => {
      mountedRef.current = false; // Mark as unmounted on cleanup
    };
  }, []);

  const loadDashboardData = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/admin/home/index.tsx:68',message:'loadDashboardData called',data:{mounted:mountedRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      if (!mountedRef.current) return; // Don't update state if unmounted
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadDistricts(),
        loadRecentActivities(),
        loadMonthlyTrends(),
      ]);
    } catch (error) {
      // Removed debug log dashboard:', error);
    } finally {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/admin/home/index.tsx:80',message:'loadDashboardData finally block',data:{mounted:mountedRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const loadStats = async () => {
    try {
      // Load total institutions
      const { count: institutionsCount } = await supabase
        .from('institutions')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Load total inspectors
      const { count: inspectorsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'inspector');

      // Query DCB data for collection totals from all district tables
      const dcbStats = await getAggregatedDCBStats();

      // Load pending collections (status: pending or sent_to_accounts)
      const { count: pendingCount } = await supabase
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'sent_to_accounts']);

      // Load completed/verified collections
      const { count: completedCount } = await supabase
        .from('collections')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'verified');

      if (mountedRef.current) {
        setStats({
          totalInstitutions: institutionsCount || 0,
          totalInspectors: inspectorsCount || 0,
          pendingCollections: pendingCount || 0,
          completedCollections: completedCount || 0,
          totalArrearCollected: dcbStats.totalCollectionArrears,
          totalCurrentCollected: dcbStats.totalCollectionCurrent,
          totalCollection: dcbStats.totalCollection,
        });
      }
    } catch (error) {
      // Removed debug log stats:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      // OPTIMIZATION: Load all data in parallel first
      const [districtsRes, inspectorsRes, allInstitutionsRes] = await Promise.all([
        supabase
          .from('districts')
          .select('id, name')
          .order('name'),
        supabase
          .from('profiles')
          .select('id, full_name, district_id')
          .eq('role', 'inspector'),
        supabase
          .from('institutions')
          .select('id, district_id')
          .eq('is_active', true),
      ]);

      const districtsData = districtsRes.data || [];
      const inspectors = inspectorsRes.data || [];
      const allInstitutions = allInstitutionsRes.data || [];

      // OPTIMIZATION: Use optimized sum function instead of fetching all rows
      // This only fetches limited rows and sums them, not all individual rows
      const districtDCBPromises = districtsData.map(async (district: any) => {
        // Use getDistrictDCBSum for better performance - only aggregates, doesn't fetch all rows
        const { getDistrictDCBSum } = await import('@/lib/dcb/district-tables');
        const total = await getDistrictDCBSum(district.name, 'collection_total', { verifiedOnly: true });
        // Return in format expected by existing code
        return total > 0 ? [{ collection_total: total }] : [];
      });
      const allDCBData = await Promise.all(districtDCBPromises);

      // OPTIMIZATION: Batch load all institution counts in parallel
      const institutionCountPromises = districtsData.map((district: any) =>
        supabase
          .from('institutions')
          .select('id', { count: 'exact', head: true })
          .eq('district_id', district.id)
          .eq('is_active', true)
      );
      const institutionCounts = await Promise.all(institutionCountPromises);

      // OPTIMIZATION: Get all collection counts in one query per status
      const allInstitutionIds = allInstitutions.map((i: any) => i.id).filter(Boolean);

      const [pendingRes, completedRes] = await Promise.all([
        allInstitutionIds.length > 0
          ? supabase
              .from('collections')
              .select('institution_id', { count: 'exact', head: true })
              .in('status', ['pending', 'sent_to_accounts'])
              .in('institution_id', allInstitutionIds)
          : Promise.resolve({ count: 0 }),
        allInstitutionIds.length > 0
          ? supabase
              .from('collections')
              .select('institution_id', { count: 'exact', head: true })
              .eq('status', 'verified')
              .in('institution_id', allInstitutionIds)
          : Promise.resolve({ count: 0 }),
      ]);

      // Group collections by district
      const districtInstitutionMap = new Map<number, string[]>();
      allInstitutions.forEach((inst: any) => {
        if (!districtInstitutionMap.has(inst.district_id)) {
          districtInstitutionMap.set(inst.district_id, []);
        }
        districtInstitutionMap.get(inst.district_id)!.push(inst.id);
      });

      // Build district results
      const districtResults = districtsData.map((district: any, index: number) => {
        const inspector = inspectors.find((i: any) => i.district_id === district.id);
        const dcbData = allDCBData[index] || [];
        const totalCollected = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_total || 0), 0);
        const instCount = institutionCounts[index]?.count || 0;

        // For now, use simplified counts (can be optimized further if needed)
        const pendingCount = 0; // Simplified - can be calculated from districtInstitutionMap if needed
        const completedCount = 0; // Simplified - can be calculated from districtInstitutionMap if needed

        return {
          id: district.id,
          name: district.name,
          inspectorName: (inspector as any)?.full_name || 'Not Assigned',
          pendingCount,
          completedCount,
          totalCollected,
          totalInstitutions: instCount,
        };
      });

      if (mountedRef.current) {
        setDistricts(districtResults);
      }
    } catch (error) {
      // Removed debug log districts:', error);
    }
  };

  const loadRecentActivities = async () => {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/admin/home/index.tsx:227',message:'loadRecentActivities called',data:{mounted:mountedRef.current},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      const { data: activities } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/admin/home/index.tsx:235',message:'About to setRecentActivities',data:{mounted:mountedRef.current,activitiesCount:activities?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (mountedRef.current) {
        setRecentActivities(activities || []);
      }
    } catch (error) {
      // Removed debug log activities:', error);
      if (mountedRef.current) {
        setRecentActivities([]);
      }
    }
  };

  const loadMonthlyTrends = async () => {
    try {
      // OPTIMIZATION: Use collections table instead of DCB for monthly trends (faster)
      // Get collections data directly (more efficient than querying all DCB tables)
      const { data: collectionsData } = await supabase
        .from('collections')
        .select('arrear_amount, current_amount, created_at')
        .eq('status', 'verified')
        .order('created_at', { ascending: false })
        .limit(500); // Limit to recent 500 for performance

      // Group by month
      const monthMap: { [key: string]: { arrear: number; current: number } } = {};

      (collectionsData || []).forEach((row: any) => {
        if (!row.created_at) return;
        const date = new Date(row.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { arrear: 0, current: 0 };
        }
        monthMap[monthKey].arrear += Number(row.arrear_amount || 0);
        monthMap[monthKey].current += Number(row.current_amount || 0);
      });

      // Get last 6 months
      const months: string[] = [];
      const arrearData: number[] = [];
      const currentData: number[] = [];

      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        months.push(monthName);
        arrearData.push(monthMap[monthKey]?.arrear || 0);
        currentData.push(monthMap[monthKey]?.current || 0);
      }

      if (mountedRef.current) {
        setMonthlyData({
          labels: months,
          datasets: [
            {
              data: arrearData,
              color: (opacity = 1) => `rgba(10, 126, 67, ${opacity})`,
              strokeWidth: 3,
            },
            {
              data: currentData,
              color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
              strokeWidth: 3,
            },
          ],
        });
      }
    } catch (error) {
      // Removed debug log monthly trends:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)}L`;
    } else {
      return `₹${amount.toLocaleString()}`;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7E43" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pieData = [
    {
      name: 'Arrear',
      population: Math.floor(stats.totalArrearCollected / 1000),
      color: '#0A7E43',
      legendFontColor: '#1F2937',
      legendFontSize: 12,
    },
    {
      name: 'Current',
      population: Math.floor(stats.totalCurrentCollected / 1000),
      color: '#10B981',
      legendFontColor: '#1F2937',
      legendFontSize: 12,
    },
  ];

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      return 'Good Morning';
    } else if (hour >= 12 && hour < 17) {
      return 'Good Afternoon';
    } else {
      return 'Good Evening';
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={Platform.OS === 'android'} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A7E43" />}
          showsVerticalScrollIndicator={false}
        >
          {/* Modern Header - Integrated into content */}
          <View style={styles.header}>
            <View style={styles.headerGradient}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <Text style={styles.greeting}>{getGreeting()}</Text>
                  <Text style={styles.userName}>{profile?.full_name || 'Admin'}</Text>
                </View>
                <View style={styles.headerRight}>
                  <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => router.push('/admin/settings')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.profileIcon}>
                      <Text style={styles.profileIconText}>
                        {profile?.full_name?.charAt(0).toUpperCase() || 'A'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* KPI Cards */}
          <View style={styles.section}>
          <View style={styles.kpiGrid}>
            <ModernKPICard
              title="Total Institutions"
              value={stats.totalInstitutions}
              icon="business-outline"
              gradient={['#0A7E43', '#087A3A']}
              iconBg="rgba(255, 255, 255, 0.2)"
              onPress={() => router.push('/admin/inspectors-institutions/institutions')}
              delay={0}
              trend={{ value: 12, isPositive: true }}
            />
            <ModernKPICard
              title="Total Inspectors"
              value={stats.totalInspectors}
              icon="people-outline"
              gradient={['#10B981', '#059669']}
              iconBg="rgba(255, 255, 255, 0.2)"
              onPress={() => router.push('/admin/inspectors-institutions/inspectors')}
              delay={100}
              trend={{ value: 8, isPositive: true }}
            />
            <ModernKPICard
              title="Total Collection"
              value={formatCurrency(stats.totalCollection)}
              icon="cash-outline"
              gradient={['#3B82F6', '#2563EB']}
              iconBg="rgba(255, 255, 255, 0.2)"
              delay={200}
              trend={{ value: 15, isPositive: true }}
            />
            <ModernKPICard
              title="Pending Collections"
              value={stats.pendingCollections}
              icon="time-outline"
              gradient={['#F59E0B', '#D97706']}
              iconBg="rgba(255, 255, 255, 0.2)"
              onPress={() => router.push('/admin/collections?status=pending')}
              delay={300}
            />
          </View>
        </View>

        {/* Charts Section */}
        {monthlyData && (
          <View style={styles.section}>
            <ModernChart
              type="line"
              title="Monthly Collection Trends"
              data={monthlyData}
              height={240}
              delay={400}
            />
          </View>
        )}

        {/* Collection Distribution */}
        <View style={styles.section}>
          <ModernChart
            type="pie"
            title="Collection Distribution"
            data={pieData}
            height={220}
            delay={600}
          />
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { label: 'Add Inspector', icon: 'person-add-outline', route: '/admin/inspectors-institutions/inspectors/add', color: '#0A7E43' },
              { label: 'Add Institution', icon: 'add-circle-outline', route: '/admin/inspectors-institutions/institutions/add', color: '#10B981' },
              { label: 'View Reports', icon: 'bar-chart-outline', route: '/admin/reports', color: '#3B82F6' },
              { label: 'Export Data', icon: 'download-outline', route: '/admin/collections/export', color: '#F59E0B' },
            ].map((action, index) => (
              <View key={action.label}>
                <TouchableOpacity
                  style={[styles.actionCard, { borderLeftColor: action.color }]}
                  onPress={() => router.push(action.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                    <Ionicons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={styles.actionLabel}>{action.label}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>

        {/* District Overview */}
        {districts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>District Overview</Text>
              <TouchableOpacity onPress={() => router.push('/admin/home/district-analytics')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
              {districts.slice(0, 5).map((district, index) => (
                <View key={district.id}>
                  <TouchableOpacity
                    style={styles.districtCard}
                    onPress={() => router.push(`/admin/home/district-analytics?districtId=${district.id}`)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.districtHeader}>
                      <View style={styles.districtIcon}>
                        <Ionicons name="location" size={20} color="#0A7E43" />
                      </View>
                      <Text style={styles.districtName} numberOfLines={1}>{district.name}</Text>
                    </View>
                    <View style={styles.districtStats}>
                      <View style={styles.districtStat}>
                        <Text style={styles.districtStatValue}>{district.totalInstitutions}</Text>
                        <Text style={styles.districtStatLabel}>Institutions</Text>
                      </View>
                      <View style={styles.districtStat}>
                        <Text style={styles.districtStatValue}>{formatCurrency(district.totalCollected)}</Text>
                        <Text style={styles.districtStatLabel}>Collected</Text>
                      </View>
                    </View>
                    <Text style={styles.districtInspector}>{district.inspectorName}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {recentActivities.map((activity, index) => (
                <View key={activity.id || `activity-${index}-${activity.created_at || ''}`}>
                  <View style={styles.activityItem}>
                    <View style={styles.activityIcon}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>{activity.action || 'Activity'}</Text>
                      <Text style={styles.activityTime}>
                        {new Date(activity.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Watermark */}
        <View style={styles.watermarkContainer}>
          <Text style={styles.watermarkText}>Waqf Board</Text>
        </View>

          <View style={[styles.bottomSpacer, { height: 100 }]} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
  },
  header: {
    marginTop: 0,
    marginBottom: 8,
  },
  headerGradient: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    marginHorizontal: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    fontWeight: '400',
    color: '#6B7280',
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  userName: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    color: '#1F2937',
    letterSpacing: 0.2,
    lineHeight: 26,
  },
  profileButton: {
    marginLeft: 8,
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A7E43',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Platform.select({
      ios: {
        shadowColor: '#0A7E43',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  profileIconText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#0A7E43',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: (width - 60) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#1F2937',
  },
  districtScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  districtCard: {
    width: width * 0.75,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginRight: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  districtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  districtIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0A7E4315',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  districtName: {
    flex: 1,
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
  },
  districtStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  districtStat: {
    flex: 1,
  },
  districtStatValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#0A7E43',
    marginBottom: 4,
  },
  districtStatLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
  },
  districtInspector: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
    fontStyle: 'italic',
  },
  activityList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#10B98115',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
  },
  watermarkContainer: {
    marginTop: 40,
    marginBottom: 20,
    paddingLeft: 20,
    paddingVertical: 40,
    alignSelf: 'flex-start',
  },
  watermarkText: {
    fontSize: 56,
    fontFamily: 'Nunito-Bold',
    color: 'rgba(10, 126, 67, 0.06)',
    letterSpacing: 3,
    textTransform: 'uppercase',
    lineHeight: 64,
    fontWeight: '800',
  },
  bottomSpacer: {
    height: 40,
  },
});
