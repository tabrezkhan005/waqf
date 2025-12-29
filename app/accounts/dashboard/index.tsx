import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import AnimatedChart from '@/components/shared/AnimatedChart';
import { EmptyState } from '@/components/ui/EmptyState';
import { theme } from '@/lib/theme';
import { getAggregatedDCBStats } from '@/lib/dcb/district-tables';

type DashboardStats = {
  pendingApprovals: number;
  verifiedToday: number;
  totalVerifiedThisMonth: number;
  rejectedThisMonth: number;
  verifiedThisMonthCount: number;
};

type DistrictAgg = {
  district_id: string;
  district_name: string;
  pending_count: number;
  verified_amount: number;
};

export default function AccountsDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    pendingApprovals: 0,
    verifiedToday: 0,
    totalVerifiedThisMonth: 0,
    rejectedThisMonth: 0,
    verifiedThisMonthCount: 0,
  });
  const [districts, setDistricts] = useState<DistrictAgg[]>([]);
  const [recent, setRecent] = useState<any[]>([]);

  const formatCurrency = (amount: number) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const loadDashboard = useCallback(async () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

    try {
      const [
        pendingRes,
        verifiedTodayRes,
        verifiedMonthRes,
        rejectedMonthRes,
        recentRes,
        districtAggRes,
        weeklyRes,
      ] = await Promise.all([
        supabase
          .from('collections')
          .select('id', { count: 'exact', head: true })
          .in('status', ['pending', 'sent_to_accounts']),
        supabase
          .from('collections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'verified')
          .gte('verified_at', `${todayStr}T00:00:00.000Z`),
        supabase
          .from('collections')
          .select('total_amount, verified_at')
          .eq('status', 'verified')
          .gte('verified_at', monthStart)
          .limit(10000),
        supabase
          .from('collections')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'rejected')
          .gte('verified_at', monthStart),
        supabase
          .from('collections')
          .select(
            `
            id,
            status,
            total_amount,
            arrear_amount,
            current_amount,
            collection_date,
            updated_at,
            created_at,
            institution:institutions (
              id,
              name,
              ap_gazette_no,
              district:districts (
                id,
                name
              )
            ),
            inspector:profiles!collections_inspector_id_fkey (
              id,
              full_name
            )
          `
          )
          .order('updated_at', { ascending: false })
          .limit(10),
        supabase
          .from('collections')
          .select(
            `
            status,
            total_amount,
            institution:institutions (
              district:districts (
                id,
                name
              )
            )
          `
          )
          .in('status', ['pending', 'sent_to_accounts', 'verified'])
          .limit(10000),
        supabase
          .from('collections')
          .select('verified_at')
          .eq('status', 'verified')
          .gte('verified_at', new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString())
          .limit(10000),
      ]);

      const verifiedThisMonthRows = (verifiedMonthRes.data || []) as Array<{ total_amount: number | null }>;
      const verifiedThisMonthTotal = verifiedThisMonthRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0);

      // Get aggregated DCB stats from all district tables for better accuracy
      const dcbStats = await getAggregatedDCBStats();
      const totalCollectionFromDCB = dcbStats.totalCollection;

      setStats({
        pendingApprovals: pendingRes.count || 0,
        verifiedToday: verifiedTodayRes.count || 0,
        totalVerifiedThisMonth: verifiedThisMonthTotal,
        rejectedThisMonth: rejectedMonthRes.count || 0,
        verifiedThisMonthCount: verifiedThisMonthRows.length,
      });

      setRecent((recentRes.data as any[]) || []);

      // District aggregation (lightweight client-side rollup)
      const map = new Map<string, DistrictAgg>();
      (districtAggRes.data as any[] | null)?.forEach((row) => {
        const district = row?.institution?.district;
        const id = district?.id || 'unknown';
        const name = district?.name || 'Unknown';
        if (!map.has(id)) map.set(id, { district_id: id, district_name: name, pending_count: 0, verified_amount: 0 });

        const agg = map.get(id)!;
        if (row.status === 'verified') agg.verified_amount += Number(row.total_amount || 0);
        else agg.pending_count += 1;
      });

      const sortedDistricts = Array.from(map.values()).sort((a, b) => b.verified_amount - a.verified_amount);
      setDistricts(sortedDistricts);

      // Weekly counts (Mon..Sun style)
      const days = Array.from({ length: 7 }).map((_, idx) => {
        const d = new Date(Date.now() - (6 - idx) * 24 * 3600 * 1000);
        return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-US', { weekday: 'short' }) };
      });
      const counts = new Map<string, number>();
      (weeklyRes.data as any[] | null)?.forEach((r) => {
        const dayKey = String(r.verified_at || '').slice(0, 10);
        if (!dayKey) return;
        counts.set(dayKey, (counts.get(dayKey) || 0) + 1);
      });
      setWeeklySeries(days.map((d) => ({ label: d.label, count: counts.get(d.key) || 0 })));
    } catch (e) {
      console.error('Accounts dashboard load error:', e);
    }
  }, []);

  const [weeklySeries, setWeeklySeries] = useState<Array<{ label: string; count: number }>>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadDashboard();
      setLoading(false);
    })();
  }, [loadDashboard]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboard();
    setRefreshing(false);
  }, [loadDashboard]);

  const weeklyChartData = useMemo(() => {
    const labels = weeklySeries.length ? weeklySeries.map((d) => d.label) : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const data = weeklySeries.length ? weeklySeries.map((d) => d.count) : [0, 0, 0, 0, 0, 0, 0];
    return { labels, datasets: [{ data }] };
  }, [weeklySeries]);

  const statusPieData = useMemo(() => {
    return [
      {
        name: 'Pending',
        population: stats.pendingApprovals,
        color: theme.colors.warning,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
        legendFontFamily: 'Nunito-SemiBold',
      },
      {
        name: 'Verified',
        population: stats.verifiedThisMonthCount,
        color: theme.colors.success,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
        legendFontFamily: 'Nunito-SemiBold',
      },
      {
        name: 'Rejected',
        population: stats.rejectedThisMonth,
        color: theme.colors.danger,
        legendFontColor: theme.colors.text,
        legendFontSize: 12,
        legendFontFamily: 'Nunito-SemiBold',
      },
    ];
  }, [stats.pendingApprovals, stats.verifiedThisMonthCount, stats.rejectedThisMonth]);

  if (loading) {
    return (
      <Screen>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      scrollProps={{
        refreshControl: <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />,
        showsVerticalScrollIndicator: true,
        removeClippedSubviews: false,
        scrollEventThrottle: 16,
      }}
    >
      <View style={styles.page}>
        <AppHeader title="Accounts" subtitle={profile?.full_name ? `Welcome, ${profile.full_name}` : 'Dashboard'} />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.kpiGrid}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => router.push('/accounts/approvals')} style={styles.kpiWrap}>
            <Card style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.warning}15`, borderColor: `${theme.colors.warning}30` }]}>
                  <Ionicons name="time-outline" size={18} color={theme.colors.warning} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{stats.pendingApprovals}</Text>
              <Text style={styles.kpiLabel}>Pending approvals</Text>
            </Card>
          </TouchableOpacity>

          <View style={styles.kpiWrap}>
            <Card style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.success}15`, borderColor: `${theme.colors.success}30` }]}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={theme.colors.success} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{stats.verifiedToday}</Text>
              <Text style={styles.kpiLabel}>Verified today</Text>
            </Card>
          </View>

          <View style={styles.kpiWrap}>
            <Card style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }]}>
                  <Ionicons name="cash-outline" size={18} color={theme.colors.primary} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{formatCurrency(stats.totalVerifiedThisMonth)}</Text>
              <Text style={styles.kpiLabel}>Verified this month</Text>
            </Card>
          </View>

          <View style={styles.kpiWrap}>
            <Card style={styles.kpiCard}>
              <View style={styles.kpiTop}>
                <View style={[styles.kpiIcon, { backgroundColor: `${theme.colors.danger}15`, borderColor: `${theme.colors.danger}30` }]}>
                  <Ionicons name="close-circle-outline" size={18} color={theme.colors.danger} />
                </View>
              </View>
              <Text style={styles.kpiValue}>{stats.rejectedThisMonth}</Text>
              <Text style={styles.kpiLabel}>Rejected this month</Text>
            </Card>
          </View>
        </View>

        <View style={{ height: theme.spacing.md }} />

        <AnimatedChart type="bar" title="Weekly verifications" data={weeklyChartData} color={theme.colors.primary} height={240} />
        <AnimatedChart type="pie" title="This month (status)" data={statusPieData} height={220} />

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top districts</Text>
          <TouchableOpacity onPress={() => router.push('/accounts/reports')} activeOpacity={0.85}>
            <Text style={styles.link}>Reports</Text>
          </TouchableOpacity>
        </View>

        {districts.length === 0 ? (
          <EmptyState title="No district data" description="No collections found." icon="map-outline" />
        ) : (
          districts.slice(0, 8).map((d) => (
            <TouchableOpacity
              key={d.district_id}
              activeOpacity={0.85}
              onPress={() => router.push(`/accounts/reports/district?districtId=${d.district_id}`)}
              style={{ marginBottom: theme.spacing.sm }}
            >
              <Card style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{d.district_name}</Text>
                  <Text style={styles.rowSubtitle}>Pending: {d.pending_count}</Text>
                </View>
                <Text style={styles.rowValue}>{formatCurrency(d.verified_amount)}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: theme.spacing.md }} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent activity</Text>
          <TouchableOpacity onPress={() => router.push('/accounts/approvals')} activeOpacity={0.85}>
            <Text style={styles.link}>Approvals</Text>
          </TouchableOpacity>
        </View>

        {recent.length === 0 ? (
          <EmptyState title="No recent activity" description="No collections found." icon="time-outline" />
        ) : (
          recent.slice(0, 6).map((c) => (
            <TouchableOpacity
              key={c.id}
              activeOpacity={0.85}
              onPress={() => router.push(`/accounts/approvals/${c.id}`)}
              style={{ marginBottom: theme.spacing.sm }}
            >
              <Card style={styles.rowCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{c.institution?.name || `Institution #${c.institution_id}`}</Text>
                  <Text style={styles.rowSubtitle}>
                    {c.institution?.district?.name || 'Unknown'} • {c.inspector?.full_name || 'Inspector'}
                  </Text>
                </View>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{String(c.status || 'pending').replaceAll('_', ' ').toUpperCase()}</Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: theme.spacing.xl }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  page: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: 60,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  kpiWrap: {
    width: '48%',
  },
  kpiCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  kpiIcon: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 2,
  },
  kpiLabel: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  sectionTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
  },
  link: {
    fontFamily: 'Nunito-SemiBold',
    fontSize: 12,
    color: theme.colors.primary,
  },
  rowCard: {
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  rowTitle: {
    fontFamily: 'Nunito-Bold',
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 2,
  },
  rowSubtitle: {
    fontFamily: 'Nunito-Regular',
    fontSize: 12,
    color: theme.colors.muted,
  },
  rowValue: {
    fontFamily: 'Nunito-Bold',
    fontSize: 12,
    color: theme.colors.text,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceAlt,
  },
  badgeText: {
    fontFamily: 'Nunito-Bold',
    fontSize: 10,
    color: theme.colors.text,
  },
});
