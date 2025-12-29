import React, { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/Screen';
import { AppHeader } from '@/components/ui/AppHeader';
import { Card } from '@/components/ui/Card';
import { theme } from '@/lib/theme';

export default function NotificationsSettingsScreen() {
  const [newPendingApprovals, setNewPendingApprovals] = useState(true);
  const [rejectedCollections, setRejectedCollections] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  return (
    <Screen scroll>
      <View style={styles.page}>
        <AppHeader title="Notifications" subtitle="Preferences" />

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <View style={[styles.iconPill, { backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }]}>
              <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
            </View>
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>New pending approvals</Text>
              <Text style={styles.settingDescription}>When inspectors submit new collections</Text>
            </View>
          </View>
          <Switch
            value={newPendingApprovals}
            onValueChange={setNewPendingApprovals}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Card>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <View style={[styles.iconPill, { backgroundColor: `${theme.colors.danger}15`, borderColor: `${theme.colors.danger}30` }]}>
              <Ionicons name="close-circle-outline" size={18} color={theme.colors.danger} />
            </View>
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>Rejected collections</Text>
              <Text style={styles.settingDescription}>Alerts when a collection is rejected</Text>
            </View>
          </View>
          <Switch
            value={rejectedCollections}
            onValueChange={setRejectedCollections}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Card>

        <Card style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <View style={[styles.iconPill, { backgroundColor: `${theme.colors.info}15`, borderColor: `${theme.colors.info}30` }]}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.info} />
            </View>
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>Daily summary</Text>
              <Text style={styles.settingDescription}>Daily rollup of verified and pending collections</Text>
            </View>
          </View>
          <Switch
            value={dailySummary}
            onValueChange={setDailySummary}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.surface}
          />
        </Card>

        <View style={{ height: theme.spacing.md }} />

        <Card style={styles.noteContainer}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.muted} />
          <Text style={styles.noteText}>
            Preferences are stored locally. Push notifications can be wired later.
          </Text>
        </Card>
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
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingItemText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  settingTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
  iconPill: {
    width: 36,
    height: 36,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  noteContainer: {
    flexDirection: 'row',
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
  },
});
