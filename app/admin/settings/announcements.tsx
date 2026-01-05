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
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface Announcement {
  id: string;
  title: string;
  message: string;
  target_roles: string[];
  target_users: string[] | null;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string;
}

export default function AnnouncementsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    targetRoles: [] as string[],
    expiresAt: '',
  });
  const [saving, setSaving] = useState(false);

  const availableRoles = ['inspector', 'accounts', 'reports'];

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select(`
          *,
          creator:profiles!announcements_created_by_fkey (
            full_name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        ...item,
        creator_name: item.creator?.full_name || 'Admin',
      }));

      setAnnouncements(formatted);
    } catch (error: any) {
      // Removed debug log announcements:', error);
      Alert.alert('Error', error.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnnouncements();
  };

  const toggleRole = (role: string) => {
    setFormData((prev) => ({
      ...prev,
      targetRoles: prev.targetRoles.includes(role)
        ? prev.targetRoles.filter((r) => r !== role)
        : [...prev.targetRoles, role],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      Alert.alert('Error', 'Please fill in title and message');
      return;
    }

    if (formData.targetRoles.length === 0) {
      Alert.alert('Error', 'Please select at least one target role');
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase.from('announcements').insert({
        title: formData.title.trim(),
        message: formData.message.trim(),
        target_roles: formData.targetRoles,
        target_users: null,
        is_active: true,
        expires_at: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        created_by: profile?.id,
      });

      if (error) throw error;

      Alert.alert('Success', 'Announcement sent successfully');
      setFormData({ title: '', message: '', targetRoles: [], expiresAt: '' });
      setShowAddForm(false);
      await loadAnnouncements();
    } catch (error: any) {
      console.error('Error creating announcement:', error);
      Alert.alert('Error', error.message || 'Failed to create announcement');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (announcement: Announcement) => {
    try {
      const { error } = await supabase
        .from('announcements')
        .update({ is_active: !announcement.is_active })
        .eq('id', announcement.id);

      if (error) throw error;
      await loadAnnouncements();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update announcement');
    }
  };

  const handleDelete = (announcement: Announcement) => {
    Alert.alert('Delete Announcement', 'Are you sure you want to delete this announcement?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('announcements').delete().eq('id', announcement.id);
            if (error) throw error;
            await loadAnnouncements();
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to delete announcement');
          }
        },
      },
    ]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <Text style={styles.headerTitle}>Announcements</Text>
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

      {/* Add Announcement Form */}
      {showAddForm && (
        <View style={styles.addForm}>
          <Text style={styles.formLabel}>Create New Announcement</Text>

          <TextInput
            style={styles.input}
            placeholder="Title *"
            placeholderTextColor="#9CA3AF"
            value={formData.title}
            onChangeText={(text) => setFormData({ ...formData, title: text })}
          />

          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Message *"
            placeholderTextColor="#9CA3AF"
            value={formData.message}
            onChangeText={(text) => setFormData({ ...formData, message: text })}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Target Roles *</Text>
          <View style={styles.rolesContainer}>
            {availableRoles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleChip,
                  formData.targetRoles.includes(role) && styles.roleChipSelected,
                ]}
                onPress={() => toggleRole(role)}
              >
                <Text
                  style={[
                    styles.roleChipText,
                    formData.targetRoles.includes(role) && styles.roleChipTextSelected,
                  ]}
                >
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Expiry Date (YYYY-MM-DD) - Optional"
            placeholderTextColor="#9CA3AF"
            value={formData.expiresAt}
            onChangeText={(text) => setFormData({ ...formData, expiresAt: text })}
          />

          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowAddForm(false);
                setFormData({ title: '', message: '', targetRoles: [], expiresAt: '' });
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Send Announcement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Announcements List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0A7E43" />
        }
        showsVerticalScrollIndicator={false}
      >
        {announcements.length > 0 ? (
          announcements.map((announcement) => (
            <View key={announcement.id} style={styles.announcementCard}>
              <View style={styles.announcementHeader}>
                <View style={styles.announcementIcon}>
                  <Ionicons
                    name={announcement.is_active ? 'megaphone' : 'megaphone-outline'}
                    size={24}
                    color={announcement.is_active ? '#0A7E43' : '#9CA3AF'}
                  />
                </View>
                <View style={styles.announcementContent}>
                  <View style={styles.announcementTitleRow}>
                    <Text style={styles.announcementTitle}>{announcement.title}</Text>
                    {!announcement.is_active && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.announcementMessage}>{announcement.message}</Text>
                  <View style={styles.announcementMeta}>
                    <Text style={styles.metaText}>
                      To: {announcement.target_roles.map((r) => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
                    </Text>
                    <Text style={styles.metaText}>By: {announcement.creator_name}</Text>
                    <Text style={styles.metaText}>{formatDate(announcement.created_at)}</Text>
                    {announcement.expires_at && (
                      <Text style={styles.metaText}>
                        Expires: {formatDate(announcement.expires_at)}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.announcementActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleToggleActive(announcement)}
                >
                  <Ionicons
                    name={announcement.is_active ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={announcement.is_active ? '#F59E0B' : '#10B981'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(announcement)}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="megaphone-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyStateText}>No announcements yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create your first announcement to notify users
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
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
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
    marginBottom: 16,
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
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  label: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  roleChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleChipSelected: {
    backgroundColor: '#0A7E43',
    borderColor: '#0A7E43',
  },
  roleChipText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  formActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  announcementHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  announcementIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#0A7E4315',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  announcementTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1F2937',
    flex: 1,
  },
  inactiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  inactiveText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
    color: '#6B7280',
  },
  announcementMessage: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#4B5563',
    marginBottom: 8,
    lineHeight: 20,
  },
  announcementMeta: {
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#9CA3AF',
  },
  announcementActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButton: {
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
