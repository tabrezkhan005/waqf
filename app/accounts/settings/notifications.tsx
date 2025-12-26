import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsSettingsScreen() {
  const [newPendingApprovals, setNewPendingApprovals] = useState(true);
  const [rejectedCollections, setRejectedCollections] = useState(true);
  const [dailySummary, setDailySummary] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      <Text style={styles.sectionDescription}>
        Manage your notification settings for the Accounts role
      </Text>

      <View style={styles.settingsList}>
        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="time-outline" size={24} color="#FF9500" />
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>New Pending Approvals</Text>
              <Text style={styles.settingDescription}>
                Get notified when inspectors submit new collections
              </Text>
            </View>
          </View>
          <Switch
            value={newPendingApprovals}
            onValueChange={setNewPendingApprovals}
            trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="close-circle-outline" size={24} color="#FF3B30" />
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>Rejected Collections Alerts</Text>
              <Text style={styles.settingDescription}>
                Get notified about rejected collections
              </Text>
            </View>
          </View>
          <Switch
            value={rejectedCollections}
            onValueChange={setRejectedCollections}
            trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.settingItem}>
          <View style={styles.settingItemLeft}>
            <Ionicons name="calendar-outline" size={24} color="#003D99" />
            <View style={styles.settingItemText}>
              <Text style={styles.settingTitle}>Daily Summary</Text>
              <Text style={styles.settingDescription}>
                Receive daily summary of verified and pending collections
              </Text>
            </View>
          </View>
          <Switch
            value={dailySummary}
            onValueChange={setDailySummary}
            trackColor={{ false: '#E5E5EA', true: '#FF9500' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <View style={styles.noteContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#8E8E93" />
        <Text style={styles.noteText}>
          Notification preferences are stored locally. Push notifications will be implemented in a future update.
        </Text>
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
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 24,
  },
  settingsList: {
    gap: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  settingItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  settingItemText: {
    flex: 1,
    marginLeft: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  noteContainer: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginLeft: 12,
  },
});
























