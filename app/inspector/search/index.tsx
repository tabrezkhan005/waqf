import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import type { InstitutionWithDistrict } from '@/lib/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type FilterStatus = 'all' | 'pending' | 'completed';

export default function InstitutionSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    (params.filter as FilterStatus) || 'all'
  );
  const [institutions, setInstitutions] = useState<InstitutionWithDistrict[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [collectedInstitutionIds, setCollectedInstitutionIds] = useState<Set<string>>(new Set());
  const [districtError, setDistrictError] = useState<string | null>(null);

  useEffect(() => {
    // Depend on stable keys to avoid reloading on every profile object identity change
    loadInstitutions();
  }, [profile?.district_id]);

  const loadInstitutions = async () => {
    if (!profile?.district_id) {
      // Don't crash/logbox: show a clear message in the UI
      setInstitutions([]);
      setDistrictError('Your inspector account is not assigned to any district. Please contact admin.');
      return;
    }

    try {

      setLoading(true);
      setDistrictError(null);

      // OPTIMIZATION: Load institutions and collections index in parallel
      const [institutionsRes, collectionsRes] = await Promise.all([
        // Load institutions filtered by inspector's district_id.
        // Avoid querying `districts` separately here (can fail under RLS).
        supabase
          .from('institutions')
          .select(`
            *,
            district:districts (
              id,
              name,
              code
            )
          `)
          .eq('district_id', profile.district_id)
          .eq('is_active', true)
          .is('deleted_at', null)
          .order('name'),
        // Load collections index in parallel
        profile?.id ? supabase
          .from('collections')
          .select('institution_id')
          .eq('inspector_id', profile.id) : Promise.resolve({ data: [], error: null }),
      ]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/index.tsx:73',message:'Promise.all completed',data:{institutionsError:!!institutionsRes.error,collectionsError:!!collectionsRes.error,institutionsCount:institutionsRes.data?.length,collectionsCount:collectionsRes.data?.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (institutionsRes.error) {
        // Removed debug log institutions:', institutionsRes.error);
        setInstitutions([]);
        setDistrictError('Unable to load institutions for your district. Please try again.');
        return;
      }
      setInstitutions((institutionsRes.data as InstitutionWithDistrict[]) || []);

      // Set collected institution IDs from parallel query
      if (collectionsRes.data) {
        setCollectedInstitutionIds(new Set((collectionsRes.data || []).map((c: any) => c.institution_id)));
      }
    } catch (error) {
      // Removed debug log institutions:', error);
      setInstitutions([]);
      setDistrictError('Unable to load institutions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredInstitutions = useMemo(() => {
    let filtered = [...institutions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((inst: any) => {
        return (
          inst.name?.toLowerCase().includes(q) ||
          inst.ap_gazette_no?.toLowerCase().includes(q) ||
          inst.district?.name?.toLowerCase().includes(q)
        );
      });
    }

    if (filterStatus !== 'all') {
      if (filterStatus === 'pending') {
        filtered = filtered.filter((inst) => !collectedInstitutionIds.has(inst.id));
      } else {
        filtered = filtered.filter((inst) => collectedInstitutionIds.has(inst.id));
      }
    }

    return filtered;
  }, [institutions, searchQuery, filterStatus, collectedInstitutionIds]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadInstitutions(), loadCollectionsIndex()]);
    setRefreshing(false);
  };

  const renderItem = ({ item }: { item: InstitutionWithDistrict }) => {
    const isCompleted = collectedInstitutionIds.has(item.id);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() =>
          router.push(
            { pathname: '/inspector/search/collection', params: { institutionId: String(item.id) } } as any
          )
        }
        style={{ marginBottom: theme.spacing.sm }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.rowTop}>
            <View style={styles.rowLeft}>
              <Text style={styles.instName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.instMeta} numberOfLines={1}>
                {item.ap_gazette_no ? `${item.ap_gazette_no} • ` : ''}
                {item.district?.name || '—'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </View>

          <View style={styles.rowBottom}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: isCompleted ? `${theme.colors.primary}15` : `${theme.colors.secondary}15`,
                  borderColor: isCompleted ? `${theme.colors.primary}30` : `${theme.colors.secondary}30`,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: isCompleted ? theme.colors.primary : theme.colors.secondary }]}>
                {isCompleted ? 'Completed' : 'Pending'}
              </Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader
          title="Search"
          subtitle="Institutions"
          rightActions={[
            { icon: 'settings-outline', onPress: () => router.push('/inspector/settings'), accessibilityLabel: 'Settings' },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <TextField
          leftIcon="search-outline"
          placeholder="Search by name, code, district..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.chipsRow}>
          <Chip label="All" selected={filterStatus === 'all'} onPress={() => setFilterStatus('all')} />
          <Chip label="Pending" selected={filterStatus === 'pending'} onPress={() => setFilterStatus('pending')} />
          <Chip label="Completed" selected={filterStatus === 'completed'} onPress={() => setFilterStatus('completed')} />
        </View>

        <FlatList
          data={filteredInstitutions}
          keyExtractor={(i) => String(i.id)}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              // Keep pull-to-refresh strictly tied to user-initiated refresh state
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No institutions found"
              description={
                districtError
                  ? districtError
                  : searchQuery
                    ? 'Try a different keyword.'
                    : 'Pull to refresh or check your district assignment.'
              }
              icon="search-outline"
            />
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  listContent: {
    paddingTop: theme.spacing.sm,
    paddingBottom: 100,
  },
  rowCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  rowLeft: {
    flex: 1,
  },
  instName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  instMeta: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: theme.colors.muted,
  },
  rowBottom: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
