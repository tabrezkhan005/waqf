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
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface District {
  id: string;
  name: string;
  created_at: string;
}

export default function DistrictsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [districts, setDistricts] = useState<District[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newDistrictName, setNewDistrictName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('districts')
        .select('id, name, created_at')
        .order('name');

      if (error) throw error;
      setDistricts(data || []);
    } catch (error: any) {
      console.error('Error loading districts:', error);
      Alert.alert('Error', error.message || 'Failed to load districts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDistricts();
  };

  const handleAddDistrict = async () => {
    if (!newDistrictName.trim()) {
      Alert.alert('Error', 'Please enter a district name');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('districts')
        .insert({
          name: newDistrictName.trim(),
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Error', 'A district with this name already exists');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert('Success', 'District added successfully');
      setNewDistrictName('');
      setShowAddForm(false);
      await loadDistricts();
    } catch (error: any) {
      console.error('Error adding district:', error);
      Alert.alert('Error', error.message || 'Failed to add district');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteDistrict = (district: District) => {
    Alert.alert(
      'Delete District',
      `Are you sure you want to delete "${district.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('districts')
                .delete()
                .eq('id', district.id);

              if (error) throw error;

              Alert.alert('Success', 'District deleted successfully');
              await loadDistricts();
            } catch (error: any) {
              console.error('Error deleting district:', error);
              if (error.code === '23503') {
                Alert.alert(
                  'Error',
                  'Cannot delete district. It is being used by inspectors or institutions.'
                );
              } else {
                Alert.alert('Error', error.message || 'Failed to delete district');
              }
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0A7E43" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Districts</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddForm(!showAddForm)}
          >
            <Ionicons
              name={showAddForm ? 'close' : 'add'}
              size={24}
              color="#FFFFFF"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Add District Form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.formLabel}>Add New District</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter district name"
            value={newDistrictName}
            onChangeText={setNewDistrictName}
            autoCapitalize="words"
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddForm(false);
                setNewDistrictName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddDistrict}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Add District</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Districts List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A7E43" />
        }
        showsVerticalScrollIndicator={false}
      >
        {districts.length > 0 ? (
          districts.map((district) => (
            <View key={district.id} style={styles.districtCard}>
              <View style={styles.districtInfo}>
                <View style={styles.districtIcon}>
                  <Ionicons name="location" size={24} color="#0A7E43" />
                </View>
                <View style={styles.districtDetails}>
                  <Text style={styles.districtName}>{district.name}</Text>
                  <Text style={styles.districtDate}>
                    Created: {new Date(district.created_at).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDeleteDistrict(district)}
              >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateText}>No districts found</Text>
            <Text style={styles.emptyStateSubtext}>
              Add your first district to get started
            </Text>
          </View>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0A7E43',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addForm: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  formLabel: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0A7E43',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  districtCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  districtInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  districtIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A7E4315',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  districtDetails: {
    flex: 1,
  },
  districtName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  districtDate: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#6B7280',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 100,
  },
});
