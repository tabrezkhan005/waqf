import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';

interface Institution {
  id: string; // UUID
  name: string;
  ap_gazette_no?: string;
  district_id: string; // UUID
  district_name?: string;
  inspector_name?: string;
  total_collections?: number;
}

export default function InstitutionsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<Institution[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | 'all'>('all');
  const [districts, setDistricts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInstitutions();
  }, [selectedDistrict, searchQuery, institutions]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadInstitutions(), loadDistricts()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutions = async () => {
    try {
      const { data: institutionsData, error } = await supabase
        .from('institutions')
        .select('id, name, ap_gazette_no, district_id, is_active')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name');

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, district_id')
        .eq('role', 'inspector');

      const { data: collections } = await supabase
        .from('collections')
        .select('institution_id');

      const districtMap = new Map(districtsData?.map((d) => [d.id, d.name]) || []);
      const inspectorMap = new Map(profiles?.map((p) => [p.district_id, p.full_name]) || []);
      const collectionCounts = new Map<string, number>(); // UUID is string
      collections?.forEach((c) => {
        collectionCounts.set(c.institution_id, (collectionCounts.get(c.institution_id) || 0) + 1);
      });

      const institutionsWithData: Institution[] = (institutionsData || []).map((inst) => ({
        ...inst,
        district_name: districtMap.get(inst.district_id) || 'Unknown',
        inspector_name: inspectorMap.get(inst.district_id) || 'Not Assigned',
        total_collections: collectionCounts.get(inst.id) || 0,
      }));

      setInstitutions(institutionsWithData);
    } catch (error) {
      console.error('Error loading institutions:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      const { data, error } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const filterInstitutions = () => {
    let filtered = [...institutions];

    if (selectedDistrict !== 'all') {
      filtered = filtered.filter((i) => i.district_id === selectedDistrict);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.code?.toLowerCase().includes(query) ||
          i.district_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInstitutions(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#003D99" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.filterSection}>
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search institutions..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.districtFilter}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              selectedDistrict === 'all' && styles.filterChipActive,
            ]}
            onPress={() => setSelectedDistrict('all')}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedDistrict === 'all' && styles.filterChipTextActive,
              ]}
            >
              All Districts
            </Text>
          </TouchableOpacity>
          {districts.map((district) => (
            <TouchableOpacity
              key={district.id}
              style={[
                styles.filterChip,
                selectedDistrict === district.id && styles.filterChipActive,
              ]}
              onPress={() => setSelectedDistrict(district.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedDistrict === district.id && styles.filterChipTextActive,
                ]}
              >
                {district.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push('/admin/inspectors-institutions/institutions/add')}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Institution</Text>
      </TouchableOpacity>

      {/* Institutions List */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredInstitutions.length > 0 ? (
          filteredInstitutions.map((institution) => (
            <TouchableOpacity
              key={institution.id}
              style={styles.institutionCard}
              onPress={() =>
                router.push(
                  `/admin/inspectors-institutions/institution-profile?id=${institution.id}`
                )
              }
            >
              <View style={styles.institutionHeader}>
                <View style={styles.iconContainer}>
                  <Ionicons name="business" size={24} color="#003D99" />
                </View>
                <View style={styles.institutionInfo}>
                  <Text style={styles.institutionName}>{institution.name}</Text>
                  {institution.code && (
                    <Text style={styles.institutionCode}>Code: {institution.code}</Text>
                  )}
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{institution.district_name}</Text>
                  </View>
                  <View style={styles.metaRow}>
                    <Ionicons name="person-outline" size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{institution.inspector_name}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statValue}>{institution.total_collections || 0}</Text>
                  <Text style={styles.statLabel}>Collections</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={64} color="#E5E5EA" />
            <Text style={styles.emptyStateText}>No institutions found</Text>
          </View>
        )}
      </ScrollView>
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
  filterSection: {
    padding: 16,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    paddingVertical: 12,
  },
  districtFilter: {
    marginTop: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#003D99',
    borderColor: '#003D99',
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
  },
  filterChipTextActive: {
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A9D5C',
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 100,
  },
  institutionCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  institutionHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#003D9915',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  institutionInfo: {
    flex: 1,
  },
  institutionName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  institutionCode: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginLeft: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  statBadge: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#1A9D5C',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 16,
  },
});
