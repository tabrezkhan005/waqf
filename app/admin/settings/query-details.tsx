import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function QueryDetailsScreen() {
  const { id } = useLocalSearchParams();
  const [query, setQuery] = useState({
    id: id,
    inspector_name: 'John Doe',
    district: 'District 1',
    issue: 'Unable to upload receipt image',
    description: 'The receipt upload feature is not working properly. I have tried multiple times but the image does not upload.',
    status: 'open',
    timestamp: new Date().toISOString(),
  });

  const handleMarkResolved = () => {
    Alert.alert('Mark Resolved', 'This query will be marked as resolved', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Resolved',
        onPress: () => {
          // Update query status
          setQuery({ ...query, status: 'resolved' });
          Alert.alert('Success', 'Query marked as resolved');
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.statusBadge,
              query.status === 'open' ? styles.statusBadgeOpen : styles.statusBadgeResolved,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                query.status === 'open' ? styles.statusTextOpen : styles.statusTextResolved,
              ]}
            >
              {query.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Query Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Inspector" value={query.inspector_name} />
            <InfoRow label="District" value={query.district} />
            <InfoRow label="Date" value={new Date(query.timestamp).toLocaleDateString()} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue</Text>
          <View style={styles.issueCard}>
            <Text style={styles.issueTitle}>{query.issue}</Text>
            <Text style={styles.issueDescription}>{query.description}</Text>
          </View>
        </View>

        {query.status === 'open' && (
          <TouchableOpacity style={styles.resolveButton} onPress={handleMarkResolved}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
            <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  header: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusBadgeOpen: {
    backgroundColor: '#FF950015',
  },
  statusBadgeResolved: {
    backgroundColor: '#1A9D5C15',
  },
  statusText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
  },
  statusTextOpen: {
    color: '#FF9500',
  },
  statusTextResolved: {
    color: '#1A9D5C',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
  },
  issueCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  issueTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 12,
  },
  issueDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    lineHeight: 20,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A9D5C',
    borderRadius: 12,
    padding: 18,
    gap: 8,
    marginTop: 8,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
  },
});
























