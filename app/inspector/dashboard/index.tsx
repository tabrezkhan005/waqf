import AnimatedChart from '@/components/shared/AnimatedChart';
import { AppHeader } from '@/components/ui/AppHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/contexts/AuthContext';
import { queryDistrictDCB } from '@/lib/dcb/district-tables';
import { supabase } from '@/lib/supabase/client';
import { theme } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

type KPIs = {
  totalInstitutions: number;
  thisMonthTotal: number;
  pendingCount: number;
  sentToAccountsCount: number;
  demandArrears: number;
  demandCurrent: number;
  demandTotal: number;
};

export default function InspectorDashboardScreen() {
  const router = useRouter();
  const { profile, session, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<KPIs>({
    totalInstitutions: 0,
    thisMonthTotal: 0,
    pendingCount: 0,
    sentToAccountsCount: 0,
    demandArrears: 0,
    demandCurrent: 0,
    demandTotal: 0,
  });
  const [monthlySeries, setMonthlySeries] = useState<{ labels: string[]; datasets: Array<{ data: number[] }> } | null>(
    null
  );
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const monthStartIso = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return start.toISOString();
  }, []);

  const loadDashboard = useCallback(async () => {
    // Don't load if user is logged out or profile is missing
    if (!session || !profile || !profile.district_id || loadingRef.current || !mountedRef.current) {
      if (!session || !profile) {
        setLoading(false);
        loadingRef.current = false;
      }
      return;
    }

    loadingRef.current = true;
    try {
      setLoading(true);

      // Double-check profile still exists (user might have logged out during load)
      if (!mountedRef.current || !session || !profile || !profile.district_id) {
        return;
      }

      // Get district name
      const { data: districtData, error: districtError } = await supabase
        .from('districts')
        .select('name')
        .eq('id', profile.district_id)
        .single();

      if (districtError || !districtData) {
        // Only log error if user is still logged in (not a logout scenario)
        if (session && profile) {
          console.error('District not found:', districtError);
        }
        return;
      }

      const districtName = (districtData as { name: string }).name;

      // Load all data in parallel
      const [
        institutionsRes,
        collectionsRes,
        dcbRes,
        notificationsRes,
      ] = await Promise.all([
        // 1) Institutions count
        supabase
          .from('institutions')
          .select('*', { count: 'exact', head: true })
          .eq('district_id', profile.district_id)
          .eq('is_active', true),
        // 2) Collections by this inspector
        supabase
          .from('collections')
          .select('status, arrear_amount, current_amount, created_at')
          .eq('inspector_id', profile.id)
          .order('created_at', { ascending: true }),
        // 3) DCB data for demand analytics
        districtName ? queryDistrictDCB(
          districtName,
          'demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total'
        ) : Promise.resolve([]),
        // 4) Unread notifications count
        supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', profile.id)
          .eq('is_read', false)
          .in('type', ['payment_verified', 'payment_rejected', 'announcement']),
      ]);

      const collectionsData = collectionsRes.data || [];
      const dcbData = dcbRes || [];

      // Calculate KPIs
      const pendingCount = collectionsData.filter((c: any) => c.status === 'pending').length;
      const sentToAccountsCount = collectionsData.filter((c: any) => c.status === 'sent_to_accounts').length;
      const thisMonthTotal = collectionsData
        .filter((c: any) => c.created_at && c.created_at >= monthStartIso)
        .reduce((sum: number, c: any) => sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0), 0);

      // Calculate demand totals from DCB
      const demandArrears = dcbData.reduce((sum: number, d: any) => sum + Number(d.demand_arrears || 0), 0);
      const demandCurrent = dcbData.reduce((sum: number, d: any) => sum + Number(d.demand_current || 0), 0);
      const demandTotal = demandArrears + demandCurrent;

      // Monthly chart (last 6 months) - stable calculation
      const now = new Date();
      const months = Array.from({ length: 6 }).map((_, idx) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
        return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en-IN', { month: 'short' }) };
      });

      const totalsByMonth: Record<string, number> = {};
      collectionsData.forEach((c: any) => {
        if (!c.created_at) return;
        const d = new Date(c.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        totalsByMonth[key] = (totalsByMonth[key] || 0) + Number(c.arrear_amount || 0) + Number(c.current_amount || 0);
      });

      // Set state once with all calculated values
      setKpis({
        totalInstitutions: institutionsRes.count || 0,
        thisMonthTotal,
        pendingCount,
        sentToAccountsCount,
        demandArrears,
        demandCurrent,
        demandTotal,
      });

      setMonthlySeries({
        labels: months.map((m) => m.label),
        datasets: [{ data: months.map((m) => Math.round((totalsByMonth[m.key] || 0) / 1000)) }],
      });

      setUnreadNotifications(notificationsRes.count || 0);
    } catch (e) {
      // Only log error if user is still logged in (not a logout scenario)
      if (session && profile && mountedRef.current) {
        console.error('Inspector dashboard load error:', e);
      }
      setMonthlySeries(null);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
      loadingRef.current = false;
    }
  }, [session, profile?.id, profile?.district_id, monthStartIso]);

  useEffect(() => {
    // Only load if we have a session and profile
    if (session && profile && !authLoading) {
      loadDashboard();
    } else if (!session || !profile) {
      // User is logged out, stop loading
      setLoading(false);
      loadingRef.current = false;
    }
  }, [session, profile, authLoading, loadDashboard]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      loadingRef.current = false;
    };
  }, []);

  const onRefresh = useCallback(async () => {
    // Don't refresh if user is logged out
    if (!session || !profile) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [session, profile, loadDashboard]);

  // Don't render dashboard if user is logged out
  if (!session || !profile) {
    return null;
  }

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <AppHeader
          subtitle="Welcome back"
          title={profile?.full_name || 'Inspector'}
          rightActions={[
            {
              icon: 'notifications-outline',
              onPress: () => router.push('/inspector/notifications'),
              accessibilityLabel: 'Notifications',
              badgeCount: unreadNotifications > 0 ? unreadNotifications : undefined,
            },
            {
              icon: 'search-outline',
              onPress: () => router.push('/inspector/search'),
              accessibilityLabel: 'Search institutions',
            },
            {
              icon: 'settings-outline',
              onPress: () => router.push('/inspector/settings'),
              accessibilityLabel: 'Settings',
            },
          ]}
          style={styles.header}
        />

        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons name="business-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.kpiLabel}>Institutions</Text>
            </View>
            <Text style={styles.kpiValue}>{loading ? '—' : kpis.totalInstitutions}</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.secondary}15` }]}>
                <Ionicons name="cash-outline" size={18} color={theme.colors.secondary} />
              </View>
              <Text style={styles.kpiLabel}>This month</Text>
            </View>
            <Text style={styles.kpiValue}>
              {loading ? '—' : `₹${Math.round(kpis.thisMonthTotal).toLocaleString('en-IN')}`}
            </Text>
          </Card>
        </View>

        <View style={styles.kpiRow}>
          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.warning}15` }]}>
                <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
              </View>
              <Text style={styles.kpiLabel}>Pending</Text>
            </View>
            <Text style={styles.kpiValue}>{loading ? '—' : kpis.pendingCount}</Text>
          </Card>

          <Card style={styles.kpiCard}>
            <View style={styles.kpiTop}>
              <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.primary}15` }]}>
                <Ionicons name="paper-plane-outline" size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.kpiLabel}>Sent to A/c</Text>
            </View>
            <Text style={styles.kpiValue}>{loading ? '—' : kpis.sentToAccountsCount}</Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Demand Analytics</Text>
          <View style={styles.demandRow}>
            <Card style={styles.demandCard}>
              <View style={styles.demandHeader}>
                <Ionicons name="trending-up-outline" size={20} color={theme.colors.danger} />
                <Text style={styles.demandLabel}>Arrears</Text>
              </View>
              <Text style={styles.demandValue}>
                {loading ? '—' : `₹${Math.round(kpis.demandArrears).toLocaleString('en-IN')}`}
              </Text>
            </Card>
            <Card style={styles.demandCard}>
              <View style={styles.demandHeader}>
                <Ionicons name="trending-down-outline" size={20} color={theme.colors.primary} />
                <Text style={styles.demandLabel}>Current</Text>
              </View>
              <Text style={styles.demandValue}>
                {loading ? '—' : `₹${Math.round(kpis.demandCurrent).toLocaleString('en-IN')}`}
              </Text>
            </Card>
          </View>
          <Card style={styles.demandTotalCard}>
            <View style={styles.demandHeader}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.secondary} />
              <Text style={styles.demandLabel}>Total Demand</Text>
            </View>
            <Text style={styles.demandTotalValue}>
              {loading ? '—' : `₹${Math.round(kpis.demandTotal).toLocaleString('en-IN')}`}
            </Text>
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Collections trend</Text>
          {monthlySeries ? (
            <View style={styles.chartContainer}>
              <AnimatedChart type="line" title="Last 6 months (₹ in thousands)" data={monthlySeries} color={theme.colors.primary} height={220} />
            </View>
          ) : (
            <Card>
              <EmptyState title="No chart data" description="Once collections are created, your trend will appear here." />
            </Card>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick actions</Text>
          <View style={styles.actionsRow}>
            <Button label="Search institutions" onPress={() => router.push('/inspector/search')} style={styles.actionBtn} />
            <Button
              label="My collections"
              onPress={() => router.push('/inspector/collections')}
              variant="ghost"
              style={styles.actionBtn}
            />
          </View>
        </View>

        <View style={styles.brandingContainer}>
          <Text style={styles.brandingText}>Waqf Board</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  header: {
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  kpiCard: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  kpiTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: theme.spacing.sm,
  },
  kpiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  kpiLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 13,
    color: theme.colors.muted,
  },
  kpiValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: theme.colors.text,
    letterSpacing: 0.2,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    marginLeft: -theme.spacing.lg,
    marginRight: -theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionBtn: {
    flex: 1,
  },
  demandRow: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  demandCard: {
    flex: 1,
    padding: theme.spacing.md,
  },
  demandTotalCard: {
    padding: theme.spacing.md,
  },
  demandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: theme.spacing.xs,
  },
  demandLabel: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: theme.colors.muted,
  },
  demandValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
  },
  demandTotalValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 20,
    color: theme.colors.secondary,
  },
  brandingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.xl,
    marginTop: theme.spacing.lg,
  },
  brandingText: {
    fontFamily: 'Nunito-Regular',
    fontSize: 14,
    color: theme.colors.muted,
    opacity: 0.6,
    letterSpacing: 1,
  },
});
