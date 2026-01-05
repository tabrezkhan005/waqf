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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function EditInstitutionScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ap_gazette_no: '',
    district_id: '',
    mandal: '',
    village: '',
  });
  const [districts, setDistricts] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: institution, error } = await supabase
        .from('institutions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setFormData({
        name: institution.name || '',
        ap_gazette_no: institution.ap_gazette_no || '',
        district_id: String(institution.district_id || ''),
        mandal: institution.mandal || '',
        village: institution.village || '',
      });

      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      setDistricts(districtsData || []);
    } catch (error) {
      // Removed debug log institution:', error);
      Alert.alert('Error', 'Failed to load institution data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.ap_gazette_no || !formData.district_id) {
      Alert.alert('Error', 'Please fill all required fields (Name, AP Gazette No, District)');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('institutions')
        .update({
          name: formData.name,
          ap_gazette_no: formData.ap_gazette_no,
          district_id: formData.district_id,
          mandal: formData.mandal || null,
          village: formData.village || null,
        })
        .eq('id', id);

      if (error) throw error;

      Alert.alert('Success', 'Institution updated successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error updating institution:', error);
      Alert.alert('Error', error.message || 'Failed to update institution');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.formGroup}>
          <Text style={styles.label}>
            Institution Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter institution name"
            value={formData.name}
            onChangeText={(text) => setFormData({ ...formData, name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            AP Gazette No <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter AP Gazette Number"
            value={formData.ap_gazette_no}
            onChangeText={(text) => setFormData({ ...formData, ap_gazette_no: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            District <Text style={styles.required}>*</Text>
          </Text>
          <ScrollView style={styles.districtList}>
            {districts.map((district) => (
              <TouchableOpacity
                key={district.id}
                style={[
                  styles.districtOption,
                  formData.district_id === String(district.id) && styles.districtOptionSelected,
                ]}
                onPress={() => setFormData({ ...formData, district_id: String(district.id) })}
              >
                <Text
                  style={[
                    styles.districtOptionText,
                    formData.district_id === String(district.id) && styles.districtOptionTextSelected,
                  ]}
                >
                  {district.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mandal</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mandal"
            value={formData.mandal}
            onChangeText={(text) => setFormData({ ...formData, mandal: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Village</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter village"
            value={formData.village}
            onChangeText={(text) => setFormData({ ...formData, village: text })}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, saving && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Update Institution</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  required: {
    color: '#FF3B30',
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  districtList: {
    maxHeight: 200,
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  districtOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  districtOptionSelected: {
    backgroundColor: '#003D9915',
  },
  districtOptionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
  districtOptionTextSelected: {
    fontFamily: 'Nunito-Bold',
    color: '#003D99',
  },
  submitButton: {
    backgroundColor: '#1A9D5C',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
});
