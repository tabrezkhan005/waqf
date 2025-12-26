import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import KPICard from '@/components/admin/KPICard';

export default function CollectionsOverviewScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalArrear: 0,
    totalCurrent: 0,
    verifiedCount: 0,
    pendingCount: 0,
  });
  const [collections, setCollections] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

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
      const { data } = await supabase.from('collections').select('arrear_amount, current_amount, status');

      const totalArrear = data?.reduce((sum, c) => sum + Number(c.arrear_amount || 0), 0) || 0;
      const totalCurrent = data?.reduce((sum, c) => sum + Number(c.current_amount || 0), 0) || 0;
      const verifiedCount = data?.filter((c) => c.status === 'verified').length || 0;
      const pendingCount = data?.filter((c) => c.status === 'pending').length || 0;

      setStats({ totalArrear, totalCurrent, verifiedCount, pendingCount });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          arrear_amount,
          current_amount,
          status,
          collection_date,
          institution_id,
          inspector_id,
          institutions(name),
          profiles!collections_inspector_id_fkey(full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setCollections(data || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.content}>
        {/* Summary Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.kpiGrid}>
            <KPICard
              title="Total Arrear"
              value={`₹${(stats.totalArrear / 100000).toFixed(1)}L`}
              icon="cash-outline"
              color="#003D99"
            />
            <KPICard
              title="Total Current"
              value={`₹${(stats.totalCurrent / 100000).toFixed(1)}L`}
              icon="wallet-outline"
              color="#1A9D5C"
            />
            <KPICard
              title="Verified"
              value={stats.verifiedCount}
              icon="checkmark-circle-outline"
              color="#1A9D5C"
            />
            <KPICard
              title="Pending"
              value={stats.pendingCount}
              icon="time-outline"
              color="#FF9500"
            />
          </View>
        </View>

        {/* Charts Placeholder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monthly Trends</Text>
          <View style={styles.chartPlaceholder}>
            <Ionicons name="bar-chart-outline" size={48} color="#E5E5EA" />
            <Text style={styles.chartPlaceholderText}>Chart visualization coming soon</Text>
          </View>
        </View>

        {/* Recent Collections */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Collections</Text>
            <TouchableOpacity onPress={() => router.push('/admin/collections/export')}>
              <Text style={styles.exportLink}>Export</Text>
            </TouchableOpacity>
          </View>
          {collections.length > 0 ? (
            collections.map((collection) => (
              <TouchableOpacity
                key={collection.id}
                style={styles.collectionCard}
                onPress={() => router.push(`/admin/collections/details?id=${collection.id}`)}
              >
                <View style={styles.collectionHeader}>
                  <View>
                    <Text style={styles.collectionInstitution}>
                      {(collection.institutions as any)?.name || 'Unknown Institution'}
                    </Text>
                    <Text style={styles.collectionInspector}>
                      {(collection.profiles as any)?.full_name || 'Unknown Inspector'}
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
                      ₹{Number(collection.arrear_amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Current</Text>
                    <Text style={styles.amountValue}>
                      ₹{Number(collection.current_amount || 0).toLocaleString()}
                    </Text>
                  </View>
                  <View style={styles.amountItem}>
                    <Text style={styles.amountLabel}>Total</Text>
                    <Text style={[styles.amountValue, styles.totalAmount]}>
                      ₹{(
                        Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0)
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No collections found</Text>
            </View>
          )}
        </View>
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chartPlaceholder: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  chartPlaceholderText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 12,
  },
  exportLink: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#003D99',
  },
  collectionCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  collectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  collectionInstitution: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  collectionInspector: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#E5E5EA',
  },
  statusBadgeVerified: {
    backgroundColor: '#1A9D5C15',
  },
  statusBadgePending: {
    backgroundColor: '#FF950015',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
    textTransform: 'capitalize',
  },
  statusTextVerified: {
    color: '#1A9D5C',
  },
  statusTextPending: {
    color: '#FF9500',
  },
  collectionAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
  },
  totalAmount: {
    fontSize: 18,
    color: '#003D99',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
});

























