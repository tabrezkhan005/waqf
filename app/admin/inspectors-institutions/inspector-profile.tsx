import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';

export default function InspectorProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspector, setInspector] = useState<any>(null);
  const [stats, setStats] = useState({
    totalArrear: 0,
    totalCurrent: 0,
    totalArrearCollected: 0,
    totalCurrentCollected: 0,
    pendingCount: 0,
    completedCount: 0,
  });

  // Transfer inspector state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [selectedDistrictId, setSelectedDistrictId] = useState<string>('');
  const [districts, setDistricts] = useState<any[]>([]);

  // Reset password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    loadInspectorData();
    loadDistricts();
  }, [id]);

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (error) {
        console.error('Error loading districts:', error);
        return;
      }

      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadInspectorData = async () => {
    try {
      setLoading(true);
      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          district_id,
          created_at
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const { data: district } = await supabase
        .from('districts')
        .select('name')
        .eq('id', profile.district_id)
        .single();

      // Load DCB data for this inspector (this contains the actual demand and collection data)
      const { data: dcbData, error: dcbError } = await supabase
        .from('institution_dcb')
        .select('demand_arrears, demand_current, collection_arrears, collection_current')
        .eq('inspector_id', id);

      if (dcbError) {
        console.error('Error loading DCB data:', dcbError);
      }

      // Calculate totals from DCB data
      const totalArrear = dcbData?.reduce((sum, d) => sum + Number(d.demand_arrears || 0), 0) || 0;
      const totalCurrent = dcbData?.reduce((sum, d) => sum + Number(d.demand_current || 0), 0) || 0;
      const totalArrearCollected = dcbData?.reduce((sum, d) => sum + Number(d.collection_arrears || 0), 0) || 0;
      const totalCurrentCollected = dcbData?.reduce((sum, d) => sum + Number(d.collection_current || 0), 0) || 0;

      // Load collections for pending/completed counts
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('status')
        .eq('inspector_id', id);

      if (collectionsError) {
        console.error('Error loading collections:', collectionsError);
      }

      const pendingCount = collections?.filter((c) => c.status === 'pending' || c.status === 'sent_to_accounts').length || 0;
      const completedCount = collections?.filter((c) => c.status === 'verified').length || 0;

      setInspector({
        ...profile,
        district_name: district?.name || 'Unknown',
      });
      setStats({
        totalArrear,
        totalCurrent,
        totalArrearCollected,
        totalCurrentCollected,
        pendingCount,
        completedCount
      });
    } catch (error) {
      console.error('Error loading inspector:', error);
      Alert.alert('Error', 'Failed to load inspector data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    router.push(`/admin/inspectors-institutions/inspectors/edit?id=${id}`);
  };

  const handleTransfer = () => {
    setSelectedDistrictId(inspector.district_id || '');
    setShowTransferModal(true);
  };

  const handleConfirmTransfer = async () => {
    if (!selectedDistrictId) {
      Alert.alert('Error', 'Please select a district');
      return;
    }

    if (selectedDistrictId === inspector.district_id) {
      Alert.alert('Error', 'Inspector is already assigned to this district');
      return;
    }

    Alert.alert(
      'Confirm Transfer',
      `Are you sure you want to transfer ${inspector.full_name} to the selected district? This will update their district assignment.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Transfer',
          onPress: async () => {
            try {
              setTransferring(true);
              const { error } = await supabase
                .from('profiles')
                .update({ district_id: selectedDistrictId })
                .eq('id', id);

              if (error) throw error;

              Alert.alert('Success', 'Inspector transferred successfully', [
                { text: 'OK', onPress: () => {
                  setShowTransferModal(false);
                  loadInspectorData();
                }},
              ]);
            } catch (error: any) {
              console.error('Error transferring inspector:', error);
              Alert.alert('Error', error.message || 'Failed to transfer inspector');
            } finally {
              setTransferring(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPassword = () => {
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleConfirmPasswordReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please enter both password fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    Alert.alert(
      'Confirm Password Reset',
      `Are you sure you want to reset the password for ${inspector.full_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: async () => {
            try {
              setResetting(true);

              // Use admin API to update password
              const { data, error } = await supabase.auth.admin.updateUserById(id, {
                password: newPassword,
              });

              if (error) throw error;

              Alert.alert('Success', 'Password reset successfully. The new password has been set.', [
                { text: 'OK', onPress: () => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }},
              ]);
            } catch (error: any) {
              console.error('Error resetting password:', error);
              Alert.alert('Error', error.message || 'Failed to reset password');
            } finally {
              setResetting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  if (!inspector) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Inspector not found</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          {/* Profile Header */}
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {inspector.full_name.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.avatarBadge}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.success} />
              </View>
            </View>
            <Text style={styles.name}>{inspector.full_name}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
              <Text style={styles.metaText}>{inspector.district_name}</Text>
            </View>
            <View style={styles.roleBadge}>
              <Ionicons name="shield-outline" size={14} color={theme.colors.primary} />
              <Text style={styles.roleText}>Inspector</Text>
            </View>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsSection}>
            <Text style={styles.sectionTitle}>Performance Overview</Text>
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="trending-up-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statValue}>
                  {stats.totalArrear >= 1000000
                    ? `₹${(stats.totalArrear / 1000000).toFixed(2)}Cr`
                    : stats.totalArrear >= 1000
                    ? `₹${(stats.totalArrear / 1000).toFixed(1)}K`
                    : `₹${stats.totalArrear.toLocaleString('en-IN')}`}
                </Text>
                <Text style={styles.statLabel}>Arrear Demand</Text>
              </View>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="cash-outline" size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.statValue}>
                  {stats.totalArrearCollected >= 1000000
                    ? `₹${(stats.totalArrearCollected / 1000000).toFixed(2)}Cr`
                    : stats.totalArrearCollected >= 1000
                    ? `₹${(stats.totalArrearCollected / 1000).toFixed(1)}K`
                    : `₹${stats.totalArrearCollected.toLocaleString('en-IN')}`}
                </Text>
                <Text style={styles.statLabel}>Arrear Collected</Text>
              </View>
              <View style={[styles.statCard, styles.statCardPrimary]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="calendar-outline" size={24} color={theme.colors.primary} />
                </View>
                <Text style={styles.statValue}>
                  {stats.totalCurrent >= 1000000
                    ? `₹${(stats.totalCurrent / 1000000).toFixed(2)}Cr`
                    : stats.totalCurrent >= 1000
                    ? `₹${(stats.totalCurrent / 1000).toFixed(1)}K`
                    : `₹${stats.totalCurrent.toLocaleString('en-IN')}`}
                </Text>
                <Text style={styles.statLabel}>Current Demand</Text>
              </View>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="wallet-outline" size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.statValue}>
                  {stats.totalCurrentCollected >= 1000000
                    ? `₹${(stats.totalCurrentCollected / 1000000).toFixed(2)}Cr`
                    : stats.totalCurrentCollected >= 1000
                    ? `₹${(stats.totalCurrentCollected / 1000).toFixed(1)}K`
                    : `₹${stats.totalCurrentCollected.toLocaleString('en-IN')}`}
                </Text>
                <Text style={styles.statLabel}>Current Collected</Text>
              </View>
              <View style={[styles.statCard, styles.statCardWarning]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="time-outline" size={24} color={theme.colors.warning} />
                </View>
                <Text style={styles.statValue}>{stats.pendingCount}</Text>
                <Text style={styles.statLabel}>Pending Collections</Text>
              </View>
              <View style={[styles.statCard, styles.statCardSuccess]}>
                <View style={styles.statIconContainer}>
                  <Ionicons name="checkmark-circle-outline" size={24} color={theme.colors.success} />
                </View>
                <Text style={styles.statValue}>{stats.completedCount}</Text>
                <Text style={styles.statLabel}>Verified Collections</Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actionsSection}>
            <Text style={styles.sectionTitle}>Actions</Text>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonPrimary]} onPress={handleEdit} activeOpacity={0.7}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.primary + '15' }]}>
                  <Ionicons name="create-outline" size={22} color={theme.colors.primary} />
                </View>
                <Text style={styles.actionText}>Edit Inspector</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonSecondary]} onPress={handleTransfer} activeOpacity={0.7}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.secondary + '15' }]}>
                  <Ionicons name="swap-horizontal-outline" size={22} color={theme.colors.secondary} />
                </View>
                <Text style={styles.actionText}>Transfer Inspector</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.actionButtonWarning]} onPress={handleResetPassword} activeOpacity={0.7}>
              <View style={styles.actionButtonLeft}>
                <View style={[styles.actionIcon, { backgroundColor: theme.colors.warning + '15' }]}>
                  <Ionicons name="key-outline" size={22} color={theme.colors.warning} />
                </View>
                <Text style={styles.actionText}>Reset Password</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.muted} />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Transfer Inspector Modal */}
      <Modal
        visible={showTransferModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowTransferModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Transfer Inspector</Text>
              <TouchableOpacity onPress={() => setShowTransferModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Select new district for {inspector?.full_name}</Text>
            <ScrollView style={styles.districtModalList} showsVerticalScrollIndicator={true}>
              {districts.map((district) => (
                <TouchableOpacity
                  key={district.id}
                  style={[
                    styles.districtModalOption,
                    selectedDistrictId === district.id && styles.districtModalOptionSelected,
                  ]}
                  onPress={() => setSelectedDistrictId(district.id)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.districtModalOptionText,
                      selectedDistrictId === district.id && styles.districtModalOptionTextSelected,
                    ]}
                  >
                    {district.name}
                  </Text>
                  {selectedDistrictId === district.id && (
                    <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowTransferModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, transferring && styles.modalButtonDisabled]}
                onPress={handleConfirmTransfer}
                disabled={transferring || !selectedDistrictId}
              >
                {transferring ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setShowPasswordModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>Set a new password for {inspector?.full_name}</Text>
            <View style={styles.passwordForm}>
              <View style={styles.passwordInputGroup}>
                <Text style={styles.passwordLabel}>New Password *</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text style={styles.passwordHint}>Minimum 6 characters</Text>
              </View>
              <View style={styles.passwordInputGroup}>
                <Text style={styles.passwordLabel}>Confirm Password *</Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm, resetting && styles.modalButtonDisabled]}
                onPress={handleConfirmPasswordReset}
                disabled={resetting || !newPassword || !confirmPassword}
              >
                {resetting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalButtonConfirmText}>Reset Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.lg,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.xl,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  avatarText: {
    fontSize: 40,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 4,
    borderWidth: 2,
    borderColor: theme.colors.surface,
  },
  name: {
    fontSize: 26,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.xs,
  },
  metaText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    marginLeft: theme.spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary + '15',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  roleText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.primary,
  },
  statsSection: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    gap: 12,
  },
  statCard: {
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
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
  statCardPrimary: {
    backgroundColor: theme.colors.primary + '08',
    borderColor: theme.colors.primary + '20',
  },
  statCardSuccess: {
    backgroundColor: theme.colors.success + '08',
    borderColor: theme.colors.success + '20',
  },
  statCardWarning: {
    backgroundColor: theme.colors.warning + '08',
    borderColor: theme.colors.warning + '20',
  },
  statIconContainer: {
    marginBottom: theme.spacing.sm,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
  },
  actionsSection: {
    marginTop: theme.spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionButtonPrimary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.primary + '20',
  },
  actionButtonSecondary: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.secondary + '20',
  },
  actionButtonWarning: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.warning + '20',
  },
  actionButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  actionText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.danger,
    textAlign: 'center',
    padding: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: Platform.OS === 'ios' ? 30 : theme.spacing.lg,
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
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
  },
  districtModalList: {
    maxHeight: 400,
    paddingHorizontal: theme.spacing.lg,
  },
  districtModalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  districtModalOptionSelected: {
    backgroundColor: theme.colors.primary + '15',
    borderColor: theme.colors.primary,
  },
  districtModalOptionText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
  },
  districtModalOptionTextSelected: {
    fontFamily: 'Nunito-Bold',
    color: theme.colors.primary,
  },
  modalActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  modalButton: {
    flex: 1,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: theme.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  modalButtonConfirm: {
    backgroundColor: theme.colors.primary,
  },
  modalButtonDisabled: {
    opacity: 0.6,
  },
  modalButtonCancelText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  modalButtonConfirmText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FFFFFF',
  },
  passwordForm: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  passwordInputGroup: {
    marginBottom: theme.spacing.lg,
  },
  passwordLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  passwordInput: {
    backgroundColor: theme.colors.surfaceAlt,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passwordHint: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    marginTop: theme.spacing.xs,
  },
});
