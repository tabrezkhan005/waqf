import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import { EmptyState } from '@/components/ui/EmptyState';

interface Query {
  id: number;
  inspector_name: string;
  district: string;
  issue: string;
  status: 'open' | 'resolved';
  timestamp: string;
  title: string;
  description: string;
  issue_type: string;
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

      const { data, error } = await supabase
        .from('queries')
        .select(`
          id,
          title,
          description,
          issue_type,
          status,
          created_at,
          inspector:profiles!queries_inspector_id_fkey (
            id,
            full_name,
            district:districts (
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Removed debug log queries:', error);
        Alert.alert('Error', 'Failed to load queries. Please try again.');
        setQueries([]);
        return;
      }

      const formattedQueries: Query[] = (data || []).map((q: any) => {
        // Map database status to UI status
        // 'open' and 'in_progress' -> 'open'
        // 'resolved' and 'closed' -> 'resolved'
        const uiStatus = q.status === 'resolved' || q.status === 'closed' ? 'resolved' : 'open';

        return {
          id: q.id,
          inspector_name: q.inspector?.full_name || 'Unknown Inspector',
          district: q.inspector?.district?.name || 'Unknown District',
          issue: q.title || q.description || 'No description',
          title: q.title,
          description: q.description,
          issue_type: q.issue_type,
          status: uiStatus,
          timestamp: q.created_at,
        };
      });

      setQueries(formattedQueries);
    } catch (error) {
      // Removed debug log queries:', error);
      Alert.alert('Error', 'Failed to load queries. Please try again.');
      setQueries([]);
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
    if (filter === 'open') {
      return q.status === 'open';
    }
    if (filter === 'resolved') {
      return q.status === 'resolved';
    }
    return true;
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
              activeOpacity={0.7}
            >
              <View style={styles.queryHeader}>
                <View style={styles.queryInfo}>
                  <Text style={styles.inspectorName}>{query.inspector_name}</Text>
                  <View style={styles.queryMeta}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                    <Text style={styles.metaText}>{query.district}</Text>
                    <Text style={styles.metaText}> • </Text>
                    <Text style={styles.metaText}>
                      {new Date(query.timestamp).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
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
                    {query.status === 'open' ? 'Open' : 'Resolved'}
                  </Text>
                </View>
              </View>
              <Text style={styles.queryTitle}>{query.title}</Text>
              <Text style={styles.queryIssue} numberOfLines={2}>
                {query.description || query.issue}
              </Text>
              <View style={styles.queryFooter}>
                <Text style={styles.viewDetails}>View Details</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <EmptyState
              title="No queries found"
              description={filter === 'all' ? 'No queries have been submitted yet.' : `No ${filter} queries found.`}
              icon="help-circle-outline"
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  filterTabs: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
  },
  filterTabActive: {
    backgroundColor: theme.colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
    paddingBottom: 100, // Extra padding to prevent content from being hidden
  },
  queryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  queryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.md,
  },
  queryInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  queryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
  },
  statusBadgeOpen: {
    backgroundColor: theme.colors.warning + '15',
    borderWidth: 1,
    borderColor: theme.colors.warning + '30',
  },
  statusBadgeResolved: {
    backgroundColor: theme.colors.success + '15',
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    textTransform: 'capitalize',
  },
  statusTextOpen: {
    color: theme.colors.warning,
  },
  statusTextResolved: {
    color: theme.colors.success,
  },
  queryTitle: {
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  queryIssue: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    lineHeight: 20,
  },
  queryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  viewDetails: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginTop: 16,
  },
});
