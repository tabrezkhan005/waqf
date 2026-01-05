import React, { useMemo, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

interface InstitutionRanking {
  institution_id: string;
  institution_name: string;
  institution_code: string | null;
  district_id: string | null;
  district_name: string;
  total_collected: number;
  pending_count: number;
  collection_count: number;
}

export default function InstitutionRankingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<InstitutionRanking[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load districts, institutions, and DCB data in parallel
      const [{ data: districtRows }, { data: institutionRows }, dcbData] = await Promise.all([
        supabase.from('districts').select('id, name').order('name'),
        supabase
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
          .eq('is_active', true),
        import('@/lib/dcb/district-tables').then(m => m.queryAllDistrictDCB(
          'ap_gazette_no, institution_name, collection_total, _district_name, financial_year',
          { verifiedOnly: true, maxRowsPerTable: 500 } // Only count verified collections, limit rows per table
        ))
      ]);

      setDistricts((districtRows || []).map((d: any) => ({ id: String(d.id), name: d.name })));

      // Create institution map by ap_gazette_no
      const institutionMap = new Map<string, any>();
      (institutionRows || []).forEach((inst: any) => {
        if (inst.ap_gazette_no) {
          institutionMap.set(inst.ap_gazette_no, inst);
        }
      });

      const byInstitution = new Map<string, InstitutionRanking>();

      // Aggregate DCB data by institution
      dcbData.forEach((row: any) => {
        if (!row.ap_gazette_no) return;

        const institution = institutionMap.get(row.ap_gazette_no);
        if (!institution) return;

        const key = String(institution.id);
        const instName = institution.name || row.institution_name || 'Unknown';
        const districtId = institution.district_id ? String(institution.district_id) : null;
        const districtName = institution.district?.name || row._district_name || 'Unknown';

        const existing =
          byInstitution.get(key) ||
          ({
            institution_id: key,
            institution_name: instName,
            institution_code: institution.ap_gazette_no,
            district_id: districtId,
            district_name: districtName,
            total_collected: 0,
            pending_count: 0,
            collection_count: 0,
          } as InstitutionRanking);

        existing.total_collected += Number(row.collection_total || 0);
        existing.collection_count += 1;
        existing.pending_count += 1;

        byInstitution.set(key, existing);
      });

      const rankings = Array.from(byInstitution.values()).sort((a, b) => b.total_collected - a.total_collected);
      setInstitutions(rankings);
    } catch (e) {
      // Removed debug log institution rankings:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredInstitutions = useMemo(() => {
    let filtered = [...institutions];
    if (districtFilter !== 'all') {
      filtered = filtered.filter((i) => i.district_id === districtFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((i) => i.institution_name.toLowerCase().includes(q) || i.institution_code?.toLowerCase().includes(q));
    }
    return filtered;
  }, [institutions, districtFilter, searchQuery]);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const renderItem = ({ item, index }: { item: InstitutionRanking; index: number }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => router.push(`/reports/explore/institution?institutionId=${item.institution_id}`)}
        style={{ marginBottom: theme.spacing.sm }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.rowLeft}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>{item.institution_name}</Text>
              <Text style={styles.rowSubtitle} numberOfLines={2}>
                {item.district_name}{item.institution_code ? ` • ${item.institution_code}` : ''}
                {'\n'}
                Total: {formatCurrency(item.total_collected)} • Entries: {item.collection_count}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader title="Compare" subtitle="Institutions" />

        <View style={{ height: theme.spacing.md }} />

        <TextField
          leftIcon="search-outline"
          placeholder="Search by name or code..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={{ height: theme.spacing.md }} />

        <FlatList
          data={[{ id: 'all', name: 'All Districts' }, ...districts]}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.districtChips}
          renderItem={({ item: d }) => (
            <Chip
              label={d.name}
              selected={districtFilter === d.id}
              onPress={() => setDistrictFilter(d.id)}
              style={{ marginRight: theme.spacing.sm }}
            />
          )}
        />

        <FlatList
          data={filteredInstitutions}
          renderItem={({ item, index }) => renderItem({ item, index })}
          keyExtractor={(i) => i.institution_id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing || loading} onRefresh={onRefresh} tintColor={theme.colors.secondary} />
          }
          ListEmptyComponent={
            <EmptyState
              title="No institutions"
              description={searchQuery ? 'Try a different keyword.' : 'No DCB entries found.'}
              icon="business-outline"
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
  districtChips: {
    paddingVertical: theme.spacing.sm,
  },
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  rowCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.surface,
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
});
