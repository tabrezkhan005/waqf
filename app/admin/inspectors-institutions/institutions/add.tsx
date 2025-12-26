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
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function AddInstitutionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    district_id: '',
    address: '',
    contact_name: '',
    contact_phone: '',
  });
  const [districts, setDistricts] = useState<any[]>([]);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.district_id) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('institutions').insert({
        name: formData.name,
        code: formData.code || null,
        district_id: parseInt(formData.district_id),
        address: formData.address || null,
        contact_name: formData.contact_name || null,
        contact_phone: formData.contact_phone || null,
        is_active: true,
      });

      if (error) throw error;

      Alert.alert('Success', 'Institution added successfully', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error('Error adding institution:', error);
      Alert.alert('Error', error.message || 'Failed to add institution');
    } finally {
      setLoading(false);
    }
  };

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
          <Text style={styles.label}>Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter institution code"
            value={formData.code}
            onChangeText={(text) => setFormData({ ...formData, code: text })}
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
          <Text style={styles.label}>Address</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter address"
            value={formData.address}
            onChangeText={(text) => setFormData({ ...formData, address: text })}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact name"
            value={formData.contact_name}
            onChangeText={(text) => setFormData({ ...formData, contact_name: text })}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Contact Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter contact phone"
            value={formData.contact_phone}
            onChangeText={(text) => setFormData({ ...formData, contact_phone: text })}
            keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Institution</Text>
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

























