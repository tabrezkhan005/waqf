import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { theme } from '@/lib/theme';

export default function AccountsProfileScreen() {
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
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Settings" subtitle="Accounts" />

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.full_name || 'Accounts User'}</Text>
              <Text style={styles.profileRole}>Accounts</Text>
            </View>
          </View>
        </Card>

        <View style={{ height: theme.spacing.sm }} />

        <Card style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Name</Text>
            <Text style={styles.detailValue}>{profile?.full_name || 'N/A'}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>Accounts</Text>
          </View>
          <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.detailLabel}>User ID</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {profile?.id || 'N/A'}
            </Text>
          </View>
        </Card>

        <View style={{ height: theme.spacing.lg }} />

        <Text style={styles.sectionTitle}>Preferences</Text>
        <TouchableOpacity onPress={() => router.push('/accounts/settings/notifications')} activeOpacity={0.85}>
          <Card style={styles.rowCard}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>Notifications</Text>
                <Text style={styles.rowSubtitle}>Control alerts and summaries</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
          </Card>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.lg }} />

        <Text style={styles.sectionTitle}>Account</Text>
        <Button label="Logout" variant="ghost" onPress={handleLogout} style={styles.logoutBtn} />

        <View style={{ height: theme.spacing.xl }} />

        <Text style={styles.appInfoText}>Waqf Collection App</Text>
        <Text style={styles.appInfoVersion}>Version 1.0.0</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  profileCard: {
    padding: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  profileName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  detailsCard: {
    padding: theme.spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  detailLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  detailValue: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    flex: 1,
    paddingRight: theme.spacing.sm,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    backgroundColor: theme.colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  rowTitle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  logoutBtn: {
    borderColor: theme.colors.danger,
    backgroundColor: theme.colors.surface,
  },
  appInfoText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: 4,
  },
  appInfoVersion: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
  },
});
