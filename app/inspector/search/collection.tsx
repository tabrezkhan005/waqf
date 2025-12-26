import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Institution, InstitutionWithDCB, InstitutionDCB } from '@/lib/types/database';

export default function InstitutionCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const institutionId = params.institutionId as string | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [dcb, setDcb] = useState<InstitutionDCB | null>(null);

  // Collection inputs
  const [cArrear, setCArrear] = useState('');
  const [cCurrent, setCCurrent] = useState('');
  const [remarks, setRemarks] = useState('');

  // Images
  const [billReceipt, setBillReceipt] = useState<string | null>(null);
  const [transactionReceipt, setTransactionReceipt] = useState<string | null>(null);

  // Computed values (use plural column names)
  const cTotal = (parseFloat(cArrear) || 0) + (parseFloat(cCurrent) || 0);
  const bArrear = (dcb?.d_arrears || dcb?.d_arrear || 0) - (parseFloat(cArrear) || 0);
  const bCurrent = (dcb?.d_current || 0) - (parseFloat(cCurrent) || 0);
  const bTotal = bArrear + bCurrent;

  useEffect(() => {
    if (institutionId) {
      loadInstitutionData();
    }
  }, [institutionId]);

  const loadInstitutionData = async () => {
    if (!institutionId) return;

    try {
      setLoading(true);

      // Load institution
      const { data: institutionData, error: instError } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', institutionId)
        .single();

      if (instError) {
        console.error('Error loading institution:', instError);
        Alert.alert('Error', 'Failed to load institution data');
        return;
      }

      setInstitution(institutionData);

      // Load DCB (or create if doesn't exist)
      const { data: dcbData, error: dcbError } = await supabase
        .from('institution_dcb')
        .select('*')
        .eq('institution_id', institutionId)
        .eq('financial_year', '2024-25')
        .single();

      if (dcbError && dcbError.code !== 'PGRST116') {
        console.error('Error loading DCB:', dcbError);
      }

      if (dcbData) {
        setDcb(dcbData);
        // Pre-fill collection values if they exist (use plural names)
        setCArrear((dcbData.c_arrears || 0).toString());
        setCCurrent((dcbData.c_current || 0).toString());
        setRemarks(dcbData.remarks || '');
      } else {
        // Create default DCB entry (demand values should be set by admin)
        const { data: newDcb, error: createError } = await supabase
          .from('institution_dcb')
          .insert({
            institution_id: institutionId,
            financial_year: '2024-25',
            d_arrears: 0,
            d_current: 0,
            c_arrears: 0,
            c_current: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating DCB:', createError);
        } else {
          setDcb(newDcb);
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load institution data');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (type: 'bill' | 'transaction') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'bill') {
        setBillReceipt(result.assets[0].uri);
      } else {
        setTransactionReceipt(result.assets[0].uri);
      }
    }
  };

  const validateInputs = (): boolean => {
    const cArrearNum = parseFloat(cArrear);
    const cCurrentNum = parseFloat(cCurrent);

    if (isNaN(cArrearNum) || isNaN(cCurrentNum)) {
      Alert.alert('Validation Error', 'Please enter valid collection amounts');
      return false;
    }

    if (cArrearNum < 0 || cCurrentNum < 0) {
      Alert.alert('Validation Error', 'Collection amounts cannot be negative');
      return false;
    }

    if (cArrearNum > (dcb?.d_arrears || dcb?.d_arrear || 0)) {
      Alert.alert(
        'Validation Error',
        `Collection arrear (${cArrearNum}) cannot exceed demand arrear (${dcb?.d_arrears || dcb?.d_arrear || 0})`
      );
      return false;
    }

    if (cCurrentNum > (dcb?.d_current || 0)) {
      Alert.alert(
        'Validation Error',
        `Collection current (${cCurrentNum}) cannot exceed demand current (${dcb?.d_current || 0})`
      );
      return false;
    }

    return true;
  };

  const uploadImage = async (uri: string, path: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${path}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) {
        console.error('Error uploading image:', uploadError);
        return null;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSave = async () => {
    if (!institutionId || !profile || !validateInputs()) return;

    try {
      setSaving(true);

      const cArrearNum = parseFloat(cArrear);
      const cCurrentNum = parseFloat(cCurrent);

      // Upload images if selected
      let billReceiptPath: string | null = null;
      let transactionReceiptPath: string | null = null;

      if (billReceipt) {
        billReceiptPath = await uploadImage(
          billReceipt,
          `${profile.id}/${institutionId}/bill_${Date.now()}`
        );
      }

      if (transactionReceipt) {
        transactionReceiptPath = await uploadImage(
          transactionReceipt,
          `${profile.id}/${institutionId}/transaction_${Date.now()}`
        );
      }

      // Update DCB collection values (use plural names and include receipt info)
      const updateData: any = {
        c_arrears: cArrearNum,
        c_current: cCurrentNum,
        remarks: remarks.trim() || null,
      };

      // Add receipt file paths if uploaded
      if (billReceiptPath) {
        updateData.receipt_file_path = billReceiptPath;
      }
      if (transactionReceiptPath) {
        updateData.bank_receipt_file_path = transactionReceiptPath;
      }

      const { error: dcbError } = await supabase
        .from('institution_dcb')
        .update(updateData)
        .eq('institution_id', institutionId)
        .eq('financial_year', '2024-25');

      if (dcbError) {
        console.error('Error updating DCB:', dcbError);
        Alert.alert('Error', 'Failed to save collection data');
        return;
      }

      // Create or update collection record
      const { data: existingCollection } = await supabase
        .from('collections')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('inspector_id', profile.id)
        .eq('collection_date', new Date().toISOString().split('T')[0])
        .single();

      if (existingCollection) {
        // Update existing collection
        const { error: updateError } = await supabase
          .from('collections')
          .update({
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            total_amount: cArrearNum + cCurrentNum,
          })
          .eq('id', existingCollection.id);

        if (updateError) {
          console.error('Error updating collection:', updateError);
          Alert.alert('Error', 'Failed to save collection');
          return;
        }

        // Update receipts if uploaded
        if (billReceiptPath) {
          await supabase.from('receipts').upsert({
            collection_id: existingCollection.id,
            type: 'bill',
            file_path: billReceiptPath,
            file_name: `bill_${Date.now()}.jpg`,
          });
        }

        if (transactionReceiptPath) {
          await supabase.from('receipts').upsert({
            collection_id: existingCollection.id,
            type: 'transaction',
            file_path: transactionReceiptPath,
            file_name: `transaction_${Date.now()}.jpg`,
          });
        }
      } else {
        // Create new collection
        const { data: newCollection, error: createError } = await supabase
          .from('collections')
          .insert({
            institution_id: institutionId,
            inspector_id: profile.id,
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            total_amount: cArrearNum + cCurrentNum,
            status: 'pending',
            collection_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating collection:', createError);
          Alert.alert('Error', 'Failed to save collection');
          return;
        }

        // Upload receipts
        if (billReceiptPath && newCollection) {
          await supabase.from('receipts').insert({
            collection_id: newCollection.id,
            type: 'bill',
            file_path: billReceiptPath,
            file_name: `bill_${Date.now()}.jpg`,
          });
        }

        if (transactionReceiptPath && newCollection) {
          await supabase.from('receipts').insert({
            collection_id: newCollection.id,
            type: 'transaction',
            file_path: transactionReceiptPath,
            file_name: `transaction_${Date.now()}.jpg`,
          });
        }
      }

      Alert.alert('Success', 'Collection saved successfully', [
        {
          text: 'View Collections',
          onPress: () => router.push('/inspector/collections'),
        },
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      console.error('Error saving collection:', error);
      Alert.alert('Error', 'Failed to save collection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A9D5C" />
      </View>
    );
  }

  if (!institution || !dcb) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Institution data not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Institution Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Institution Details</Text>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>AP No</Text>
          <Text style={styles.infoValue}>{(dcb as any)?.ap_no || institution.code || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{(dcb as any)?.institution_name || institution.name}</Text>
        </View>
        {(dcb as any)?.district_name && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>District</Text>
            <Text style={styles.infoValue}>{(dcb as any).district_name}</Text>
          </View>
        )}
        {(dcb as any)?.village && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Village</Text>
            <Text style={styles.infoValue}>{(dcb as any).village}</Text>
          </View>
        )}
        {(dcb as any)?.mandal && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Mandal</Text>
            <Text style={styles.infoValue}>{(dcb as any).mandal}</Text>
          </View>
        )}
        {(dcb as any)?.inspector_name && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Inspector</Text>
            <Text style={styles.infoValue}>{(dcb as any).inspector_name}</Text>
          </View>
        )}
        {institution.address && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{institution.address}</Text>
          </View>
        )}
      </View>

      {/* DCB Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>DCB (Demand, Collection, Balance)</Text>

        {/* Demand (Read-only) */}
        <View style={styles.dcbCard}>
          <Text style={styles.dcbCardTitle}>Demand (Read-only)</Text>
          <View style={styles.dcbRow}>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>D-Arrear</Text>
              <Text style={styles.dcbValue}>₹{(dcb.d_arrears || dcb.d_arrear || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>D-Current</Text>
              <Text style={styles.dcbValue}>₹{dcb.d_current.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>D-Total</Text>
              <Text style={styles.dcbValue}>₹{dcb.d_total.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Collection (Input) */}
        <View style={[styles.dcbCard, styles.collectionCard]}>
          <Text style={styles.dcbCardTitle}>Collection (Input)</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>C-Arrear</Text>
              <TextInput
                style={styles.input}
                value={cArrear}
                onChangeText={setCArrear}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#8E8E93"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>C-Current</Text>
              <TextInput
                style={styles.input}
                value={cCurrent}
                onChangeText={setCCurrent}
                placeholder="0"
                keyboardType="numeric"
                placeholderTextColor="#8E8E93"
              />
            </View>
          </View>
          <View style={styles.computedRow}>
            <Text style={styles.computedLabel}>C-Total</Text>
            <Text style={styles.computedValue}>₹{cTotal.toLocaleString('en-IN')}</Text>
          </View>
        </View>

        {/* Balance (Computed) */}
        <View style={[styles.dcbCard, styles.balanceCard]}>
          <Text style={styles.dcbCardTitle}>Balance (Computed)</Text>
          <View style={styles.dcbRow}>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>B-Arrear</Text>
              <Text style={[styles.dcbValue, bArrear < 0 && styles.negativeBalance]}>
                ₹{bArrear.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>B-Current</Text>
              <Text style={[styles.dcbValue, bCurrent < 0 && styles.negativeBalance]}>
                ₹{bCurrent.toLocaleString('en-IN')}
              </Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>B-Total</Text>
              <Text style={[styles.dcbValue, bTotal < 0 && styles.negativeBalance]}>
                ₹{bTotal.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Proof Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Proof Upload</Text>
        <View style={styles.uploadRow}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage('bill')}
          >
            <Ionicons name="camera-outline" size={24} color="#1A9D5C" />
            <Text style={styles.uploadButtonText}>Upload Receipt</Text>
            {billReceipt && (
              <Image source={{ uri: billReceipt }} style={styles.uploadThumbnail} />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => pickImage('transaction')}
          >
            <Ionicons name="receipt-outline" size={24} color="#1A9D5C" />
            <Text style={styles.uploadButtonText}>Upload Bank Receipt</Text>
            {transactionReceipt && (
              <Image source={{ uri: transactionReceipt }} style={styles.uploadThumbnail} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Remarks */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Remarks</Text>
        <TextInput
          style={styles.remarksInput}
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Enter any remarks or notes..."
          placeholderTextColor="#8E8E93"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Save Collection</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#FF3B30',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  dcbCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  collectionCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A9D5C',
  },
  balanceCard: {
    backgroundColor: '#F0FDF4',
  },
  dcbCardTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  dcbRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dcbItem: {
    flex: 1,
    alignItems: 'center',
  },
  dcbLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  dcbValue: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
  },
  negativeBalance: {
    color: '#FF3B30',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 12,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
  computedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  computedLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  computedValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1A9D5C',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginTop: 8,
  },
  uploadThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginTop: 8,
  },
  saveButton: {
    backgroundColor: '#1A9D5C',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  remarksInput: {
    backgroundColor: '#F7F9FC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 12,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    minHeight: 100,
  },
});
