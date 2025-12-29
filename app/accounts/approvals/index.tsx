import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Modal, ScrollView, TextInput } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Collection, CollectionWithRelations } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

export default function PendingApprovalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Filters
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [inspectorFilter, setInspectorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [inspectors, setInspectors] = useState<{ id: string; name: string }[]>([]);

  // Dropdown modals
  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [districtSearch, setDistrictSearch] = useState('');
  const [inspectorSearch, setInspectorSearch] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPendingCollections(),
        loadDistricts(),
        loadInspectors(),
        loadNotifications(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadNotifications = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', profile.id)
        .eq('type', 'payment_review')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setNotifications(data || []);
      const unread = (data || []).filter((n) => !n.is_read).length;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      await loadNotifications();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const loadPendingCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            ap_gazette_no,
            district_id,
            district:districts (
              id,
              name
            )
          ),
          inspector:profiles!collections_inspector_id_fkey (
            id,
            full_name
          )
        `)
        .in('status', ['pending', 'sent_to_accounts'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading collections:', error);
        Alert.alert('Error', `Failed to load collections: ${error.message}`);
        setCollections([]);
        return;
      }

      console.log('Loaded collections:', data?.length || 0, 'collections');
      setCollections((data as CollectionWithRelations[]) || []);
    } catch (error: any) {
      console.error('Error loading collections:', error);
      Alert.alert('Error', `Failed to load collections: ${error.message || 'Unknown error'}`);
    }
  };

  const loadDistricts = async () => {
    try {
      const { data } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadInspectors = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'inspector')
        .order('full_name');

      if (error) {
        console.error('Error loading inspectors:', error);
        Alert.alert('Error', `Failed to load inspectors: ${error.message}`);
        return;
      }

      setInspectors((data || []).map((i) => ({ id: i.id, name: i.full_name })));
    } catch (error) {
      console.error('Error loading inspectors:', error);
    }
  };

  const filteredCollections = useMemo(() => {
    let filtered = [...collections];

    if (districtFilter !== 'all') {
      filtered = filtered.filter((c) => c.institution?.district?.id?.toString() === districtFilter);
    }

    if (inspectorFilter !== 'all') {
      filtered = filtered.filter((c) => c.inspector_id === inspectorFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const inst = c.institution;
        if (!inst) return false;
        const nameMatch = inst.name?.toLowerCase().includes(query) || false;
        const codeMatch = (inst.ap_gazette_no || '').toLowerCase().includes(query);
        return nameMatch || codeMatch;
      });
    }

    return filtered;
  }, [collections, districtFilter, inspectorFilter, searchQuery]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent_to_accounts':
        return theme.colors.primary;
      default:
        return theme.colors.muted;
    }
  };

  const totalAmount = filteredCollections.reduce(
    (sum, c) => sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0),
    0
  );

  const renderCollectionItem = ({ item }: { item: CollectionWithRelations }) => {
    const total = Number(item.arrear_amount || 0) + Number(item.current_amount || 0);

    return (
      <TouchableOpacity
        style={{ marginBottom: theme.spacing.sm, marginHorizontal: theme.spacing.lg }}
        onPress={() => router.push(`/accounts/approvals/${item.id}`)}
        activeOpacity={0.85}
      >
        <Card style={styles.collectionCard}>
          <View style={styles.collectionCardLeft}>
            <Text style={styles.institutionName}>
              {item.institution?.name || `Institution #${item.institution_id}`}
            </Text>
            <Text style={styles.meta}>
              {item.institution?.district?.name || 'Unknown District'} • {item.inspector?.full_name || 'Unknown Inspector'}
            </Text>
            <Text style={styles.meta}>{formatDate(item.collection_date)}</Text>
          </View>

          <View style={styles.collectionCardRight}>
            <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: `${getStatusColor(item.status)}15`,
                  borderColor: `${getStatusColor(item.status)}30`,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.replaceAll('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <FlatList
        data={filteredCollections}
        renderItem={renderCollectionItem}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={{ paddingBottom: 120 }}
        removeClippedSubviews={false}
        scrollEventThrottle={16}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={10}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppHeader
              title="Approvals"
              subtitle="Verify & process collections"
              rightActions={unreadCount > 0 ? [
                {
                  icon: 'notifications',
                  badgeCount: unreadCount,
                  onPress: () => {
                    // Scroll to notifications or show notification list
                  },
                  accessibilityLabel: `${unreadCount} unread notifications`,
                },
              ] : undefined}
            />

            {/* Notifications Section */}
            {notifications.length > 0 && (
              <>
                <View style={{ height: theme.spacing.md }} />
                <Card style={styles.notificationsCard}>
                  <View style={styles.notificationsHeader}>
                    <Ionicons name="notifications" size={20} color={theme.colors.primary} />
                    <Text style={styles.notificationsTitle}>
                      Recent Notifications {unreadCount > 0 && `(${unreadCount} new)`}
                    </Text>
                  </View>
                  {notifications.slice(0, 3).map((notification) => (
                    <TouchableOpacity
                      key={notification.id}
                      style={[
                        styles.notificationItem,
                        !notification.is_read && styles.notificationItemUnread,
                      ]}
                      onPress={() => {
                        markNotificationAsRead(notification.id);
                        if (notification.related_id) {
                          router.push(`/accounts/approvals/${notification.related_id}`);
                        }
                      }}
                    >
                      <View style={styles.notificationContent}>
                        <Text style={styles.notificationTitle}>{notification.title}</Text>
                        <Text style={styles.notificationMessage} numberOfLines={2}>
                          {notification.message}
                        </Text>
                        <Text style={styles.notificationTime}>
                          {new Date(notification.created_at).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                      {!notification.is_read && (
                        <View style={styles.unreadDot} />
                      )}
                    </TouchableOpacity>
                  ))}
                </Card>
              </>
            )}

            <View style={{ height: theme.spacing.md }} />

            <Card style={styles.summaryCard}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Pending</Text>
                <Text style={styles.summaryValue}>{filteredCollections.length}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total</Text>
                <Text style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
              </View>
            </Card>

            <View style={{ height: theme.spacing.md }} />

            <TextField
              leftIcon="search-outline"
              placeholder="Search institution name or code…"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={{ height: theme.spacing.sm }} />

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
                {districtFilter === 'all' ? 'All Districts' : districts.find((d) => d.id.toString() === districtFilter)?.name || 'Select District'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
            </TouchableOpacity>

            <View style={{ height: theme.spacing.sm }} />

            <Text style={styles.filterTitle}>Inspector</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => {
                setInspectorSearch('');
                setInspectorModalOpen(true);
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="person-outline" size={18} color={theme.colors.muted} />
              <Text style={styles.dropdownText} numberOfLines={1}>
                {inspectorFilter === 'all' ? 'All Inspectors' : inspectors.find((i) => i.id === inspectorFilter)?.name || 'Select Inspector'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={theme.colors.muted} />
            </TouchableOpacity>

            <View style={{ height: theme.spacing.md }} />

            {filteredCollections.length === 0 ? (
              <View style={{ marginHorizontal: theme.spacing.lg }}>
                <EmptyState title="No pending approvals" description="You're all caught up." icon="checkmark-circle-outline" />
              </View>
            ) : (
              <Text style={styles.sectionTitle}>Queue</Text>
            )}

            <View style={{ height: theme.spacing.sm }} />
          </View>
        }
      />

      {/* District Dropdown Modal */}
      <Modal
        visible={districtModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDistrictModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <TouchableOpacity onPress={() => setDistrictModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search districts..."
                placeholderTextColor={theme.colors.muted}
                value={districtSearch}
                onChangeText={setDistrictSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setDistrictFilter('all');
                  setDistrictModalOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>All Districts</Text>
                {districtFilter === 'all' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
              {districts
                .filter((d) => d.name.toLowerCase().includes(districtSearch.toLowerCase()))
                .map((district) => (
                  <TouchableOpacity
                    key={district.id}
                    style={styles.modalOption}
                    onPress={() => {
                      setDistrictFilter(district.id.toString());
                      setDistrictModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{district.name}</Text>
                    {districtFilter === district.id.toString() && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Inspector Dropdown Modal */}
      <Modal
        visible={inspectorModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setInspectorModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Inspector</Text>
              <TouchableOpacity onPress={() => setInspectorModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalSearchContainer}>
              <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search inspectors..."
                placeholderTextColor={theme.colors.muted}
                value={inspectorSearch}
                onChangeText={setInspectorSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setInspectorFilter('all');
                  setInspectorModalOpen(false);
                }}
              >
                <Text style={styles.modalOptionText}>All Inspectors</Text>
                {inspectorFilter === 'all' && <Ionicons name="checkmark" size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
              {inspectors
                .filter((i) => (i.name || '').toLowerCase().includes(inspectorSearch.toLowerCase()))
                .map((inspector) => (
                  <TouchableOpacity
                    key={inspector.id}
                    style={styles.modalOption}
                    onPress={() => {
                      setInspectorFilter(inspector.id);
                      setInspectorModalOpen(false);
                    }}
                  >
                    <Text style={styles.modalOptionText}>{inspector.name || 'Inspector'}</Text>
                    {inspectorFilter === inspector.id && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  summaryCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: theme.colors.border,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  summaryValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  filterTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  collectionCardLeft: {
    flex: 1,
  },
  institutionName: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginTop: 2,
  },
  collectionCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  collectionAmount: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
  },
  notificationsCard: {
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  notificationsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.sm,
  },
  notificationsTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 8,
    marginBottom: theme.spacing.xs,
    backgroundColor: theme.colors.surface,
  },
  notificationItemUnread: {
    backgroundColor: theme.colors.primary + '08',
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 10,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
    alignSelf: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: theme.spacing.sm,
  },
  dropdownText: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 14,
    color: theme.colors.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.text,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalSearchInput: {
    flex: 1,
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: theme.colors.text,
    paddingVertical: theme.spacing.sm,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  modalOptionText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 15,
    color: theme.colors.text,
  },
});
