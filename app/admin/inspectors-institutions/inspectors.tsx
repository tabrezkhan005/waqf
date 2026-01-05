import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Inspector {
  id: string;
  full_name: string;
  district_id: string | null;
  district_name?: string;
  pending_collections?: number;
  total_collections?: number;
}

export default function InspectorsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | 'all'>('all');
  const [districts, setDistricts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInspectors();
  }, [selectedDistrict, searchQuery, inspectors]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadInspectors(), loadDistricts()]);
    } catch (error) {
      // Removed debug log data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInspectors = async () => {
    try {
      type ProfileRow = { id: string; full_name: string; district_id: string | null };
      type DistrictRow = { id: string; name: string };

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, district_id')
        .eq('role', 'inspector')
        .order('full_name');

      if (error) throw error;

      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name');

      const profileRows = (profiles || []) as ProfileRow[];
      const districtRows = (districtsData || []) as DistrictRow[];
      const districtMap = new Map<string, string>(districtRows.map((d) => [String(d.id), d.name]));

      // Load collection stats
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select('inspector_name');

      const collectionCounts = new Map<string, number>();
      dcbData?.forEach((item: any) => {
        const inspectorName = item.inspector_name;
        if (inspectorName) {
          collectionCounts.set(inspectorName, (collectionCounts.get(inspectorName) || 0) + 1);
        }
      });

      const inspectorsWithData: Inspector[] = profileRows.map((profile) => ({
        id: profile.id,
        full_name: profile.full_name,
        district_id: profile.district_id,
        district_name: profile.district_id ? districtMap.get(profile.district_id) || 'Unknown' : 'Unassigned',
        pending_collections: collectionCounts.get(profile.full_name) || 0,
        total_collections: collectionCounts.get(profile.full_name) || 0,
      }));

      setInspectors(inspectorsWithData);
    } catch (error) {
      // Removed debug log inspectors:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDistricts(data || []);
    } catch (error) {
      // Removed debug log districts:', error);
    }
  };

  const filterInspectors = () => {
    let filtered = [...inspectors];

    if (selectedDistrict !== 'all') {
      filtered = filtered.filter((i) => i.district_id === selectedDistrict);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.full_name.toLowerCase().includes(query) ||
          i.district_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInspectors(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    const total = filteredInspectors.length;
    const totalCollections = filteredInspectors.reduce((sum, i) => sum + (i.total_collections || 0), 0);
    const totalPending = filteredInspectors.reduce((sum, i) => sum + (i.pending_collections || 0), 0);
    return { total, totalCollections, totalPending };
  }, [filteredInspectors]);

  const selectedDistrictLabel = useMemo(() => {
    if (selectedDistrict === 'all') return 'All Districts';
    const found = (districts || []).find((d: any) => d.id === selectedDistrict);
    return found?.name || 'Select District';
  }, [districts, selectedDistrict]);

  const filteredDistrictOptions = useMemo(() => {
    const q = districtSearch.trim().toLowerCase();
    if (!q) return districts || [];
    return (districts || []).filter((d: any) => String(d.name || '').toLowerCase().includes(q));
  }, [districts, districtSearch]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7E43" />
        </View>
      </SafeAreaView>
    );
  }

  const Header = (
    <View>
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(600)} style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Inspectors</Text>
            <Text style={styles.headerSubtitle}>
              {summaryStats.total} {summaryStats.total === 1 ? 'inspector' : 'inspectors'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/admin/inspectors-institutions/inspectors/add')}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Summary Stats */}
      {filteredInspectors.length > 0 && (
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={[
            styles.summarySection,
            {
              paddingHorizontal: 0,
              marginTop: 12,
              marginBottom: 12,
            },
          ]}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'stretch',
              backgroundColor: '#fff',
              borderRadius: 24,
              paddingVertical: 18,
              paddingHorizontal: 10,
              marginHorizontal: 10,
              // Modern shadow
              shadowColor: '#0A7E43',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 14,
              elevation: 5,
              // Add border for soft depth
              borderWidth: 0.25,
              borderColor: '#E0E7EF',
              // Soft separation from header
              marginTop: -18,
            }}
          >
            {/* Total Inspectors */}
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.primary + '20',
                  borderRadius: 15,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  marginTop: 2,
                }}
              >
                <Ionicons name="people" size={24} color={theme.colors.primary} />
              </View>
              <Text style={[styles.summaryValue, { fontSize: 18, fontWeight: 'bold', marginBottom: 0 }]}>
                {summaryStats.total}
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: 13, color: '#444', opacity: 0.9 }]}>Total</Text>
            </View>

            {/* Curved Divider */}
            <View
              style={{
                width: 1.5,
                marginVertical: 9,
                backgroundColor: '#F3F4F6',
                borderRadius: 8,
                alignSelf: 'center',
                marginHorizontal: 3,
                height: '75%',
                opacity: 0.7,
              }}
            />

            {/* Total Collections */}
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.success + '20',
                  borderRadius: 15,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  marginTop: 2,
                }}
              >
                <Ionicons name="document-text" size={24} color={theme.colors.success} />
              </View>
              <Text style={[styles.summaryValue, { fontSize: 18, fontWeight: 'bold', marginBottom: 0 }]}>
                {summaryStats.totalCollections}
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: 13, color: '#444', opacity: 0.9 }]}>Collections</Text>
            </View>

            {/* Curved Divider */}
            <View
              style={{
                width: 1.5,
                marginVertical: 9,
                backgroundColor: '#F3F4F6',
                borderRadius: 8,
                alignSelf: 'center',
                marginHorizontal: 3,
                height: '75%',
                opacity: 0.7,
              }}
            />

            {/* Pending Collections */}
            <View
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 2,
              }}
            >
              <View
                style={{
                  backgroundColor: theme.colors.warning + '20',
                  borderRadius: 15,
                  width: 40,
                  height: 40,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 4,
                  marginTop: 2,
                }}
              >
                <Ionicons name="time" size={24} color={theme.colors.warning} />
              </View>
              <Text style={[styles.summaryValue, { color: theme.colors.warning, fontSize: 18, fontWeight: 'bold', marginBottom: 0 }]}>
                {summaryStats.totalPending}
              </Text>
              <Text style={[styles.summaryLabel, { fontSize: 13, color: theme.colors.warning, opacity: 0.95 }]}>Pending</Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* Search + Dropdown Filter */}
      <Animated.View entering={FadeInUp.delay(200).duration(600)} style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <View style={styles.searchIconContainer}>
            <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or district..."
            placeholderTextColor={theme.colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={22} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.filterTitle}>District</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => {
            setDistrictSearch('');
            setDistrictModalOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="location-outline" size={18} color={theme.colors.muted} />
          <Text style={styles.dropdownText} numberOfLines={1}>
            {selectedDistrictLabel}
          </Text>
          <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={filteredInspectors}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: inspector, index }) => (
          <Animated.View entering={ZoomIn.delay(250 + index * 30).duration(300)}>
            <TouchableOpacity
              style={styles.inspectorCard}
              onPress={() => router.push(`/admin/inspectors-institutions/inspector-profile?id=${inspector.id}`)}
              activeOpacity={0.85}
            >
              <View style={styles.inspectorHeader}>
                <View style={styles.avatarContainer}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{inspector.full_name.charAt(0).toUpperCase()}</Text>
                  </View>
                  <View style={styles.avatarBadge}>
                    <Ionicons name="shield-checkmark" size={12} color={theme.colors.success} />
                  </View>
                </View>
                <View style={styles.inspectorInfo}>
                  <Text style={styles.inspectorName} numberOfLines={1}>
                    {inspector.full_name}
                  </Text>
                  <View style={styles.inspectorMeta}>
                    <View style={styles.metaBadge}>
                      <Ionicons name="location" size={14} color={theme.colors.primary} />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {inspector.district_name}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.chevronContainer}>
                  <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={[styles.statBadge, styles.statBadgePrimary]}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="document-text" size={18} color={theme.colors.primary} />
                  </View>
                  <Text style={styles.statValue}>{inspector.total_collections || 0}</Text>
                  <Text style={styles.statLabel}>Collections</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={[styles.statBadge, styles.statBadgeWarning]}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="time" size={18} color={theme.colors.warning} />
                  </View>
                  <Text style={[styles.statValue, styles.statValuePending]}>{inspector.pending_collections || 0}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
              </View>
            </TouchableOpacity>
          </Animated.View>
        )}
        ListEmptyComponent={
          <Animated.View entering={FadeInUp.delay(150).duration(500)} style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Ionicons name="people-outline" size={72} color={theme.colors.border} />
            </View>
            <Text style={styles.emptyStateText}>No inspectors found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedDistrict !== 'all'
                ? 'Try adjusting your search or filter'
                : 'Add your first inspector to get started'}
            </Text>
            {!searchQuery && selectedDistrict === 'all' && (
              <TouchableOpacity
                style={styles.emptyActionButton}
                onPress={() => router.push('/admin/inspectors-institutions/inspectors/add')}
                activeOpacity={0.8}
              >
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.emptyActionText}>Add Inspector</Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        }
      />

      {/* District Dropdown Modal */}
      <Modal visible={districtModalOpen} transparent animationType="fade" onRequestClose={() => setDistrictModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDistrictModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select District</Text>
            <TouchableOpacity onPress={() => setDistrictModalOpen(false)} style={styles.modalClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.modalSearch}>
            <Ionicons name="search-outline" size={18} color={theme.colors.muted} />
            <TextInput
              value={districtSearch}
              onChangeText={setDistrictSearch}
              placeholder="Search district..."
              placeholderTextColor={theme.colors.muted}
              style={styles.modalSearchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {!!districtSearch && (
              <TouchableOpacity onPress={() => setDistrictSearch('')} activeOpacity={0.7}>
                <Ionicons name="close-circle" size={20} color={theme.colors.muted} />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={[{ id: 'all', name: 'All Districts' }, ...(filteredDistrictOptions || [])] as any[]}
            keyExtractor={(item) => String(item.id)}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.modalList}
            renderItem={({ item }) => {
              const isSelected = selectedDistrict === item.id;
              return (
                <TouchableOpacity
                  style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                  activeOpacity={0.8}
                  onPress={() => {
                    setSelectedDistrict(item.id);
                    setDistrictModalOpen(false);
                  }}
                >
                  <View style={styles.modalRowLeft}>
                    <Ionicons
                      name={isSelected ? 'checkmark-circle' : 'radio-button-off-outline'}
                      size={18}
                      color={isSelected ? theme.colors.primary : theme.colors.muted}
                    />
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]} numberOfLines={1}>
                      {item.name}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </Modal>
    </SafeAreaView>
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
  header: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
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
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  addButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  summarySection: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
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
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.md,
  },
  filterSection: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minHeight: 52,
  },
  searchIconContainer: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  clearButton: {
    padding: 4,
    marginLeft: theme.spacing.xs,
  },
  filterHeader: {
    marginBottom: theme.spacing.sm,
  },
  filterTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dropdownText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  listContent: {
    padding: theme.spacing.lg,
    paddingBottom: 120,
  },
  inspectorCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  inspectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  avatarText: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  inspectorInfo: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  inspectorName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  inspectorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '10',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    borderRadius: theme.radius.sm,
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.primary,
  },
  chevronContainer: {
    padding: theme.spacing.xs,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  statBadge: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  statBadgePrimary: {
    backgroundColor: theme.colors.primary + '08',
  },
  statBadgeWarning: {
    backgroundColor: theme.colors.warning + '08',
  },
  statIconContainer: {
    marginBottom: theme.spacing.xs,
  },
  statDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.xs,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  statValuePending: {
    color: theme.colors.warning,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.surfaceAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyStateText: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: theme.spacing.sm,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  emptyActionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute',
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    top: '18%',
    bottom: '18%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  modalClose: {
    padding: 6,
    borderRadius: 12,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 48,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    paddingVertical: 10,
  },
  modalList: {
    flex: 1,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    marginBottom: 10,
  },
  modalRowSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  modalRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 10,
  },
  modalRowText: {
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    flex: 1,
  },
  modalRowTextSelected: {
    color: theme.colors.primary,
  },
});
