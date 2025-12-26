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

interface Query {
  id: number;
  inspector_name: string;
  district: string;
  issue: string;
  status: 'open' | 'resolved';
  timestamp: string;
}

export default function QueriesScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [queries, setQueries] = useState<Query[]>([]);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    loadQueries();
  }, []);

  const loadQueries = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual Supabase query when queries table is created
      setQueries([
        {
          id: 1,
          inspector_name: 'John Doe',
          district: 'District 1',
          issue: 'Unable to upload receipt image',
          status: 'open',
          timestamp: new Date().toISOString(),
        },
        {
          id: 2,
          inspector_name: 'Jane Smith',
          district: 'District 2',
          issue: 'Wrong amount collected - need correction',
          status: 'open',
          timestamp: new Date().toISOString(),
        },
        {
          id: 3,
          inspector_name: 'Mike Johnson',
          district: 'District 3',
          issue: 'Institution not found in list',
          status: 'resolved',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error('Error loading queries:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadQueries();
    setRefreshing(false);
  };

  const filteredQueries = queries.filter((q) => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text
            style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}
          >
            All ({queries.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'open' && styles.filterTabActive]}
          onPress={() => setFilter('open')}
        >
          <Text
            style={[styles.filterTabText, filter === 'open' && styles.filterTabTextActive]}
          >
            Open ({queries.filter((q) => q.status === 'open').length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'resolved' && styles.filterTabActive]}
          onPress={() => setFilter('resolved')}
        >
          <Text
            style={[styles.filterTabText, filter === 'resolved' && styles.filterTabTextActive]}
          >
            Resolved ({queries.filter((q) => q.status === 'resolved').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Queries List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredQueries.length > 0 ? (
          filteredQueries.map((query) => (
            <TouchableOpacity
              key={query.id}
              style={styles.queryCard}
              onPress={() => router.push(`/admin/settings/query-details?id=${query.id}`)}
            >
              <View style={styles.queryHeader}>
                <View style={styles.queryInfo}>
                  <Text style={styles.inspectorName}>{query.inspector_name}</Text>
                  <View style={styles.queryMeta}>
                    <Ionicons name="location-outline" size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{query.district}</Text>
                    <Text style={styles.metaText}> • </Text>
                    <Text style={styles.metaText}>
                      {new Date(query.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    query.status === 'open' ? styles.statusBadgeOpen : styles.statusBadgeResolved,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      query.status === 'open' ? styles.statusTextOpen : styles.statusTextResolved,
                    ]}
                  >
                    {query.status}
                  </Text>
                </View>
              </View>
              <Text style={styles.queryIssue} numberOfLines={2}>
                {query.issue}
              </Text>
              <View style={styles.queryFooter}>
                <Text style={styles.viewDetails}>View Details</Text>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="help-circle-outline" size={64} color="#E5E5EA" />
            <Text style={styles.emptyStateText}>No queries found</Text>
          </View>
        )}
      </ScrollView>
    </View>
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
  filterTabs: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  filterTabActive: {
    backgroundColor: '#003D99',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  queryCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  queryInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 6,
  },
  queryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeOpen: {
    backgroundColor: '#FF950015',
  },
  statusBadgeResolved: {
    backgroundColor: '#1A9D5C15',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    textTransform: 'capitalize',
  },
  statusTextOpen: {
    color: '#FF9500',
  },
  statusTextResolved: {
    color: '#1A9D5C',
  },
  queryIssue: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginBottom: 12,
    lineHeight: 20,
  },
  queryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  viewDetails: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#003D99',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 16,
  },
});

























