import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';

export default function InspectorProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [inspector, setInspector] = useState<any>(null);
  const [stats, setStats] = useState({
    totalArrear: 0,
    totalCurrent: 0,
    pendingCount: 0,
    completedCount: 0,
  });

  useEffect(() => {
    loadInspectorData();
  }, [id]);

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

      // Load collection stats
      const { data: collections } = await supabase
        .from('collections')
        .select('arrear_amount, current_amount, status')
        .eq('inspector_id', id);

      const totalArrear = collections?.reduce((sum, c) => sum + Number(c.arrear_amount || 0), 0) || 0;
      const totalCurrent = collections?.reduce((sum, c) => sum + Number(c.current_amount || 0), 0) || 0;
      const pendingCount = collections?.filter((c) => c.status === 'pending').length || 0;
      const completedCount = collections?.filter((c) => c.status === 'verified').length || 0;

      setInspector({
        ...profile,
        district_name: district?.name || 'Unknown',
      });
      setStats({ totalArrear, totalCurrent, pendingCount, completedCount });
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
    Alert.alert('Transfer Inspector', 'Transfer functionality coming soon');
  };

  const handleResetPassword = () => {
    Alert.alert('Reset Password', 'Password reset functionality coming soon');
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
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {inspector.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={styles.name}>{inspector.full_name}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color="#8E8E93" />
            <Text style={styles.metaText}>{inspector.district_name}</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{(stats.totalArrear / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Total Arrear</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{(stats.totalCurrent / 1000).toFixed(1)}K</Text>
            <Text style={styles.statLabel}>Total Current</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingCount}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.completedCount}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
            <Ionicons name="create-outline" size={20} color="#003D99" />
            <Text style={styles.actionText}>Edit Inspector</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleTransfer}>
            <Ionicons name="swap-horizontal-outline" size={20} color="#003D99" />
            <Text style={styles.actionText}>Transfer Inspector</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleResetPassword}>
            <Ionicons name="key-outline" size={20} color="#003D99" />
            <Text style={styles.actionText}>Reset Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#003D99',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginLeft: 6,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    marginHorizontal: 6,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#003D99',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  actionsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginLeft: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#FF3B30',
    textAlign: 'center',
    padding: 20,
  },
});
















