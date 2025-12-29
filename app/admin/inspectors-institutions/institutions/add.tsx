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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';

interface District {
  id: string;
  name: string;
}

export default function AddInstitutionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [showDistrictPicker, setShowDistrictPicker] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    ap_gazette_no: '',
    district_id: '',
    mandal: '',
    village: '',
    extent_dry: '',
    extent_wet: '',
  });
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      setLoadingDistricts(true);
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading districts:', error);
        Alert.alert('Error', 'Failed to load districts. Please try again.');
        return;
      }
      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
      Alert.alert('Error', 'Failed to load districts. Please try again.');
    } finally {
      setLoadingDistricts(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.ap_gazette_no || !formData.district_id) {
      Alert.alert('Error', 'Please fill all required fields (Name, AP Gazette No, District)');
      return;
    }

    try {
      setLoading(true);

      // Create institution
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .insert({
          name: formData.name,
          ap_gazette_no: formData.ap_gazette_no,
          district_id: formData.district_id,
          mandal: formData.mandal || null,
          village: formData.village || null,
          is_active: true,
        })
        .select()
        .single();

      if (institutionError) throw institutionError;

      // If extent values are provided, create an initial DCB record
      const extentDry = parseFloat(formData.extent_dry) || 0;
      const extentWet = parseFloat(formData.extent_wet) || 0;

      if (extentDry > 0 || extentWet > 0) {
        // Get inspector for this district
        const { data: inspectorData } = await supabase
          .from('profiles')
          .select('id')
          .eq('district_id', formData.district_id)
          .eq('role', 'inspector')
          .limit(1)
          .single();

        if (inspectorData) {
          // Create initial DCB record with extent values
          const { error: dcbError } = await supabase.from('institution_dcb').insert({
            institution_id: institutionData.id,
            inspector_id: inspectorData.id,
            extent_dry: extentDry,
            extent_wet: extentWet,
            financial_year: '2024-25',
            demand_arrears: 0,
            demand_current: 0,
            collection_arrears: 0,
            collection_current: 0,
          });

          if (dcbError) {
            console.warn('Could not create DCB record:', dcbError);
            // Don't fail the whole operation if DCB creation fails
          }
        }
      }

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

  const selectedDistrict = districts.find((d) => d.id === formData.district_id);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
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
            placeholderTextColor={theme.colors.muted}
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
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>
            District <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.pickerWrapper}
            onPress={() => setShowDistrictPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={[styles.pickerText, !selectedDistrict && styles.pickerTextPlaceholder]}>
              {selectedDistrict ? selectedDistrict.name : 'Select District'}
            </Text>
            <Ionicons name="chevron-down" size={20} color={theme.colors.muted} />
          </TouchableOpacity>
          {loadingDistricts && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading districts...</Text>
            </View>
          )}
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Mandal</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter mandal"
            value={formData.mandal}
            onChangeText={(text) => setFormData({ ...formData, mandal: text })}
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Village</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter village"
            value={formData.village}
            onChangeText={(text) => setFormData({ ...formData, village: text })}
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Extent Dry (Acres)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter dry land extent in acres"
            value={formData.extent_dry}
            onChangeText={(text) => setFormData({ ...formData, extent_dry: text })}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Extent Wet (Acres)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter wet land extent in acres"
            value={formData.extent_wet}
            onChangeText={(text) => setFormData({ ...formData, extent_wet: text })}
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.muted}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || loadingDistricts}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Institution</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* District Picker Modal */}
      <Modal
        visible={showDistrictPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDistrictPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDistrictPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select District</Text>
              <TouchableOpacity
                onPress={() => setShowDistrictPicker(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            {loadingDistricts ? (
              <View style={styles.modalLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
                <Text style={styles.loadingText}>Loading districts...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.modalList}
                contentContainerStyle={styles.modalListContent}
                showsVerticalScrollIndicator={true}
                nestedScrollEnabled={true}
              >
                {districts.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No districts available</Text>
                  </View>
                ) : (
                  districts.map((district) => (
                    <TouchableOpacity
                      key={district.id}
                      style={[
                        styles.districtOption,
                        formData.district_id === district.id && styles.districtOptionSelected,
                      ]}
                      onPress={() => {
                        setFormData({ ...formData, district_id: district.id });
                        setShowDistrictPicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.districtOptionText,
                          formData.district_id === district.id && styles.districtOptionTextSelected,
                        ]}
                      >
                        {district.name}
                      </Text>
                      {formData.district_id === district.id && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  contentContainer: {
    paddingBottom: 120, // Extra padding to prevent button from being hidden
  },
  content: {
    padding: theme.spacing.lg,
  },
  formGroup: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  required: {
    color: theme.colors.danger,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pickerWrapper: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    flex: 1,
  },
  pickerTextPlaceholder: {
    color: theme.colors.muted,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  districtOption: {
    padding: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  districtOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
  },
  districtOptionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    flex: 1,
  },
  districtOptionTextSelected: {
    fontFamily: 'Nunito-Bold',
    color: theme.colors.primary,
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.md,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
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
    minHeight: '50%',
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
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  modalCloseButton: {
    padding: theme.spacing.xs,
  },
  modalLoadingContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  modalList: {
    flex: 1,
    maxHeight: 500,
  },
  modalListContent: {
    paddingBottom: theme.spacing.lg,
  },
  emptyContainer: {
    padding: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
});
