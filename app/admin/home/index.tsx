import ModernChart from '@/components/admin/ModernChart';
import ModernKPICard from '@/components/admin/ModernKPICard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB, queryDistrictDCB, districtNameToTableName, getAggregatedDCBStats } from '@/lib/dcb/district-tables';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
} from 'react-native-reanimated';
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
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadStats(),
        loadDistricts(),
        loadRecentActivities(),
        loadMonthlyTrends(),
      ]);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
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

      setStats({
        totalInstitutions: institutionsCount || 0,
        totalInspectors: inspectorsCount || 0,
        pendingCollections: pendingCount || 0,
        completedCollections: completedCount || 0,
        totalArrearCollected: dcbStats.totalCollectionArrears,
        totalCurrentCollected: dcbStats.totalCollectionCurrent,
        totalCollection: dcbStats.totalCollection,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      const { data: inspectors } = await supabase
        .from('profiles')
        .select('id, full_name, district_id')
        .eq('role', 'inspector');

      const districtPromises = (districtsData || []).map(async (district: any) => {
        const inspector = (inspectors || []).find((i: any) => i.district_id === district.id);

        // Get DCB data for this district from district-specific table
        const dcbData = await queryDistrictDCB(district.name, 'collection_total');
        const totalCollected = dcbData.reduce((sum: number, d: any) => sum + Number(d.collection_total || 0), 0);

        // Get institutions for this district
        const { data: districtInstitutions } = await supabase
          .from('institutions')
          .select('id')
          .eq('district_id', district.id)
          .eq('is_active', true);

        const institutionIds = (districtInstitutions || []).map((i: any) => i.id).filter(Boolean);

        // Get pending collections for this district
        let pendingCount = 0;
        let completedCount = 0;
        if (institutionIds.length > 0) {
          try {
            const { count: pending } = await supabase
              .from('collections')
              .select('*', { count: 'exact', head: true })
              .in('status', ['pending', 'sent_to_accounts'])
              .in('institution_id', institutionIds);

            const { count: completed } = await supabase
              .from('collections')
              .select('*', { count: 'exact', head: true })
              .eq('status', 'verified')
              .in('institution_id', institutionIds);

            pendingCount = pending || 0;
            completedCount = completed || 0;
          } catch (error) {
            console.warn('Error loading collections for district:', district.name, error);
          }
        }

        const { count: instCount } = await supabase
          .from('institutions')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', district.id)
          .eq('is_active', true);

        return {
          id: district.id,
          name: district.name,
          inspectorName: (inspector as any)?.full_name || 'Not Assigned',
          pendingCount: pendingCount,
          completedCount: completedCount,
          totalCollected: totalCollected,
          totalInstitutions: instCount || 0,
        };
      });

      const districtResults = await Promise.all(districtPromises);
      setDistricts(districtResults);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadRecentActivities = async () => {
    try {
      const { data: activities } = await supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentActivities(activities || []);
    } catch (error) {
      console.error('Error loading activities:', error);
      setRecentActivities([]);
    }
  };

  const loadMonthlyTrends = async () => {
    try {
      // Get DCB data from all district tables
      const dcbData = await queryAllDistrictDCB('collection_arrears, collection_current, created_at', {
        orderBy: { column: 'created_at', ascending: false },
        limit: 1000,
      });

      // Group by month
      const monthMap: { [key: string]: { arrear: number; current: number } } = {};

      dcbData.forEach((row: any) => {
        const date = new Date(row.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!monthMap[monthKey]) {
          monthMap[monthKey] = { arrear: 0, current: 0 };
        }
        monthMap[monthKey].arrear += Number(row.collection_arrears || 0);
        monthMap[monthKey].current += Number(row.collection_current || 0);
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
    } catch (error) {
      console.error('Error loading monthly trends:', error);
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
          <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
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
          </Animated.View>

          {/* KPI Cards */}
          <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.section}>
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
        </Animated.View>

        {/* Charts Section */}
        {monthlyData && (
          <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.section}>
            <ModernChart
              type="line"
              title="Monthly Collection Trends"
              data={monthlyData}
              height={240}
              delay={400}
            />
          </Animated.View>
        )}

        {/* Collection Distribution */}
        <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.section}>
          <ModernChart
            type="pie"
            title="Collection Distribution"
            data={pieData}
            height={220}
            delay={600}
          />
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            {[
              { label: 'Add Inspector', icon: 'person-add-outline', route: '/admin/inspectors-institutions/inspectors/add', color: '#0A7E43' },
              { label: 'Add Institution', icon: 'add-circle-outline', route: '/admin/inspectors-institutions/institutions/add', color: '#10B981' },
              { label: 'View Reports', icon: 'bar-chart-outline', route: '/admin/reports', color: '#3B82F6' },
              { label: 'Export Data', icon: 'download-outline', route: '/admin/collections/export', color: '#F59E0B' },
            ].map((action, index) => (
              <Animated.View
                key={action.label}
                entering={ZoomIn.delay(800 + index * 100).duration(400)}
              >
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
              </Animated.View>
            ))}
          </View>
        </Animated.View>

        {/* District Overview */}
        {districts.length > 0 && (
          <Animated.View entering={FadeInUp.delay(1000).duration(600)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>District Overview</Text>
              <TouchableOpacity onPress={() => router.push('/admin/home/district-analytics')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtScroll}>
              {districts.slice(0, 5).map((district, index) => (
                <Animated.View
                  key={district.id}
                  entering={ZoomIn.delay(1000 + index * 100).duration(400)}
                >
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
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>
        )}

        {/* Recent Activity */}
        {recentActivities.length > 0 && (
          <Animated.View entering={FadeInUp.delay(1200).duration(600)} style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <View style={styles.activityList}>
              {recentActivities.map((activity, index) => (
                <Animated.View
                  key={activity.id || index}
                  entering={FadeInUp.delay(1200 + index * 100).duration(400)}
                >
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
                </Animated.View>
              ))}
            </View>
          </Animated.View>
        )}

        {/* Watermark */}
        <Animated.View entering={FadeInUp.delay(1400).duration(600)} style={styles.watermarkContainer}>
          <Text style={styles.watermarkText}>Waqf Board</Text>
        </Animated.View>

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
