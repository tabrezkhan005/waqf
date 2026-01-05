import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase/client';
import { Ionicons } from '@expo/vector-icons';

export default function InstitutionProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [institution, setInstitution] = useState<any>(null);

  useEffect(() => {
    loadInstitutionData();
  }, [id]);

  const loadInstitutionData = async () => {
    try {
      setLoading(true);
      // Load institution with district
      const { data: institutionData, error: institutionError } = await supabase
        .from('institutions')
        .select(`
          *,
          districts(name)
        `)
        .eq('id', id)
        .single();

      if (institutionError) throw institutionError;

      // Load inspector for this district (if any)
      let inspectorName = 'Not Assigned';
      if (institutionData.district_id) {
        const { data: inspector } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('role', 'inspector')
          .eq('district_id', institutionData.district_id)
          .limit(1)
          .single();

        if (inspector) {
          inspectorName = inspector.full_name;
        }
      }

      setInstitution({
        ...institutionData,
        inspector_name: inspectorName,
      });
    } catch (error) {
      // Removed debug log institution:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  if (!institution) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Institution not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="business" size={32} color="#1A9D5C" />
          </View>
          <Text style={styles.name}>{institution.name}</Text>
          {institution.code && <Text style={styles.code}>Code: {institution.code}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          <View style={styles.infoCard}>
            <InfoRow label="District" value={(institution.districts as any)?.name || 'N/A'} />
            <InfoRow label="Address" value={institution.address || 'N/A'} />
            <InfoRow label="Contact" value={institution.contact_name || 'N/A'} />
            <InfoRow label="Phone" value={institution.contact_phone || 'N/A'} />
            <InfoRow label="Responsible Inspector" value={institution.inspector_name || 'Not Assigned'} />
          </View>
        </View>

        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(`/admin/inspectors-institutions/institutions/edit?id=${id}`)}
          >
            <Ionicons name="create-outline" size={20} color="#003D99" />
            <Text style={styles.actionText}>Edit Institution</Text>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A9D5C15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
    textAlign: 'center',
  },
  code: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
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
    flex: 1,
    textAlign: 'right',
  },
  actionsSection: {
    marginTop: 8,
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
  actionText: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginLeft: 12,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#FF3B30',
    textAlign: 'center',
    padding: 20,
  },
});
