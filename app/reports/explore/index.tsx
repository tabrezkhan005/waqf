import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';

type SearchMode = 'district' | 'institution' | 'inspector';

export default function ExploreHomeScreen() {
  const router = useRouter();
  const [searchMode, setSearchMode] = useState<SearchMode>('district');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [institutions, setInstitutions] = useState<
    Array<{ id: string; name: string; code: string | null; ap_gazette_no: string | null }>
  >([]);
  const [inspectors, setInspectors] = useState<Array<{ id: string; name: string; district_name: string }>>([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (searchMode === 'district') {
        const { data } = await supabase.from('districts').select('id, name').order('name');
        setDistricts(data || []);
      } else if (searchMode === 'institution') {
        const { data } = await supabase
          .from('institutions')
          .select('id, name, ap_gazette_no')
          .eq('is_active', true)
          .order('name');
        setInstitutions((data as any) || []);
      } else {
        const { data } = await supabase
          .from('profiles')
          .select(
            `
            id,
            full_name,
            district:districts (
              name
            )
          `
          )
          .eq('role', 'inspector')
          .order('full_name');
        setInspectors(
          (data || []).map((p: any) => ({
            id: p.id,
            name: p.full_name || 'Unknown',
            district_name: p.district?.name || 'Unknown',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (searchMode === 'district') {
      return districts.filter((d) => d.name.toLowerCase().includes(q));
    }
    if (searchMode === 'institution') {
      return institutions.filter((i) =>
        i.name.toLowerCase().includes(q) ||
        i.ap_gazette_no?.toLowerCase()?.includes(q)
      );
    }
    return inspectors.filter((i) => i.name.toLowerCase().includes(q) || i.district_name.toLowerCase().includes(q));
  }, [districts, institutions, inspectors, searchMode, searchQuery]);

  const handleItemPress = (item: any) => {
    if (searchMode === 'district') {
      router.push(`/reports/explore/district?districtId=${item.id}`);
    } else if (searchMode === 'institution') {
      router.push(`/reports/explore/institution?institutionId=${item.id}`);
    } else {
      router.push(`/reports/explore/inspector?inspectorId=${item.id}`);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const icon =
      searchMode === 'district' ? 'map-outline' : searchMode === 'institution' ? 'business-outline' : 'person-outline';
    const title = item.name;
    const subtitle =
      searchMode === 'district'
        ? 'District'
        : searchMode === 'institution'
          ? item.ap_gazette_no
            ? `Gazette: ${item.ap_gazette_no}`
            : 'Institution'
          : item.district_name;

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleItemPress(item)}
        style={{ marginBottom: theme.spacing.sm }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.rowLeft}>
            <View style={styles.rowIcon}>
              <Ionicons name={icon as any} size={18} color={theme.colors.secondary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle} numberOfLines={1}>
                {title}
              </Text>
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </TouchableOpacity>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader title="Explore" subtitle="Drill down by district, institution, inspector" />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.modeRow}>
          <Chip label="District" selected={searchMode === 'district'} onPress={() => setSearchMode('district')} />
          <Chip label="Institution" selected={searchMode === 'institution'} onPress={() => setSearchMode('institution')} />
          <Chip label="Inspector" selected={searchMode === 'inspector'} onPress={() => setSearchMode('inspector')} />
        </View>

        <TextField
          leftIcon="search-outline"
          placeholder={`Search ${searchMode}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <FlatList
          data={filteredResults}
          renderItem={renderItem}
          keyExtractor={(item: any) => String(item.id)}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing || loading}
              onRefresh={onRefresh}
              tintColor={theme.colors.secondary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title={searchQuery ? 'No results found' : `No ${searchMode}s available`}
              description={searchQuery ? 'Try a different keyword.' : 'Pull to refresh.'}
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
  modeRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  listContent: {
    paddingTop: theme.spacing.md,
    paddingBottom: 100,
  },
  rowCard: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: `${theme.colors.secondary}10`,
    borderWidth: 1,
    borderColor: `${theme.colors.secondary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
});
