import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase/client';
import type { InspectorSummary, CollectionWithRelations } from '@/lib/types/database';

export default function InspectorHistoryScreen() {
  const [loading, setLoading] = useState(true);
  const [inspectors, setInspectors] = useState<InspectorSummary[]>([]);
  const [selectedInspector, setSelectedInspector] = useState<InspectorSummary | null>(null);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);

  useEffect(() => {
    loadInspectors();
  }, []);

  const loadInspectors = async () => {
    try {
      setLoading(true);
      const { data: inspectorProfiles } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          district_id,
          district:districts (
            id,
            name
          )
        `)
        .eq('role', 'inspector')
        .order('full_name');

      if (!inspectorProfiles) return;

      const summaries: InspectorSummary[] = [];

      for (const inspector of inspectorProfiles) {
        // Load DCB data for this inspector by matching inspector name
        const { data: inspectorDcb } = await supabase
          .from('institution_dcb')
          .select('*')
          .eq('inspector_name', inspector.full_name);

        const total = inspectorDcb?.length || 0;
        const verified = inspectorDcb?.filter((d: any) => d.receipt_no || d.challan_no).length || 0;
        const rejected = 0; // DCB doesn't track rejected
        const pending = total - verified;

        const totalArrear = inspectorDcb?.reduce(
          (sum: number, d: any) => sum + Number(d.d_arrears || 0),
          0
        ) || 0;

        const totalCurrent = inspectorDcb?.reduce(
          (sum: number, d: any) => sum + Number(d.d_current || 0),
          0
        ) || 0;

        const verificationRate = total > 0 ? (verified / total) * 100 : 0;

        summaries.push({
          inspector_id: inspector.id,
          inspector_name: inspector.full_name,
          district_name: inspector.district?.name || 'Unknown',
          total_collections: total,
          verified_count: verified,
          rejected_count: rejected,
          pending_count: pending,
          total_arrear: totalArrear,
          total_current: totalCurrent,
          verification_rate: verificationRate,
        });
      }

      setInspectors(summaries);
    } catch (error) {
      console.error('Error loading inspectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInspectorCollections = async (inspectorId: string) => {
    try {
      setLoading(true);

      // Get inspector name from ID
      const { data: inspectorProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', inspectorId)
        .single();

      if (!inspectorProfile) {
        setCollections([]);
        return;
      }

      // Load DCB data for this inspector
      const { data: dcbData } = await supabase
        .from('institution_dcb')
        .select('*')
        .eq('inspector_name', inspectorProfile.full_name)
        .order('created_at', { ascending: false });

      // Transform to collection-like format
      const collections = (dcbData || []).map((d: any) => ({
        id: d.id,
        arrear_amount: d.d_arrears,
        current_amount: d.d_current,
        collection_date: d.receipt_date || d.challan_date || d.created_at,
        status: d.receipt_no || d.challan_no ? 'verified' : 'pending',
        challan_no: d.challan_no,
        receipt_no: d.receipt_no,
        created_at: d.created_at,
      }));

      setCollections(collections as CollectionWithRelations[]);
    } catch (error) {
      console.error('Error loading inspector collections:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !selectedInspector) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {!selectedInspector ? (
        <>
          <Text style={styles.sectionTitle}>Select Inspector</Text>
          {inspectors.map((inspector) => (
            <TouchableOpacity
              key={inspector.inspector_id}
              style={styles.inspectorCard}
              onPress={() => {
                setSelectedInspector(inspector);
                loadInspectorCollections(inspector.inspector_id);
              }}
            >
              <Text style={styles.inspectorName}>{inspector.inspector_name}</Text>
              <Text style={styles.inspectorDistrict}>{inspector.district_name}</Text>
              <View style={styles.inspectorStats}>
                <Text style={styles.statText}>
                  Collections: {inspector.total_collections} | Verified: {inspector.verified_count}
                </Text>
                <Text style={styles.statText}>
                  Rate: {inspector.verification_rate.toFixed(1)}%
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      ) : (
        <>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setSelectedInspector(null);
              setCollections([]);
            }}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{selectedInspector.inspector_name}</Text>
            <Text style={styles.districtName}>{selectedInspector.district_name}</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInspector.total_collections}</Text>
              <Text style={styles.summaryLabel}>Total Collections</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInspector.verified_count}</Text>
              <Text style={styles.summaryLabel}>Verified</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{selectedInspector.verification_rate.toFixed(1)}%</Text>
              <Text style={styles.summaryLabel}>Verification Rate</Text>
            </View>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>
                ₹{(selectedInspector.total_arrear + selectedInspector.total_current).toLocaleString('en-IN')}
              </Text>
              <Text style={styles.summaryLabel}>Total Collected</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Collections</Text>
            {collections.map((collection) => {
              const total = Number(collection.arrear_amount || 0) + Number(collection.current_amount || 0);
              return (
                <View key={collection.id} style={styles.collectionItem}>
                  <View style={styles.collectionItemLeft}>
                    <Text style={styles.collectionDate}>
                      {new Date(collection.collection_date).toLocaleDateString('en-IN')}
                    </Text>
                    <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
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
  inspectorCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inspectorName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  inspectorDistrict: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  inspectorStats: {
    gap: 4,
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontFamily: 'Nunito-SemiBold',
    color: '#FF9500',
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
