import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import type { CollectionWithRelations } from '@/lib/types/database';

export default function CollectionDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const collectionId = params.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [collection, setCollection] = useState<CollectionWithRelations | null>(null);

  useEffect(() => {
    if (collectionId) {
      loadCollectionDetails();
    }
  }, [collectionId]);

  const loadCollectionDetails = async () => {
    if (!collectionId || !profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select(
          `
          *,
          institution:institutions (
            id,
            name,
            ap_gazette_no,
            address,
            mandal,
            village,
            district:districts (
              id,
              name
            )
          )
        `
        )
        .eq('id', collectionId)
        .eq('inspector_id', profile.id)
        .single();

      if (error) {
        // Removed debug log collection details:', error);
        return;
      }

      setCollection(data as CollectionWithRelations);
    } catch (error) {
      // Removed debug log collection details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollectionDetails();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number | null | undefined) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'sent_to_accounts':
        return 'Sent to Accounts';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Screen>
        <AppHeader
          title="Collection Details"
          leftActions={[
            {
              icon: 'arrow-back',
              onPress: () => router.back(),
            },
          ]}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!collection) {
    return (
      <Screen>
        <AppHeader
          title="Collection Details"
          leftActions={[
            {
              icon: 'arrow-back',
              onPress: () => router.back(),
            },
          ]}
        />
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Collection not found"
            description="The collection details could not be loaded."
            icon="alert-circle-outline"
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader
        title="Collection Details"
        leftActions={[
          {
            icon: 'arrow-back',
            onPress: () => router.back(),
          },
        ]}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Status Badge */}
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(collection.status)}15` }]}>
              <Ionicons name="checkmark-circle" size={20} color={getStatusColor(collection.status)} />
              <Text style={[styles.statusText, { color: getStatusColor(collection.status) }]}>
                {getStatusLabel(collection.status)}
              </Text>
            </View>
            <Text style={styles.collectionDate}>{formatDate(collection.collection_date)}</Text>
          </View>
        </Card>

        {/* Institution Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Institution Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{collection.institution?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AP Gazette No</Text>
            <Text style={styles.infoValue}>{collection.institution?.ap_gazette_no || 'N/A'}</Text>
          </View>
          {collection.institution?.district?.name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>District</Text>
              <Text style={styles.infoValue}>{collection.institution.district.name}</Text>
            </View>
          )}
          {collection.institution?.mandal && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mandal</Text>
              <Text style={styles.infoValue}>{collection.institution.mandal}</Text>
            </View>
          )}
          {collection.institution?.village && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Village</Text>
              <Text style={styles.infoValue}>{collection.institution.village}</Text>
            </View>
          )}
          {collection.institution?.address && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{collection.institution.address}</Text>
            </View>
          )}
        </Card>

        {/* Collection Amounts */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Collection Amounts</Text>
          </View>
          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrear Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(collection.arrear_amount)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current Amount</Text>
              <Text style={styles.amountValue}>{formatCurrency(collection.current_amount)}</Text>
            </View>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>{formatCurrency(collection.total_amount)}</Text>
          </View>
        </Card>

        {/* Additional Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Additional Information</Text>
          </View>
          {collection.challan_no && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Challan No</Text>
              <Text style={styles.infoValue}>{collection.challan_no}</Text>
            </View>
          )}
          {collection.challan_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Challan Date</Text>
              <Text style={styles.infoValue}>{formatDate(collection.challan_date)}</Text>
            </View>
          )}
          {collection.remarks && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Remarks</Text>
              <Text style={styles.infoValue}>{collection.remarks}</Text>
            </View>
          )}
          {collection.verified_by && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified By</Text>
              <Text style={styles.infoValue}>{collection.verified_by}</Text>
            </View>
          )}
          {collection.verified_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Verified At</Text>
              <Text style={styles.infoValue}>{formatDate(collection.verified_at)}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created At</Text>
            <Text style={styles.infoValue}>{formatDate(collection.created_at)}</Text>
          </View>
          {collection.updated_at && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>{formatDate(collection.updated_at)}</Text>
            </View>
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.lg,
  },
  statusCard: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  collectionDate: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    flex: 2,
    textAlign: 'right',
  },
  amountRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  amountItem: {
    flex: 1,
    backgroundColor: theme.colors.background,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: theme.spacing.md,
    borderTopWidth: 2,
    borderTopColor: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  totalValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.primary,
  },
});
