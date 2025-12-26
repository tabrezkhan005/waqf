import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { CollectionWithRelations, Receipt } from '@/lib/types/database';

export default function VerifyCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const collectionId = params.id ? parseInt(params.id as string) : null;

  const [collection, setCollection] = useState<CollectionWithRelations | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [challanNo, setChallanNo] = useState('');
  const [challanDate, setChallanDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageUrls, setImageUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    if (collectionId) {
      fetchCollection();
      fetchReceipts();
    }
  }, [collectionId]);

  const fetchCollection = async () => {
    if (!collectionId) return;

    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          institution:institutions(*),
          inspector:profiles!collections_inspector_id_fkey(*)
        `)
        .eq('id', collectionId)
        .single();

      if (error) throw error;
      setCollection(data as CollectionWithRelations);
      setChallanNo(data.challan_no || '');
      setChallanDate(data.challan_date || '');
      setRemarks(data.remarks || '');
    } catch (error) {
      console.error('Error fetching collection:', error);
      Alert.alert('Error', 'Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const fetchReceipts = async () => {
    if (!collectionId) return;

    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('collection_id', collectionId);

      if (error) throw error;
      setReceipts(data || []);

      // Fetch image URLs
      const urls: Record<number, string> = {};
      for (const receipt of data || []) {
        const { data: urlData } = await supabase.storage
          .from('receipts')
          .createSignedUrl(receipt.file_path, 3600);

        if (urlData) {
          urls[receipt.id] = urlData.signedUrl;
        }
      }
      setImageUrls(urls);
    } catch (error) {
      console.error('Error fetching receipts:', error);
    }
  };

  const handleVerify = async (status: 'verified' | 'rejected') => {
    if (!collection || !profile) return;

    if (status === 'verified' && !challanNo.trim()) {
      Alert.alert('Error', 'Please enter challan number');
      return;
    }

    setSaving(true);

    try {
      const updateData: any = {
        status,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        remarks: remarks.trim() || null,
      };

      if (status === 'verified') {
        updateData.challan_no = challanNo.trim();
        updateData.challan_date = challanDate || new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('collections')
        .update(updateData)
        .eq('id', collection.id);

      if (error) throw error;

      Alert.alert('Success', `Collection ${status} successfully`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating collection:', error);
      Alert.alert('Error', error.message || 'Failed to update collection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!collection) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Collection not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.institutionName}>
            {collection.institution?.name || 'Unknown Institution'}
          </Text>
          <Text style={styles.inspectorName}>
            Inspector: {collection.inspector?.full_name || 'Unknown'}
          </Text>
          <View style={styles.amountContainer}>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Arrear</Text>
              <Text style={styles.amountValue}>
                ₹{Number(collection.arrear_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Current</Text>
              <Text style={styles.amountValue}>
                ₹{Number(collection.current_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
            <View style={styles.amountItem}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={[styles.amountValue, styles.totalValue]}>
                ₹{Number(collection.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            Collection Date: {new Date(collection.collection_date).toLocaleDateString()}
          </Text>
        </View>

        <View style={styles.receiptsContainer}>
          <Text style={styles.sectionTitle}>Receipts</Text>
          {receipts.map((receipt) => (
            <View key={receipt.id} style={styles.receiptCard}>
              <Text style={styles.receiptType}>{receipt.type.toUpperCase()}</Text>
              {imageUrls[receipt.id] && (
                <Image source={{ uri: imageUrls[receipt.id] }} style={styles.receiptImage} />
              )}
            </View>
          ))}
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Challan Number *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter challan number"
            value={challanNo}
            onChangeText={setChallanNo}
            editable={collection.status !== 'verified'}
          />

          <Text style={styles.label}>Challan Date</Text>
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            value={challanDate}
            onChangeText={setChallanDate}
            editable={collection.status !== 'verified'}
          />

          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter remarks (optional)"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={4}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => handleVerify('rejected')}
              disabled={saving || collection.status === 'verified'}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Reject</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.verifyButton]}
              onPress={() => handleVerify('verified')}
              disabled={saving || collection.status === 'verified'}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  institutionName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  inspectorName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  amountItem: {
    flex: 1,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    color: '#FF9500',
  },
  dateText: {
    fontSize: 12,
    color: '#999',
  },
  receiptsContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  receiptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  receiptType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9500',
    marginBottom: 8,
  },
  receiptImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  verifyButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    padding: 20,
  },
});
