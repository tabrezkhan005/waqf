import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';

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
            router.replace('/get-started');
          },
        },
      ]
    );
  };

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Settings" subtitle="Reports" />

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0)?.toUpperCase() || 'R'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.full_name || 'Reports User'}</Text>
              <Text style={styles.profileRole}>Reports / CEO</Text>
            </View>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Name</Text>
            <Text style={styles.kvValue}>{profile?.full_name || '—'}</Text>
          </View>
          <View style={styles.kvRowLast}>
            <Text style={styles.kvKey}>User ID</Text>
            <Text style={styles.kvValue} numberOfLines={1}>
              {profile?.id || '—'}
            </Text>
          </View>
        </Card>

        <View style={{ height: theme.spacing.lg }} />

        <Text style={styles.sectionTitle}>Actions</Text>

        <TouchableOpacity style={styles.actionRow} activeOpacity={0.8} onPress={() => router.push('/reports/settings/export')}>
          <View style={styles.actionIcon}>
            <Ionicons name="download-outline" size={18} color={theme.colors.secondary} />
          </View>
          <Text style={styles.actionText}>Export Center</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </TouchableOpacity>

        <View style={{ height: theme.spacing.lg }} />

        <TouchableOpacity
          style={[styles.logoutRow, loading && { opacity: 0.6 }]}
          onPress={handleLogout}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Ionicons name="log-out-outline" size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: theme.spacing.lg }} />

        <Text style={styles.footerText}>Waqf Collection App</Text>
        <Text style={styles.footerSubText}>Version 1.0.0</Text>
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
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.muted,
    marginBottom: theme.spacing.sm,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  profileCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${theme.colors.secondary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.secondary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.secondary,
  },
  profileName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  kvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  kvRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  kvKey: {
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  kvValue: {
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    height: 54,
    paddingHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.md,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${theme.colors.secondary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.colors.secondary}20`,
  },
  actionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${theme.colors.danger}0F`,
    borderRadius: theme.radius.lg,
    height: 54,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}40`,
    gap: 10,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.danger,
  },
  footerText: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: theme.colors.muted,
    textAlign: 'center',
  },
  footerSubText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 2,
  },
});
