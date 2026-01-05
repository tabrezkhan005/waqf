import React, { useState, useEffect, useRef } from 'react';
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
import * as Crypto from 'expo-crypto';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { queryDistrictDCB, districtNameToTableName, getDistrictName } from '@/lib/dcb/district-tables';
import {
  validateOverCollection,
  updateDcbProvisional,
  getCurrentFinancialYear,
} from '@/lib/dcb/financial-safety';
import type { Institution, InstitutionWithDCB, InstitutionDCB } from '@/lib/types/database';

export default function InstitutionCollectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const institutionId = params.institutionId as string | null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false); // Guard against double-clicks
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [dcb, setDcb] = useState<InstitutionDCB | null>(null);
  const [districtName, setDistrictName] = useState<string | null>(null); // Cache district name to avoid re-fetching

  // Collection inputs - NEW payment amounts only (not cumulative)
  const [cArrear, setCArrear] = useState('');
  const [cCurrent, setCCurrent] = useState('');
  const [remarks, setRemarks] = useState('');
  const [overCollectionReason, setOverCollectionReason] = useState('');

  // Images
  const [billReceipt, setBillReceipt] = useState<string | null>(null);
  const [transactionReceipt, setTransactionReceipt] = useState<string | null>(null);

  // Computed values
  const cTotal = (parseFloat(cArrear) || 0) + (parseFloat(cCurrent) || 0);
  // Existing collections from DCB (cumulative totals)
  const existingCollectionArrears = dcb?.collection_arrears || 0;
  const existingCollectionCurrent = dcb?.collection_current || 0;
  // New payment amounts (what inspector is entering now)
  const newCollectionArrears = parseFloat(cArrear) || 0;
  const newCollectionCurrent = parseFloat(cCurrent) || 0;
  // Total collections after adding new payment (for display)
  const totalCollectionArrears = existingCollectionArrears + newCollectionArrears;
  const totalCollectionCurrent = existingCollectionCurrent + newCollectionCurrent;
  // Balance = Demand - Total Collection (existing + new)
  const bArrear = (dcb?.demand_arrears || 0) - totalCollectionArrears;
  const bCurrent = (dcb?.demand_current || 0) - totalCollectionCurrent;
  const bTotal = bArrear + bCurrent;

  useEffect(() => {
    if (institutionId) {
      loadInstitutionData();
    }
  }, [institutionId]);

  const loadInstitutionData = async () => {
    if (!institutionId || !profile?.district_id) return;

    try {
      setLoading(true);

      // OPTIMIZATION: Load institution and district name in parallel
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:80',message:'Starting Promise.all for institution data',data:{institutionId,districtId:profile?.district_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      const [institutionRes, districtRes] = await Promise.all([
        // Load institution
        supabase
          .from('institutions')
          .select('*')
          .eq('id', institutionId)
          .single(),
        // Get district name in parallel (not sequential)
        supabase
          .from('districts')
          .select('name')
          .eq('id', profile.district_id)
          .single(),
      ]);
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:93',message:'Promise.all completed for institution data',data:{institutionError:!!institutionRes.error,districtError:!!districtRes.error,hasInstitution:!!institutionRes.data,hasDistrict:!!districtRes.data},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (institutionRes.error) {
        // Removed debug log institution:', institutionRes.error);
        Alert.alert('Error', 'Failed to load institution data');
        return;
      }

      const institutionData = institutionRes.data;

      // Verify institution belongs to inspector's district
      if (institutionData.district_id !== profile.district_id) {
        Alert.alert('Error', 'This institution does not belong to your district');
        return;
      }

      setInstitution(institutionData);

      if (districtRes.error || !districtRes.data) {
        // Removed debug log district for inspector');
        Alert.alert('Error', 'District not found. Please contact admin.');
        return;
      }

      const districtNameValue = districtRes.data.name;
      setDistrictName(districtNameValue); // Cache district name

      // Load DCB from district-specific table using ap_gazette_no
      const apGazetteNo = institutionData.ap_gazette_no;
      if (!apGazetteNo) {
        Alert.alert('Error', 'Institution AP Gazette No not found');
        return;
      }

      const tableName = districtNameToTableName(districtNameValue);
      // OPTIMIZATION: Select only needed columns instead of '*'
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:135',message:'Querying DCB',data:{tableName,apGazetteNo},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { data: dcbData, error: dcbError } = await supabase
        .from(tableName)
        .select('ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, receiptno_date, challanno_date, remarks, financial_year')
        .eq('ap_gazette_no', apGazetteNo)
        .maybeSingle();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:139',message:'DCB query result',data:{hasData:!!dcbData,hasError:!!dcbError,errorCode:dcbError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      if (dcbError && dcbError.code !== 'PGRST116') {
        // Removed debug log DCB:', dcbError);
        // If DCB doesn't exist, that's okay - we'll show empty values
      }

      if (dcbData) {
        // Map district table data to expected format
        const mappedDcb = {
          ...dcbData,
          ap_no: dcbData.ap_gazette_no,
          institution_name: dcbData.institution_name,
          district_name: districtNameValue,
          inspector_name: profile.full_name,
        };
        setDcb(mappedDcb as any);
        // Don't pre-fill collection inputs - they should be empty for NEW payments
        // Existing collections are shown in the UI as read-only
        setCArrear(''); // Empty - inspector enters NEW payment amount
        setCCurrent(''); // Empty - inspector enters NEW payment amount
        setRemarks(dcbData.remarks || '');
      } else {
        // DCB entry doesn't exist - show empty values
        // The DCB should be created by admin during data import
        const emptyDcb = {
          ap_gazette_no: apGazetteNo,
          institution_name: institutionData.name,
          demand_arrears: 0,
          demand_current: 0,
          collection_arrears: 0,
          collection_current: 0,
          collection_total: 0,
          balance_arrears: 0,
          balance_current: 0,
          balance_total: 0,
          remarks: null,
          ap_no: apGazetteNo,
          institution_name: institutionData.name,
          district_name: districtNameValue,
          inspector_name: profile.full_name,
        };
        setDcb(emptyDcb as any);
      }
    } catch (error) {
      // Removed debug log data:', error);
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

  const validateInputs = async (): Promise<boolean> => {
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

    // Basic validation: check if both are zero
    if (cArrearNum === 0 && cCurrentNum === 0) {
      Alert.alert('Validation Error', 'Please enter at least one collection amount');
      return false;
    }

    // Financial Safety: Check for over-collection using database function
    if (!institution || !profile?.district_id) {
      return false;
    }

    // OPTIMIZATION: Use cached district name instead of re-fetching
    if (!districtName) {
      // Fallback: fetch if not cached (shouldn't happen normally)
      const fetchedDistrictName = await getDistrictName(profile.district_id);
      if (!fetchedDistrictName) {
        return false;
      }
      setDistrictName(fetchedDistrictName);
      // Use the fetched name for this validation
      const validationError = await validateOverCollection(
        fetchedDistrictName,
        institution.ap_gazette_no,
        cArrearNum,
        cCurrentNum,
        overCollectionReason
      );
      if (validationError) {
        Alert.alert('Over-Collection Detected', validationError);
        return false;
      }
      return true;
    }

    const apGazetteNo = institution.ap_gazette_no;
    if (!apGazetteNo) {
      return false;
    }

    // Validate over-collection (requires reason if exceeds remaining balance)
    const validationError = await validateOverCollection(
      districtName, // Use cached district name
      institution.ap_gazette_no,
      cArrearNum,
      cCurrentNum,
      overCollectionReason
    );

    if (validationError) {
      Alert.alert('Over-Collection Detected', validationError);
      return false;
    }

    return true;
  };

  const uploadImage = async (
    uri: string,
    path: string,
    type: 'bill' | 'transaction',
    collectionId?: number
  ): Promise<{ path: string; hash: string } | null> => {

    try {
      const response = await fetch(uri);
      if (!response.ok) {

        // Removed debug log fetch image URI:', response.status, response.statusText);
        return null;
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Compute SHA-256 hash for integrity
      const hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Array.from(uint8Array).map((b) => String.fromCharCode(b)).join('')
      );

      // Check for duplicate (if collectionId is provided)
      if (collectionId) {
        const { data: existing } = await supabase
          .from('receipts')
          .select('id')
          .eq('collection_id', collectionId)
          .eq('file_hash', hash)
          .single();

        if (existing) {

          Alert.alert('Duplicate', 'This receipt has already been uploaded.');
          return null;
        }
      }

      const fileExt = uri.split('.').pop();
      const fileName = `${path}.${fileExt}`;
      const bucketName = type === 'bill' ? 'receipt' : 'bank-receipt';


      // Check if bucket exists by attempting to list it
      const { data: bucketList, error: bucketError } = await supabase.storage.listBuckets();

      if (bucketError || !bucketList?.find(b => b.name === bucketName)) {

        Alert.alert(
          'Bucket Not Found',
          `Storage bucket "${bucketName}" does not exist. Please contact administrator to create it.`
        );
        return null;
      }


      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, blob, {
          contentType: `image/${fileExt}`,
          upsert: false,
        });

      if (uploadError) {

        console.error(`Error uploading image to ${bucketName}:`, uploadError);
        Alert.alert(
          'Upload Error',
          `Failed to upload ${type === 'bill' ? 'bill receipt' : 'bank receipt'}.\n\nError: ${uploadError.message}`
        );
        return null;
      }

      const { data: { publicUrl } } = supabase.storage.from(bucketName).getPublicUrl(fileName);


      return { path: publicUrl, hash };
    } catch (error: any) {

      console.error('Error uploading image:', error);
      Alert.alert('Upload Error', `Failed to upload image: ${error?.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleSave = async () => {

    // Double-click guard
    if (savingRef.current || saving) {

      return;
    }
    if (!institutionId || !profile) {

      return;
    }


    // Validate inputs (includes over-collection check)
    const isValid = await validateInputs();
    if (!isValid) {

      return;
    }


    try {
      savingRef.current = true; // Set guard immediately
      setSaving(true);


      const cArrearNum = parseFloat(cArrear);
      const cCurrentNum = parseFloat(cCurrent);
      const collectionDate = new Date().toISOString().split('T')[0];
      const financialYear = getCurrentFinancialYear(new Date(collectionDate));

      // Get district name and table name
      if (!institution || !profile?.district_id) {
        Alert.alert('Error', 'Missing institution or district information');
        return;
      }

      // OPTIMIZATION: Use cached district name instead of re-fetching
      if (!districtName) {
        Alert.alert('Error', 'District not found. Please contact admin.');
        return;
      }

      const tableName = districtNameToTableName(districtName);
      const apGazetteNo = institution.ap_gazette_no;

      if (!apGazetteNo) {
        Alert.alert('Error', 'Institution AP Gazette No not found');
        return;
      }

      // Create or update collection record first
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:424',message:'Checking for existing collection (handleSave)',data:{institutionId,collectionDate,profileId:profile?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { data: existingCollection, error: existingError } = await supabase
        .from('collections')
        .select('id, status')
        .eq('institution_id', institutionId)
        .eq('inspector_id', profile.id)
        .eq('collection_date', collectionDate)
        .maybeSingle();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:431',message:'Existing collection query result (handleSave)',data:{hasData:!!existingCollection,hasError:!!existingError,errorCode:existingError?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let collectionId: number;

      if (existingCollection) {
        // Update existing collection
        const { error: updateError } = await supabase
          .from('collections')
          .update({
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            financial_year: financialYear,
            over_collection_reason: overCollectionReason.trim() || null,
            status: existingCollection.status === 'pending' ? 'pending' : existingCollection.status,
          })
          .eq('id', existingCollection.id);

        if (updateError) {
          console.error('Error updating collection:', updateError);
          Alert.alert('Error', 'Failed to save collection');
          return;
        }

        collectionId = existingCollection.id;
      } else {
        // Create new collection
        const { data: newCollection, error: createError } = await supabase
          .from('collections')
          .insert({
            institution_id: institutionId,
            inspector_id: profile.id,
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            financial_year: financialYear,
            over_collection_reason: overCollectionReason.trim() || null,
            status: 'pending',
            collection_date: collectionDate,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating collection:', createError);
          Alert.alert('Error', 'Failed to save collection');
          return;
        }

        collectionId = newCollection.id;
      }

      // Upload images with hash computation
      if (billReceipt) {
        const uploadResult = await uploadImage(
          billReceipt,
          `${profile.id}/${institutionId}/bill_${Date.now()}`,
          'bill',
          collectionId
        );
        if (uploadResult) {
          await supabase.from('receipts').upsert({
            collection_id: collectionId,
            type: 'bill',
            file_path: uploadResult.path,
            file_name: `bill_${Date.now()}.jpg`,
            file_hash: uploadResult.hash,
          });
        }
      }

      if (transactionReceipt) {
        const uploadResult = await uploadImage(
          transactionReceipt,
          `${profile.id}/${institutionId}/transaction_${Date.now()}`,
          'transaction',
          collectionId
        );
        if (uploadResult) {
          await supabase.from('receipts').upsert({
            collection_id: collectionId,
            type: 'transaction',
            file_path: uploadResult.path,
            file_name: `transaction_${Date.now()}.jpg`,
            file_hash: uploadResult.hash,
          });
        }
      }

      // DRAFT: Update DCB with provisional flag (for display purposes)
      // This marks the collection as provisional until verified
      const { error: dcbError } = await updateDcbProvisional(
        tableName,
        apGazetteNo,
        cArrearNum,
        cCurrentNum,
        remarks.trim() || null,
        financialYear
      );

      if (dcbError) {
        console.error('Error updating DCB provisional:', dcbError);
        // Don't fail the whole operation, just log the error
      }


      Alert.alert('Success', 'Collection saved successfully', [
        {
          text: 'View Collections',
          onPress: () => {

            router.push('/inspector/collections');
          },
        },
        {
          text: 'OK',
          onPress: () => {

            router.back();
          },
        },
      ]);
    } catch (error: any) {

      console.error('Error saving collection:', error);
      Alert.alert('Error', 'Failed to save collection');
    } finally {

      savingRef.current = false; // Clear guard
      setSaving(false);
    }
  };

  const handleSendForReview = async () => {

    // Double-click guard
    if (savingRef.current || saving) {

      return;
    }
    if (!institutionId || !profile) {

      return;
    }


    // Validate inputs (includes over-collection check)
    const isValid = await validateInputs();
    if (!isValid) {

      return;
    }

    try {
      savingRef.current = true; // Set guard immediately
      setSaving(true);


      const cArrearNum = parseFloat(cArrear);
      const cCurrentNum = parseFloat(cCurrent);
      const collectionDate = new Date().toISOString().split('T')[0];
      const financialYear = getCurrentFinancialYear(new Date(collectionDate));

      // Get district name and table name
      if (!institution || !profile?.district_id) {
        Alert.alert('Error', 'Missing institution or district information');
        return;
      }

      // OPTIMIZATION: Use cached district name instead of re-fetching
      if (!districtName) {
        Alert.alert('Error', 'District not found. Please contact admin.');
        return;
      }

      const tableName = districtNameToTableName(districtName);
      const apGazetteNo = institution.ap_gazette_no;

      if (!apGazetteNo) {
        Alert.alert('Error', 'Institution AP Gazette No not found');
        return;
      }

      // Create or update collection record first
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:606',message:'Checking for existing collection',data:{institutionId,collectionDate,profileId:profile?.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      const { data: existingCollection, error: existingError } = await supabase
        .from('collections')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('inspector_id', profile.id)
        .eq('collection_date', collectionDate)
        .maybeSingle();
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/d30bd98a-a97d-4a8d-b6e1-ba42aa3528e9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/inspector/search/collection.tsx:613',message:'Existing collection query result',data:{hasData:!!existingCollection,hasError:!!existingError,errorCode:existingError?.code,errorMessage:existingError?.message},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion

      let collectionId: number;

      if (existingCollection) {
        // Update existing collection and send for review
        const { error: updateError } = await supabase
          .from('collections')
          .update({
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            financial_year: financialYear,
            over_collection_reason: overCollectionReason.trim() || null,
            status: 'sent_to_accounts', // This will trigger notification
          })
          .eq('id', existingCollection.id);

        if (updateError) {
          console.error('Error updating collection:', updateError);
          Alert.alert('Error', 'Failed to send collection for review');
          return;
        }

        collectionId = existingCollection.id;
      } else {
        // Create new collection and send for review
        const { data: newCollection, error: createError } = await supabase
          .from('collections')
          .insert({
            institution_id: institutionId,
            inspector_id: profile.id,
            arrear_amount: cArrearNum,
            current_amount: cCurrentNum,
            financial_year: financialYear,
            over_collection_reason: overCollectionReason.trim() || null,
            status: 'sent_to_accounts', // This will trigger notification
            collection_date: collectionDate,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating collection:', createError);
          Alert.alert('Error', 'Failed to send collection for review');
          return;
        }

        collectionId = newCollection.id;
      }

      // Upload images with hash computation
      if (billReceipt) {
        const uploadResult = await uploadImage(
          billReceipt,
          `${profile.id}/${institutionId}/bill_${Date.now()}`,
          'bill',
          collectionId
        );
        if (uploadResult) {
          await supabase.from('receipts').upsert({
            collection_id: collectionId,
            type: 'bill',
            file_path: uploadResult.path,
            file_name: `bill_${Date.now()}.jpg`,
            file_hash: uploadResult.hash,
          });
        }
      }

      if (transactionReceipt) {
        const uploadResult = await uploadImage(
          transactionReceipt,
          `${profile.id}/${institutionId}/transaction_${Date.now()}`,
          'transaction',
          collectionId
        );
        if (uploadResult) {
          await supabase.from('receipts').upsert({
            collection_id: collectionId,
            type: 'transaction',
            file_path: uploadResult.path,
            file_name: `transaction_${Date.now()}.jpg`,
            file_hash: uploadResult.hash,
          });
        }
      }

      // SEND FOR REVIEW: Update DCB with provisional flag
      // This marks the collection as provisional until verified
      const { error: dcbError } = await updateDcbProvisional(
        tableName,
        apGazetteNo,
        cArrearNum,
        cCurrentNum,
        remarks.trim() || null,
        financialYear
      );

      if (dcbError) {
        console.error('Error updating DCB provisional:', dcbError);
        // Don't fail the whole operation, just log the error
      }


      Alert.alert('Success', 'Collection sent for review. Accounts team will be notified.', [
        {
          text: 'View Collections',
          onPress: () => {

            router.push('/inspector/collections');
          },
        },
        {
          text: 'OK',
          onPress: () => {

            router.back();
          },
        },
      ]);
    } catch (error: any) {

      console.error('Error sending collection for review:', error);
      Alert.alert('Error', 'Failed to send collection for review');
    } finally {

      savingRef.current = false; // Clear guard
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
          <Text style={styles.infoValue}>{(dcb as any)?.ap_no || institution.ap_gazette_no || 'N/A'}</Text>
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
              <Text style={styles.dcbValue}>₹{(dcb.demand_arrears || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>D-Current</Text>
              <Text style={styles.dcbValue}>₹{(dcb.demand_current || 0).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.dcbItem}>
              <Text style={styles.dcbLabel}>D-Total</Text>
              <Text style={styles.dcbValue}>₹{((dcb.demand_arrears || 0) + (dcb.demand_current || 0)).toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Previous Collections (Read-only) */}
        {(existingCollectionArrears > 0 || existingCollectionCurrent > 0) && (
          <View style={[styles.dcbCard, { backgroundColor: '#F0F9FF', borderColor: '#3B82F6' }]}>
            <Text style={styles.dcbCardTitle}>Previous Collections (Read-only)</Text>
            <View style={styles.dcbRow}>
              <View style={styles.dcbItem}>
                <Text style={styles.dcbLabel}>C-Arrear</Text>
                <Text style={styles.dcbValue}>₹{existingCollectionArrears.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.dcbItem}>
                <Text style={styles.dcbLabel}>C-Current</Text>
                <Text style={styles.dcbValue}>₹{existingCollectionCurrent.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.dcbItem}>
                <Text style={styles.dcbLabel}>C-Total</Text>
                <Text style={styles.dcbValue}>₹{(existingCollectionArrears + existingCollectionCurrent).toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* New Collection (Input) */}
        <View style={[styles.dcbCard, styles.collectionCard]}>
          <Text style={styles.dcbCardTitle}>New Payment (Input)</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New C-Arrear</Text>
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
              <Text style={styles.inputLabel}>New C-Current</Text>
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
            <Text style={styles.computedLabel}>New Payment Total</Text>
            <Text style={styles.computedValue}>₹{cTotal.toLocaleString('en-IN')}</Text>
          </View>
          {(existingCollectionArrears > 0 || existingCollectionCurrent > 0) && (
            <View style={[styles.computedRow, { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#E5E5EA' }]}>
              <Text style={styles.computedLabel}>Total After This Payment</Text>
              <Text style={[styles.computedValue, { color: '#1A9D5C' }]}>₹{totalCollectionArrears + totalCollectionCurrent}</Text>
            </View>
          )}
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

      {/* Over-Collection Reason (shown if over-collection detected) */}
      {(newCollectionArrears > 0 || newCollectionCurrent > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Over-Collection Reason{' '}
            <Text style={styles.requiredAsterisk}>*</Text>
          </Text>
          <Text style={styles.helperText}>
            If this collection exceeds the remaining balance, please provide a reason.
          </Text>
          <TextInput
            style={styles.remarksInput}
            value={overCollectionReason}
            onChangeText={setOverCollectionReason}
            placeholder="Enter reason for over-collection (if applicable)..."
            placeholderTextColor="#8E8E93"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.saveButton, styles.saveButtonSecondary, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#1A9D5C" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#1A9D5C" />
              <Text style={styles.saveButtonTextSecondary}>Save Draft</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSendForReview}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Send for Review</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  saveButtonSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1A9D5C',
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  saveButtonTextSecondary: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#1A9D5C',
    marginLeft: 8,
  },
  requiredAsterisk: {
    color: '#FF3B30',
    fontSize: 16,
  },
  helperText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 8,
    fontStyle: 'italic',
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
