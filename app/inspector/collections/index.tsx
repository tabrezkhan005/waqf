import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { CollectionWithRelations } from '@/lib/types/database';
import { theme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { TextField } from '@/components/ui/TextField';
import { EmptyState } from '@/components/ui/EmptyState';

export default function CollectionsListScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const loadCollections = async () => {
    if (!profile?.id) {
      console.log('No profile ID available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading collections for inspector:', profile.id);

      const { data, error } = await supabase
        .from('collections')
        .select(
          `
          *,
          institution:institutions (
            id,
            name,
            ap_gazette_no
          )
        `
        )
        .eq('inspector_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading collections:', error);
        setCollections([]);
        return;
      }

      console.log('Collections loaded:', data?.length || 0);
      setCollections((data as CollectionWithRelations[]) || []);
    } catch (error) {
      console.error('Error loading collections:', error);
      setCollections([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadCollections();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredCollections = useMemo(() => {
    let filtered = [...collections];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((collection) => {
        const institution = collection.institution;
        return (
          institution?.name?.toLowerCase().includes(q) ||
          institution?.ap_gazette_no?.toLowerCase().includes(q)
        );
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((collection) => collection.status === statusFilter);
    }

    return filtered;
  }, [collections, searchQuery, statusFilter]);

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
      case 'verified':
        return theme.colors.primary;
      case 'rejected':
        return theme.colors.danger;
      case 'sent_to_accounts':
        return theme.colors.secondary;
      default:
        return theme.colors.muted;
    }
  };

  const renderCollectionItem = ({ item }: { item: CollectionWithRelations }) => {
    const totalAmount = Number(item.arrear_amount || 0) + Number(item.current_amount || 0);
    const statusColor = getStatusColor(item.status);

    return (
      <TouchableOpacity
        onPress={() => router.push(`/inspector/collections/${item.id}`)}
        activeOpacity={0.85}
        style={{ marginBottom: theme.spacing.sm }}
      >
        <Card style={styles.rowCard}>
          <View style={styles.rowTop}>
            <View style={{ flex: 1, paddingRight: theme.spacing.sm }}>
              <Text style={styles.instName} numberOfLines={1}>
                {item.institution?.name || `Institution #${item.institution_id}`}
              </Text>
              <Text style={styles.instMeta} numberOfLines={1}>
                {item.institution?.ap_gazette_no ? `${item.institution.ap_gazette_no} • ` : ''}
                {formatDate(item.collection_date)}
              </Text>
            </View>

            <View style={styles.rightCol}>
              <Text style={styles.amount} numberOfLines={1}>
                ₹{totalAmount.toLocaleString('en-IN')}
              </Text>
              <View
                style={[
                  styles.statusPill,
                  { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.status.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <View style={styles.page}>
        <AppHeader
          title="Collections"
          subtitle="My submissions"
          rightActions={[
            {
              icon: 'settings-outline',
              onPress: () => router.push('/inspector/settings'),
              accessibilityLabel: 'Settings',
            },
          ]}
        />

        <View style={{ height: theme.spacing.md }} />

        <TextField
          leftIcon="search-outline"
          placeholder="Search by institution name/AP Gazette No..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <View style={styles.chipsRow}>
          <Chip label="All" selected={statusFilter === 'all'} onPress={() => setStatusFilter('all')} />
          <Chip label="Pending" selected={statusFilter === 'pending'} onPress={() => setStatusFilter('pending')} />
          <Chip label="Sent" selected={statusFilter === 'sent_to_accounts'} onPress={() => setStatusFilter('sent_to_accounts')} />
          <Chip label="Verified" selected={statusFilter === 'verified'} onPress={() => setStatusFilter('verified')} />
          <Chip label="Rejected" selected={statusFilter === 'rejected'} onPress={() => setStatusFilter('rejected')} />
        </View>

        <FlatList
          data={filteredCollections}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => String(item.id)}
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
              title="No collections"
              description="Create a collection from Search to see it here."
              icon="receipt-outline"
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
    flexWrap: 'wrap',
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
    gap: theme.spacing.sm,
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
  rightCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  amount: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 11,
    letterSpacing: 0.2,
  },
});
