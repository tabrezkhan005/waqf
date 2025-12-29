import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';

export default function InspectorSettingsScreen() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [districtName, setDistrictName] = useState<string>('—');

  useEffect(() => {
    const loadDistrict = async () => {
      if (!profile?.district_id) {
        setDistrictName('—');
        return;
      }
      const { data } = await supabase
        .from('districts')
        .select('name')
        .eq('id', profile.district_id)
        .single();
      setDistrictName(data?.name || '—');
    };

    loadDistrict();
  }, [profile?.district_id]);

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

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Settings" subtitle="Inspector" />

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{profile?.full_name?.charAt(0)?.toUpperCase() || 'I'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{profile?.full_name || 'Inspector'}</Text>
              <Text style={styles.profileRole}>Inspector • {districtName}</Text>
            </View>
          </View>

          <View style={{ height: theme.spacing.md }} />

          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>Name</Text>
            <Text style={styles.kvValue}>{profile?.full_name || '—'}</Text>
          </View>
          <View style={styles.kvRow}>
            <Text style={styles.kvKey}>District</Text>
            <Text style={styles.kvValue}>{districtName}</Text>
          </View>
          <View style={styles.kvRowLast}>
            <Text style={styles.kvKey}>User ID</Text>
            <Text style={styles.kvValue} numberOfLines={1}>
              {profile?.id || '—'}
            </Text>
          </View>
        </Card>

        <View style={{ height: theme.spacing.lg }} />

        <Text style={styles.sectionTitle}>Shortcuts</Text>

        <TouchableOpacity style={styles.actionRow} activeOpacity={0.8} onPress={() => router.push('/inspector/dashboard')}>
          <View style={styles.actionIcon}>
            <Ionicons name="home-outline" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Go to Dashboard</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} activeOpacity={0.8} onPress={() => router.push('/inspector/search')}>
          <View style={styles.actionIcon}>
            <Ionicons name="search-outline" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>Search Institutions</Text>
          <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionRow} activeOpacity={0.8} onPress={() => router.push('/inspector/collections')}>
          <View style={styles.actionIcon}>
            <Ionicons name="receipt-outline" size={18} color={theme.colors.primary} />
          </View>
          <Text style={styles.actionText}>View Collections</Text>
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
    backgroundColor: `${theme.colors.primary}15`,
    borderWidth: 1,
    borderColor: `${theme.colors.primary}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.primary,
  },
  profileName: {
    fontFamily: 'Nunito-Bold',
    fontSize: 18,
    color: theme.colors.text,
    marginBottom: 2,
  },
  profileRole: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: theme.colors.muted,
  },
  kvRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  kvRowLast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  kvKey: {
    fontFamily: 'Nunito-Regular',
    fontSize: 13,
    color: theme.colors.muted,
  },
  kvValue: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: theme.colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.lg,
    height: 54,
    marginBottom: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  actionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: `${theme.colors.primary}10`,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${theme.colors.primary}20`,
  },
  actionText: {
    flex: 1,
    fontFamily: 'Nunito-SemiBold',
    fontSize: 15,
    color: theme.colors.text,
  },
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: `${theme.colors.danger}40`,
    backgroundColor: `${theme.colors.danger}0F`,
    gap: 10,
  },
  logoutText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 15,
    color: theme.colors.danger,
  },
  footerText: {
    textAlign: 'center',
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: theme.colors.muted,
  },
  footerSubText: {
    textAlign: 'center',
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
});
