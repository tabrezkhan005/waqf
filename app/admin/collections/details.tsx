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
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';

interface DCBData {
  id: string;
  institution_id: string;
  inspector_id: string;
  extent_dry: number;
  extent_wet: number;
  extent_total: number;
  demand_arrears: number;
  demand_current: number;
  demand_total: number;
  collection_arrears: number;
  collection_current: number;
  collection_total: number;
  balance_arrears: number;
  balance_current: number;
  balance_total: number;
  financial_year: string;
  remarks: string | null;
  created_at: string;
  institution?: {
    id: string;
    name: string;
    ap_gazette_no: string;
    mandal: string | null;
    village: string | null;
    district?: {
      id: string;
      name: string;
    };
  };
  inspector?: {
    id: string;
    full_name: string;
  };
}

export default function CollectionDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const collectionId = params.id as string | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dcbData, setDcbData] = useState<DCBData | null>(null);

  useEffect(() => {
    if (collectionId) {
      loadCollectionDetails();
    }
  }, [collectionId]);

  const loadCollectionDetails = async () => {
    if (!collectionId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('institution_dcb')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            ap_gazette_no,
            mandal,
            village,
            district:districts (
              id,
              name
            )
          ),
          inspector:profiles!institution_dcb_inspector_id_fkey (
            id,
            full_name
          )
        `)
        .eq('id', collectionId)
        .single();

      if (error) throw error;
      setDcbData(data as DCBData);
    } catch (error) {
      console.error('Error loading collection details:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCollectionDetails();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collection Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!dcbData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collection Details</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.emptyContainer}>
          <EmptyState
            title="Collection not found"
            description="The collection details could not be loaded."
            icon="alert-circle-outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Collection Details</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Institution Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="business-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Institution Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{dcbData.institution?.name || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>AP Gazette No</Text>
            <Text style={styles.infoValue}>{dcbData.institution?.ap_gazette_no || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue}>{dcbData.institution?.district?.name || 'N/A'}</Text>
          </View>
          {dcbData.institution?.mandal && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Mandal</Text>
              <Text style={styles.infoValue}>{dcbData.institution.mandal}</Text>
            </View>
          )}
          {dcbData.institution?.village && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Village</Text>
              <Text style={styles.infoValue}>{dcbData.institution.village}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Inspector</Text>
            <Text style={styles.infoValue}>{dcbData.inspector?.full_name || 'N/A'}</Text>
          </View>
        </Card>

        {/* Land Extent */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="map-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Land Extent (Acres)</Text>
          </View>
          <View style={styles.amountGrid}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Dry</Text>
              <Text style={styles.amountValue}>{Number(dcbData.extent_dry || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Wet</Text>
              <Text style={styles.amountValue}>{Number(dcbData.extent_wet || 0).toFixed(2)}</Text>
            </View>
            <View style={[styles.amountItem, styles.amountItemTotal]}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, { color: theme.colors.primary }]}>
                {Number(dcbData.extent_total || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Demand */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="document-text-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Demand (₹)</Text>
          </View>
          <View style={styles.amountGrid}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrears</Text>
              <Text style={styles.amountValue}>{formatCurrency(dcbData.demand_arrears)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={styles.amountValue}>{formatCurrency(dcbData.demand_current)}</Text>
            </View>
            <View style={[styles.amountItem, styles.amountItemTotal]}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, { color: theme.colors.primary }]}>
                {formatCurrency(dcbData.demand_total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Collection */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="cash-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Collection (₹)</Text>
          </View>
          <View style={styles.amountGrid}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrears</Text>
              <Text style={styles.amountValue}>{formatCurrency(dcbData.collection_arrears)}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={styles.amountValue}>{formatCurrency(dcbData.collection_current)}</Text>
            </View>
            <View style={[styles.amountItem, styles.amountItemTotal]}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, { color: theme.colors.success }]}>
                {formatCurrency(dcbData.collection_total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Balance */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Balance (₹)</Text>
          </View>
          <View style={styles.amountGrid}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrears</Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: dcbData.balance_arrears < 0 ? theme.colors.danger : theme.colors.text },
                ]}
              >
                {formatCurrency(dcbData.balance_arrears)}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text
                style={[
                  styles.amountValue,
                  { color: dcbData.balance_current < 0 ? theme.colors.danger : theme.colors.text },
                ]}
              >
                {formatCurrency(dcbData.balance_current)}
              </Text>
            </View>
            <View style={[styles.amountItem, styles.amountItemTotal]}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text
                style={[
                  styles.amountValue,
                  {
                    color:
                      dcbData.balance_total < 0
                        ? theme.colors.danger
                        : dcbData.balance_total > 0
                          ? theme.colors.warning
                          : theme.colors.success,
                  },
                ]}
              >
                {formatCurrency(dcbData.balance_total)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Additional Information */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.primary} />
            <Text style={styles.cardTitle}>Additional Information</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Financial Year</Text>
            <Text style={styles.infoValue}>{dcbData.financial_year || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created At</Text>
            <Text style={styles.infoValue}>{formatDate(dcbData.created_at)}</Text>
          </View>
          {dcbData.remarks && (
            <View style={styles.remarksContainer}>
              <Text style={styles.infoLabel}>Remarks</Text>
              <Text style={styles.remarksText}>{dcbData.remarks}</Text>
            </View>
          )}
        </Card>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
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
  card: {
    marginBottom: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
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
    flex: 1,
    textAlign: 'right',
  },
  amountGrid: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
  },
  amountItem: {
    flex: 1,
    minWidth: '30%',
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    alignItems: 'center',
  },
  amountItemTotal: {
    backgroundColor: theme.colors.primary + '10',
    borderWidth: 1,
    borderColor: theme.colors.primary + '30',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginBottom: theme.spacing.xs,
  },
  amountValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  remarksContainer: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
  },
  remarksText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  bottomSpacer: {
    height: 100,
  },
});
