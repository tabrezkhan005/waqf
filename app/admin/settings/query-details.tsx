import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { theme } from '@/lib/theme';
import { EmptyState } from '@/components/ui/EmptyState';

interface QueryData {
  id: number;
  inspector_name: string;
  district: string;
  title: string;
  description: string;
  issue_type: string;
  status: string;
  timestamp: string;
  resolved_by?: string;
  resolved_at?: string;
  resolution_notes?: string;
}

export default function QueryDetailsScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { id } = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState<QueryData | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  useEffect(() => {
    if (id) {
      loadQuery();
    }
  }, [id]);

  const loadQuery = async () => {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('queries')
        .select(`
          id,
          title,
          description,
          issue_type,
          status,
          created_at,
          resolved_at,
          resolution_notes,
          inspector:profiles!queries_inspector_id_fkey (
            id,
            full_name,
            district:districts (
              id,
              name
            )
          ),
          resolved_by_profile:profiles!queries_resolved_by_fkey (
            id,
            full_name
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        setQuery({
          id: data.id,
          inspector_name: data.inspector?.full_name || 'Unknown Inspector',
          district: data.inspector?.district?.name || 'Unknown District',
          title: data.title,
          description: data.description,
          issue_type: data.issue_type,
          status: data.status,
          timestamp: data.created_at,
          resolved_at: data.resolved_at || undefined,
          resolution_notes: data.resolution_notes || undefined,
        });
        setResolutionNotes(data.resolution_notes || '');
      }
    } catch (error: any) {
      console.error('Error loading query:', error);
      Alert.alert('Error', 'Failed to load query details');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkResolved = async () => {
    if (!query || !profile) return;

    if (!resolutionNotes.trim()) {
      Alert.alert('Resolution Notes Required', 'Please provide resolution notes before marking as resolved.');
      return;
    }

    Alert.alert('Mark Resolved', 'This query will be marked as resolved', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Mark Resolved',
        onPress: async () => {
          try {
            setSaving(true);
            const { error } = await supabase
              .from('queries')
              .update({
                status: 'resolved',
                resolved_by: profile.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes.trim(),
              })
              .eq('id', query.id);

            if (error) throw error;

            Alert.alert('Success', 'Query marked as resolved', [
              { text: 'OK', onPress: () => router.back() },
            ]);
          } catch (error: any) {
            console.error('Error resolving query:', error);
            Alert.alert('Error', error.message || 'Failed to resolve query');
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!query) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          <EmptyState
            title="Query not found"
            description="The query you're looking for doesn't exist."
            icon="alert-circle-outline"
          />
        </View>
      </ScrollView>
    );
  }

  const isResolved = query.status === 'resolved' || query.status === 'closed';
  const isOpen = query.status === 'open' || query.status === 'in_progress';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View
            style={[
              styles.statusBadge,
              isOpen ? styles.statusBadgeOpen : styles.statusBadgeResolved,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                isOpen ? styles.statusTextOpen : styles.statusTextResolved,
              ]}
            >
              {query.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Query Information</Text>
          <View style={styles.infoCard}>
            <InfoRow label="Inspector" value={query.inspector_name} />
            <InfoRow label="District" value={query.district} />
            <InfoRow
              label="Issue Type"
              value={query.issue_type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            />
            <InfoRow
              label="Date"
              value={new Date(query.timestamp).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            />
            {isResolved && query.resolved_at && (
              <>
                <InfoRow
                  label="Resolved At"
                  value={new Date(query.resolved_at).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Issue Details</Text>
          <View style={styles.issueCard}>
            <Text style={styles.issueTitle}>{query.title}</Text>
            <Text style={styles.issueDescription}>{query.description}</Text>
          </View>
        </View>

        {isResolved && query.resolution_notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution Notes</Text>
            <View style={styles.resolutionCard}>
              <Text style={styles.resolutionText}>{query.resolution_notes}</Text>
            </View>
          </View>
        )}

        {isOpen && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution Notes *</Text>
            <TextInput
              style={styles.resolutionInput}
              placeholder="Enter resolution notes..."
              placeholderTextColor={theme.colors.muted}
              value={resolutionNotes}
              onChangeText={setResolutionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <TouchableOpacity
              style={[styles.resolveButton, saving && styles.resolveButtonDisabled]}
              onPress={handleMarkResolved}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.resolveButtonText}>Mark as Resolved</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.bottomSpacer} />
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
    backgroundColor: theme.colors.bg,
  },
  contentContainer: {
    paddingBottom: 120, // Extra padding to prevent content from being hidden
  },
  content: {
    padding: theme.spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.bg,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: theme.spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.full,
    borderWidth: 1,
  },
  statusBadgeOpen: {
    backgroundColor: theme.colors.warning + '15',
    borderColor: theme.colors.warning + '30',
  },
  statusBadgeResolved: {
    backgroundColor: theme.colors.success + '15',
    borderColor: theme.colors.success + '30',
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Nunito-Bold',
    textTransform: 'uppercase',
  },
  statusTextOpen: {
    color: theme.colors.warning,
  },
  statusTextResolved: {
    color: theme.colors.success,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  infoCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border + '40',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.muted,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: theme.colors.text,
    flex: 1,
    textAlign: 'right',
  },
  issueCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  issueTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  issueDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    lineHeight: 20,
  },
  resolutionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.success + '30',
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.success,
  },
  resolutionText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    lineHeight: 20,
  },
  resolutionInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: theme.colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: theme.spacing.md,
  },
  resolveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.success,
    borderRadius: theme.radius.md,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
    shadowColor: theme.colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  resolveButtonDisabled: {
    opacity: 0.6,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  bottomSpacer: {
    height: 20,
  },
});
