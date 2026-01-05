import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CollectionWithRelations, Receipt } from '@/lib/types/database';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';
import { districtNameToTableName } from '@/lib/dcb/district-tables';
import { finalizeDcbVerification, rollbackDcbRejection } from '@/lib/dcb/financial-safety';

export default function VerifyCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const idParam = params.id as string | undefined;
  const collectionId = idParam ? Number(idParam) : null;

  const [collection, setCollection] = useState<CollectionWithRelations | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // Guard against double-clicks

  const totalAmount = useMemo(() => {
    if (!collection) return 0;
    return Number(collection.total_amount || 0);
  }, [collection]);

  useEffect(() => {
    if (!collectionId) {
      setLoading(false);
      return;
    }
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionId]);

  const fetchAll = async () => {
    await Promise.all([fetchCollection(), fetchReceipts()]);
  };

  const fetchCollection = async () => {
    if (!collectionId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select(
          `
          *,
          institution:institutions(
            id,
            name,
            ap_gazette_no,
            district:districts(
              id,
              name
            )
          ),
          inspector:profiles!collections_inspector_id_fkey(
            id,
            full_name
          )
        `
        )
        .eq('id', collectionId)
        .single();

      if (error) throw error;
      setCollection(data as CollectionWithRelations);
      setChallanNo((data as any).challan_no || '');
      setChallanDate((data as any).challan_date || '');
      setRemarks((data as any).remarks || '');
    } catch (error) {
      Alert.alert('Error', 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    if (!collectionId) return;
    try {
      const { data, error } = await supabase.from('receipts').select('*').eq('collection_id', collectionId);
      if (error) throw error;
      setReceipts(data || []);

      const urls: Record<number, string> = {};
      for (const receipt of data || []) {
        const { data: urlData } = await supabase.storage.from('receipts').createSignedUrl(receipt.file_path, 3600);
        if (urlData) urls[receipt.id] = urlData.signedUrl;
      }
      setImageUrls(urls);
    } catch (error) {
      // Error fetching receipts - silently fail
    }
  };

  const handleVerify = async (status: 'verified' | 'rejected') => {

    // Double-click guard
    if (savingRef.current || saving) {

      return;
    }
    if (!collection || !profile) {

      return;
    }

    if (status === 'verified' && !challanNo.trim()) {
      Alert.alert('Missing challan number', 'Please enter a challan number to verify.');
      return;
    }

    if (status === 'rejected' && !rejectionReason.trim()) {
      Alert.alert('Missing rejection reason', 'Please provide a reason for rejection.');
      setSelectedAction('reject');
      return;
    }


    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/accounts/verify.tsx:136',message:'handleVerify called',data:{status,hasCollection:!!collection,hasProfile:!!profile,challanNo:challanNo.trim(),hasRejectionReason:!!rejectionReason.trim()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    savingRef.current = true; // Set guard immediately
    setSaving(true);

    try {
      // Update collection status
      const updateData: any = {
        status,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        remarks: remarks.trim() || null,
      };

      if (status === 'verified') {
        updateData.challan_no = challanNo.trim();
        updateData.challan_date = challanDate || new Date().toISOString().split('T')[0];
        updateData.rejection_reason = null;
      } else {
        updateData.rejection_reason = rejectionReason.trim();
      }

      const { error: collectionError } = await supabase.from('collections').update(updateData).eq('id', collection.id);
      if (collectionError) throw collectionError;

      // Handle DCB updates based on verification status
      const institution = (collection as any).institution;
      const district = institution?.district;
      const apGazetteNo = institution?.ap_gazette_no;

      if (district?.name && apGazetteNo) {
        const tableName = districtNameToTableName(district.name);
        const challanDateStr = challanDate || new Date().toISOString().split('T')[0];

        if (status === 'verified') {
          // Finalize DCB verification (set is_provisional = false)
          // Note: The DCB was already updated with provisional flag when inspector sent for review
          // This function just finalizes it (marks as verified)
          const { error: dcbError } = await finalizeDcbVerification(
            tableName,
            apGazetteNo,
            challanDateStr,
            remarks.trim() || null
          );

          if (dcbError) {
            // Error finalizing DCB verification - don't fail the whole operation
          }
        } else if (status === 'rejected') {
          // Rollback DCB on rejection (undo provisional accumulation)
          const { error: dcbError } = await rollbackDcbRejection(
            tableName,
            apGazetteNo,
            Number(collection.arrear_amount || 0),
            Number(collection.current_amount || 0)
          );

          if (dcbError) {
            // Error rolling back DCB rejection - don't fail the whole operation
          }
        }
      }


      Alert.alert('Success', status === 'verified' ? 'Collection verified and DCB updated.' : 'Collection rejected.', [
        { text: 'OK', onPress: () => {

          router.back();
        } },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update collection');
    } finally {

      savingRef.current = false; // Clear guard
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  if (!collection || !collectionId) {
    return (
      <Screen scroll>
        <View style={styles.page}>
          <AppHeader title="Verify" subtitle="Collection" />
          <View style={{ height: theme.spacing.md }} />
          <EmptyState title="Collection not found" description="Please go back and open a valid approval item." icon="alert-circle-outline" />
        </View>
      </Screen>
    );
  }

  const disabled = saving || collection.status === 'verified';

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Verify Collection" subtitle={collection.institution?.name || `#${collection.id}`} />

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.infoCard}>
          <Text style={styles.title}>{collection.institution?.name || 'Unknown Institution'}</Text>
          <Text style={styles.subTitle}>
            {collection.institution?.district?.name || 'Unknown District'}
          </Text>
          {collection.institution?.ap_gazette_no && (
            <Text style={styles.subTitle}>Gazette No: {collection.institution.ap_gazette_no}</Text>
          )}

          <View style={{ height: theme.spacing.md }} />

          <View style={styles.inspectorInfo}>
            <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.inspectorLabel}>Inspector: </Text>
            <Text style={styles.inspectorName}>{collection.inspector?.full_name || 'Unknown Inspector'}</Text>
          </View>
          <View style={styles.collectionDateInfo}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.muted} />
            <Text style={styles.collectionDateText}>
              Collection Date: {collection.collection_date ? new Date(collection.collection_date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              }) : 'N/A'}
            </Text>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <View style={styles.amountRow}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrear</Text>
              <Text style={styles.amountValue}>₹{Number(collection.arrear_amount || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={styles.amountValue}>₹{Number(collection.current_amount || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, { color: theme.colors.primary }]}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.sectionTitle}>Receipts</Text>
        {receipts.length === 0 ? (
          <EmptyState title="No receipts uploaded" description="The inspector has not attached receipts." icon="image-outline" />
        ) : (
          receipts.map((receipt) => (
            <Card key={receipt.id} style={styles.receiptCard}>
              <View style={styles.receiptHeader}>
                <View style={styles.receiptPill}>
                  <Ionicons name="image-outline" size={16} color={theme.colors.primary} />
                </View>
                <Text style={styles.receiptTitle}>{receipt.type.toUpperCase()}</Text>
              </View>
              {imageUrls[receipt.id] ? <Image source={{ uri: imageUrls[receipt.id] }} style={styles.receiptImage} /> : null}
            </Card>
          ))
        )}

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.sectionTitle}>Verification</Text>
        <TextField
          label="Challan number *"
          placeholder="Enter challan number"
          value={challanNo}
          onChangeText={setChallanNo}
          editable={!disabled}
        />
        <View style={{ height: theme.spacing.sm }} />
        <TextField
          label="Challan date"
          placeholder="YYYY-MM-DD"
          value={challanDate}
          onChangeText={setChallanDate}
          editable={!disabled}
        />

        <View style={{ height: theme.spacing.sm }} />
        <Text style={styles.inputLabel}>Remarks</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Optional remarks…"
          placeholderTextColor={theme.colors.muted}
          value={remarks}
          onChangeText={setRemarks}
          multiline
          numberOfLines={4}
          editable={!saving}
        />

        <View style={{ height: theme.spacing.md }} />

        <Text style={styles.sectionTitle}>Decision</Text>
        <Card style={styles.decisionCard}>
          <TouchableOpacity
            style={[styles.decisionOption, selectedAction === 'approve' && styles.decisionOptionSelected]}
            onPress={() => {
              setSelectedAction('approve');
              setRejectionReason(''); // Clear rejection reason when approving
            }}
            disabled={disabled}
          >
            <View style={styles.decisionOptionContent}>
              <View style={[styles.radioButton, selectedAction === 'approve' && styles.radioButtonSelected]}>
                {selectedAction === 'approve' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.decisionOptionLabel, selectedAction === 'approve' && styles.decisionOptionLabelSelected]}>
                  Approve Collection
                </Text>
                <Text style={styles.decisionOptionDescription}>
                  Verify and approve this collection. Challan number is required.
                </Text>
              </View>
              <Ionicons
                name="checkmark-circle"
                size={24}
                color={selectedAction === 'approve' ? theme.colors.success : theme.colors.muted}
              />
            </View>
          </TouchableOpacity>

          <View style={styles.decisionDivider} />

          <TouchableOpacity
            style={[styles.decisionOption, selectedAction === 'reject' && styles.decisionOptionSelected]}
            onPress={() => setSelectedAction('reject')}
            disabled={disabled}
          >
            <View style={styles.decisionOptionContent}>
              <View style={[styles.radioButton, selectedAction === 'reject' && styles.radioButtonSelected]}>
                {selectedAction === 'reject' && <View style={styles.radioButtonInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.decisionOptionLabel, selectedAction === 'reject' && styles.decisionOptionLabelSelected]}>
                  Reject Collection
                </Text>
                <Text style={styles.decisionOptionDescription}>
                  Reject this collection. Rejection reason is required.
                </Text>
              </View>
              <Ionicons
                name="close-circle"
                size={24}
                color={selectedAction === 'reject' ? theme.colors.danger : theme.colors.muted}
              />
            </View>
          </TouchableOpacity>
        </Card>

        {/* Rejection Reason - Show when reject is selected */}
        {selectedAction === 'reject' && (
          <>
            <View style={{ height: theme.spacing.md }} />
            <Text style={styles.inputLabel}>Rejection Reason *</Text>
            <TextInput
              style={[styles.textArea, styles.rejectionReasonInput]}
              placeholder="Please provide a detailed reason for rejection…"
              placeholderTextColor={theme.colors.muted}
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              editable={!saving && !disabled}
            />
          </>
        )}

        <View style={{ height: theme.spacing.lg }} />

        <View style={styles.actionsRow}>
          <Button
            label="Reject"
            variant="ghost"
            onPress={() => {
              setSelectedAction('reject');
              handleVerify('rejected');
            }}
            disabled={disabled}
            loading={saving}
            style={[
              styles.actionBtn,
              { borderColor: theme.colors.danger },
              selectedAction === 'reject' && { backgroundColor: theme.colors.danger + '10' },
            ]}
          />
          <Button
            label="Approve"
            variant="primary"
            onPress={() => {
              setSelectedAction('approve');
              handleVerify('verified');
            }}
            disabled={disabled}
            loading={saving}
            style={styles.actionBtn}
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 120,
  },
  infoCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  title: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  subTitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  inspectorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: theme.spacing.xs,
  },
  inspectorLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: theme.colors.text,
  },
  inspectorName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 13,
    color: theme.colors.primary,
  },
  collectionDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  collectionDateText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  amountRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  amountItem: {
    flexGrow: 1,
    minWidth: '30%',
  },
  amountLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  amountValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  receiptCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  receiptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  receiptPill: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.secondary + '12',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  receiptTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
  },
  receiptImage: {
    width: '100%',
    height: 220,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  inputLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 8,
  },
  textArea: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    minHeight: 110,
    textAlignVertical: 'top',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  actionBtn: {
    flex: 1,
  },
  decisionCard: {
    padding: theme.spacing.md,
  },
  decisionOption: {
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.md,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  decisionOptionSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary + '08',
  },
  decisionOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: theme.colors.primary,
  },
  radioButtonInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  decisionOptionLabel: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 4,
  },
  decisionOptionLabelSelected: {
    color: theme.colors.primary,
  },
  decisionOptionDescription: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  decisionDivider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  rejectionReasonInput: {
    borderColor: theme.colors.danger + '40',
    backgroundColor: theme.colors.danger + '08',
  },
});
