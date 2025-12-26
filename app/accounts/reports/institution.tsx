import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import type { InstitutionHistory, CollectionWithRelations } from '@/lib/types/database';

export default function InstitutionHistoryScreen() {
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionHistory | null>(null);

  useEffect(() => {
    loadInstitutions();
  }, []);

  const loadInstitutions = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('institutions')
        .select(`
          id,
          name,
          ap_gazette_no,
          district:districts (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      setInstitutions(data || []);
    } catch (error) {
      console.error('Error loading institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutionHistory = async (institutionId: string) => {
    try {
      setLoading(true);

      // First get institution details
      const { data: institutionData } = await supabase
        .from('institutions')
        .select(`
          id,
          name,
          code,
          ap_no,
          district:districts (
            id,
            name
          )
        `)
        .eq('id', institutionId)
        .single();

      if (!institutionData) {
        Alert.alert('Error', 'Institution not found');
        return;
      }

      // Load DCB data for this institution
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select('*')
        .eq('institution_id', institutionId)
        .order('created_at', { ascending: false });

      if (!dcbData || dcbData.length === 0) {
        Alert.alert('No Data', 'No DCB records found for this institution');
        return;
      }

      // Transform DCB data to collection-like format
      const collections = dcbData.map((d: any) => ({
        id: d.id,
        institution: institutionData,
        arrear_amount: d.d_arrears,
        current_amount: d.d_current,
        collection_date: d.receipt_date || d.challan_date || d.created_at,
        status: d.receipt_no || d.challan_no ? 'verified' : 'pending',
        challan_no: d.challan_no,
        receipt_no: d.receipt_no,
        created_at: d.created_at,
      }));

      const totalArrear = dcbData.reduce(
        (sum: number, d: any) => sum + Number(d.d_arrears || 0),
        0
      );
      const totalCurrent = dcbData.reduce(
        (sum: number, d: any) => sum + Number(d.d_current || 0),
        0
      );

      setSelectedInstitution({
        institution_id: institutionId,
        institution_name: institutionData.name || 'Unknown',
        institution_code: institutionData.code || null,
        district_name: institutionData.district?.name || 'Unknown',
        collections: collections as CollectionWithRelations[],
        total_arrear: totalArrear,
        total_current: totalCurrent,
        verified_count: dcbData.filter((d: any) => d.receipt_no || d.challan_no).length,
        pending_count: dcbData.filter((d: any) => !d.receipt_no && !d.challan_no).length,
        rejected_count: 0,
      });
    } catch (error) {
      console.error('Error loading institution history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedInstitution) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!selectedInstitution ? (
        <>
          <Text style={styles.sectionTitle}>Search Institution</Text>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name or code..."
              placeholderTextColor="#8E8E93"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.institutionsList}>
            {institutions
              .filter((inst) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                  inst.name.toLowerCase().includes(query) ||
                  inst.code?.toLowerCase().includes(query)
                );
              })
              .map((institution) => (
                <TouchableOpacity
                  key={institution.id}
                  style={styles.institutionCard}
                  onPress={() => loadInstitutionHistory(institution.id)}
                >
                  <Text style={styles.institutionName}>{institution.name}</Text>
                  {institution.code && (
                    <Text style={styles.institutionCode}>Code: {institution.code}</Text>
                  )}
                  {institution.district && (
                    <Text style={styles.institutionDistrict}>{institution.district.name}</Text>
                  )}
                </TouchableOpacity>
              ))}
          </View>
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedInstitution(null)}
          >
            <Ionicons name="arrow-back" size={24} color="#FF9500" />
            <Text style={styles.backButtonText}>Back to Search</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedInstitution.institution_name}</Text>
            {selectedInstitution.institution_code && (
              <Text style={styles.institutionCodeText}>Code: {selectedInstitution.institution_code}</Text>
            )}
            <Text style={styles.districtName}>{selectedInstitution.district_name}</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInstitution.total_arrear.toLocaleString('en-IN')}</Text>
              <Text style={styles.summaryLabel}>Total Arrear</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInstitution.total_current.toLocaleString('en-IN')}</Text>
              <Text style={styles.summaryLabel}>Total Current</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInstitution.verified_count}</Text>
              <Text style={styles.summaryLabel}>Verified</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInstitution.pending_count}</Text>
              <Text style={styles.summaryLabel}>Pending</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collection History</Text>
            {selectedInstitution.collections.map((collection) => {
              const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
              return (
                <View key={collection.id} style={styles.collectionItem}>
                  <View style={styles.collectionItemLeft}>
                    <Text style={styles.collectionDate}>
                      {new Date(collection.collection_date).toLocaleDateString('en-IN')}
                    </Text>
                    <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
                    {collection.challan_no && (
                      <Text style={styles.challanInfo}>Challan: {collection.challan_no}</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: '#FF950020' }]}>
                    <Text style={[styles.statusText, { color: '#FF9500' }]}>
                      {collection.status.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </>
      )}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
  institutionsList: {
    gap: 12,
  },
  institutionCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  institutionName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  institutionCode: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  institutionDistrict: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FF9500',
    marginLeft: 8,
  },
  institutionCodeText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  districtName: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  collectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  collectionItemLeft: {
    flex: 1,
  },
  collectionDate: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  collectionAmount: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#FF9500',
    marginBottom: 4,
  },
  challanInfo: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
});
