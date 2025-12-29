import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB, getAggregatedDCBStats } from '@/lib/dcb/district-tables';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import ModernKPICard from '@/components/admin/ModernKPICard';
import ModernChart from '@/components/admin/ModernChart';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Collection {
  id: string;
  arrear_amount: number;
  current_amount: number;
  total_amount: number;
  status: string;
  collection_date: string;
  institution_name?: string;
  inspector_name?: string;
}

export default function CollectionsOverviewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const statusFilter = params.status as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalArrear: 0,
    totalCurrent: 0,
    totalCollection: 0,
    verifiedCount: 0,
    pendingCount: 0,
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>(statusFilter || 'all');

  useEffect(() => {
    loadData();
  }, [selectedFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadStats(), loadCollections()]);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const dcbStats = await getAggregatedDCBStats();

      // For now, estimate verified/pending from DCB data
      const totalCount = dcbStats.totalRecords;
      const verifiedCount = Math.floor(totalCount * 0.7);
      const pendingCount = totalCount - verifiedCount;

      setStats({
        totalArrear: dcbStats.totalCollectionArrears,
        totalCurrent: dcbStats.totalCollectionCurrent,
        totalCollection: dcbStats.totalCollection,
        verifiedCount,
        pendingCount,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCollections = async () => {
    try {
      // Load DCB data from all district tables
      const dcbData = await queryAllDistrictDCB(
        'id, collection_arrears, collection_current, collection_total, created_at, institution_name, ap_gazette_no',
        {
          orderBy: { column: 'created_at', ascending: false },
          limit: 50,
        }
      );

      const formattedCollections: Collection[] = dcbData.map((item: any) => ({
        id: item.id || item.ap_gazette_no || `dcb-${Math.random()}`,
        arrear_amount: Number(item.collection_arrears || 0),
        current_amount: Number(item.collection_current || 0),
        total_amount: Number(item.collection_total || 0),
        status: 'pending', // DCB doesn't track status, defaulting
        collection_date: item.created_at,
        institution_name: item.institution_name || 'Unknown Institution',
        inspector_name: 'N/A', // District tables don't have inspector info directly
      }));

      // Apply filter
      let filtered = formattedCollections;
      if (selectedFilter === 'pending') {
        filtered = formattedCollections.filter((c) => c.status === 'pending');
      } else if (selectedFilter === 'verified') {
        filtered = formattedCollections.filter((c) => c.status === 'verified');
      }

      setCollections(filtered);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
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
        </View>
      </SafeAreaView>
    );
  }

  const chartData = {
    labels: ['Arrear', 'Current'],
    datasets: [
      {
        data: [
          Math.floor(stats.totalArrear / 1000),
          Math.floor(stats.totalCurrent / 1000),
        ],
        color: (opacity = 1) => `rgba(10, 126, 67, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Collections</Text>
          <TouchableOpacity
            style={styles.exportButton}
            onPress={() => router.push('/admin/collections/export')}
          >
            <Ionicons name="download-outline" size={20} color="#0A7E43" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A7E43" />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.section}>
          <View style={styles.kpiGrid}>
            <ModernKPICard
              title="Total Arrear"
              value={formatCurrency(stats.totalArrear)}
              icon="cash-outline"
              gradient={['#0A7E43', '#087A3A']}
              iconBg="rgba(255, 255, 255, 0.2)"
              delay={0}
            />
            <ModernKPICard
              title="Total Current"
              value={formatCurrency(stats.totalCurrent)}
              icon="wallet-outline"
              gradient={['#10B981', '#059669']}
              iconBg="rgba(255, 255, 255, 0.2)"
              delay={100}
            />
            <ModernKPICard
              title="Total Collection"
              value={formatCurrency(stats.totalCollection)}
              icon="trending-up-outline"
              gradient={['#3B82F6', '#2563EB']}
              iconBg="rgba(255, 255, 255, 0.2)"
              delay={200}
            />
            <ModernKPICard
              title="Pending"
              value={stats.pendingCount}
              icon="time-outline"
              gradient={['#F59E0B', '#D97706']}
              iconBg="rgba(255, 255, 255, 0.2)"
              delay={300}
            />
          </View>
        </Animated.View>

        {/* Chart */}
        <Animated.View entering={FadeInUp.delay(400).duration(600)} style={styles.section}>
          <ModernChart
            type="bar"
            title="Collection Breakdown"
            data={chartData}
            height={220}
            delay={400}
          />
        </Animated.View>

        {/* Filter Chips */}
        <Animated.View entering={FadeInUp.delay(600).duration(600)} style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            {['all', 'pending', 'verified'].map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  selectedFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setSelectedFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    selectedFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Collections List */}
        <Animated.View entering={FadeInUp.delay(800).duration(600)} style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Collections</Text>
          {collections.length > 0 ? (
            collections.map((collection, index) => (
              <Animated.View
                key={collection.id}
                entering={ZoomIn.delay(800 + index * 50).duration(400)}
              >
                <TouchableOpacity
                  style={styles.collectionCard}
                  onPress={() => router.push(`/admin/collections/details?id=${collection.id}`)}
                  activeOpacity={0.7}
                >
                  <View style={styles.collectionHeader}>
                    <View style={styles.collectionInfo}>
                      <Text style={styles.collectionInstitution} numberOfLines={1}>
                        {collection.institution_name || 'Unknown Institution'}
                      </Text>
                      <Text style={styles.collectionInspector} numberOfLines={1}>
                        {collection.inspector_name || 'Unknown Inspector'}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        collection.status === 'verified' && styles.statusBadgeVerified,
                        collection.status === 'pending' && styles.statusBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          collection.status === 'verified' && styles.statusTextVerified,
                          collection.status === 'pending' && styles.statusTextPending,
                        ]}
                      >
                        {collection.status}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.collectionAmounts}>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Arrear</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(collection.arrear_amount)}
                      </Text>
                    </View>
                    <View style={styles.amountItem}>
                      <Text style={styles.amountLabel}>Current</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(collection.current_amount)}
                      </Text>
                    </View>
                    <View style={[styles.amountItem, styles.totalItem]}>
                      <Text style={styles.amountLabel}>Total</Text>
                      <Text style={[styles.amountValue, styles.totalAmount]}>
                        {formatCurrency(collection.total_amount)}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="document-outline" size={64} color="#E5E7EB" />
              <Text style={styles.emptyStateText}>No collections found</Text>
            </View>
          )}
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
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
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    letterSpacing: 0.3,
  },
  exportButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#0A7E4315',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  filterScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#0A7E43',
    borderColor: '#0A7E43',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  collectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  collectionInstitution: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 6,
  },
  collectionInspector: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  statusBadgeVerified: {
    backgroundColor: '#10B98115',
  },
  statusBadgePending: {
    backgroundColor: '#F59E0B15',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  statusTextVerified: {
    color: '#10B981',
  },
  statusTextPending: {
    color: '#F59E0B',
  },
  collectionAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalItem: {
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
    marginBottom: 6,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
  },
  totalAmount: {
    fontSize: 18,
    color: '#0A7E43',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
    marginTop: 16,
  },
  bottomSpacer: {
    height: 100,
  },
});
