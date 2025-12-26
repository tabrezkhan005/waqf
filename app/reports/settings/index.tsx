import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';

export default function ReportsProfileScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await signOut();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={32} color="#9C27B0" />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'Reports User'}</Text>
              <Text style={styles.profileRole}>Reports / CEO</Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{profile?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>Reports / CEO</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {profile?.id || 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {/* Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => router.push('/reports/settings/export')}
        >
          <Ionicons name="download-outline" size={24} color="#9C27B0" />
          <Text style={styles.actionButtonText}>Export Center</Text>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </TouchableOpacity>
      </View>

      {/* Logout Section */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <View style={styles.section}>
        <Text style={styles.appInfoText}>Waqf Collection App</Text>
        <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  profileCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E1BEE7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  detailsCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    flex: 1,
    textAlign: 'right',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  logoutButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#FF3B30',
    marginLeft: 12,
  },
  appInfoText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    textAlign: 'center',
  },
});

























