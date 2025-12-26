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
// Using custom dropdown instead of Picker

interface Inspector {
  id: string;
  full_name: string;
  district_id: string; // UUID
  district_name?: string;
  pending_collections?: number;
}

export default function InspectorsListScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [filteredInspectors, setFilteredInspectors] = useState<Inspector[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string | 'all'>('all');
  const [districts, setDistricts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInspectors();
  }, [selectedDistrict, searchQuery, inspectors]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadInspectors(), loadDistricts()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInspectors = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          district_id
        `)
        .eq('role', 'inspector')
        .order('full_name');

      if (error) throw error;

      // Load district names
      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name');

      const districtMap = new Map(districtsData?.map((d) => [d.id, d.name]) || []);

      // Load pending collections count
      const { data: collections } = await supabase
        .from('collections')
        .select('inspector_id, status');

      const pendingCounts = new Map<string, number>();
      collections?.forEach((c) => {
        if (c.status === 'pending') {
          pendingCounts.set(c.inspector_id, (pendingCounts.get(c.inspector_id) || 0) + 1);
        }
      });

      const inspectorsWithData: Inspector[] = (profiles || []).map((profile) => ({
        ...profile,
        district_name: districtMap.get(profile.district_id) || 'Unknown',
        pending_collections: pendingCounts.get(profile.id) || 0,
      }));

      setInspectors(inspectorsWithData);
    } catch (error) {
      console.error('Error loading inspectors:', error);
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

  const filterInspectors = () => {
    let filtered = [...inspectors];

    // Filter by district
    if (selectedDistrict !== 'all') {
      filtered = filtered.filter((i) => i.district_id === selectedDistrict);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (i) =>
          i.full_name.toLowerCase().includes(query) ||
          i.district_name?.toLowerCase().includes(query)
      );
    }

    setFilteredInspectors(filtered);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A7E43" />
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
            placeholder="Search inspectors..."
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
        onPress={() => router.push('/admin/inspectors-institutions/inspectors/add')}
      >
        <Ionicons name="add" size={24} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Add Inspector</Text>
      </TouchableOpacity>

      {/* Inspectors List */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredInspectors.length > 0 ? (
          filteredInspectors.map((inspector) => (
            <TouchableOpacity
              key={inspector.id}
              style={styles.inspectorCard}
              onPress={() =>
                router.push(`/admin/inspectors-institutions/inspector-profile?id=${inspector.id}`)
              }
            >
              <View style={styles.inspectorHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {inspector.full_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.inspectorInfo}>
                  <Text style={styles.inspectorName}>{inspector.full_name}</Text>
                  <View style={styles.inspectorMeta}>
                    <Ionicons name="location-outline" size={14} color="#8E8E93" />
                    <Text style={styles.metaText}>{inspector.district_name}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.statsRow}>
                <View style={styles.statBadge}>
                  <Text style={styles.statValue}>{inspector.pending_collections || 0}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#E5E5EA" />
            <Text style={styles.emptyStateText}>No inspectors found</Text>
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
    backgroundColor: '#0A7E43',
    borderColor: '#0A7E43',
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
    backgroundColor: '#0A7E43',
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
  inspectorCard: {
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  inspectorHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A7E43',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  inspectorInfo: {
    flex: 1,
  },
  inspectorName: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 6,
  },
  inspectorMeta: {
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
    color: '#0A7E43',
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
