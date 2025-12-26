import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Institution, InstitutionWithDistrict } from '@/lib/types/database';

type FilterStatus = 'all' | 'pending' | 'completed';

export default function InstitutionSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    (params.filter as FilterStatus) || 'all'
  );
  const [institutions, setInstitutions] = useState<InstitutionWithDistrict[]>([]);
  const [loading, setLoading] = useState(false);
  const [filteredInstitutions, setFilteredInstitutions] = useState<InstitutionWithDistrict[]>([]);

  useEffect(() => {
    loadInstitutions();
  }, [profile]);

  useEffect(() => {
    filterInstitutions();
  }, [searchQuery, filterStatus, institutions]);

  const loadInstitutions = async () => {
    if (!profile?.district_id) {
      console.log('No district_id for inspector');
      return;
    }

    try {
      setLoading(true);

      // First, get the district name
      const { data: districtData } = await supabase
        .from('districts')
        .select('name')
        .eq('id', profile.district_id)
        .single();

      if (!districtData) {
        console.error('District not found for inspector');
        return;
      }

      // Load institutions directly from institutions table filtered by district_id
      const { data, error } = await supabase
        .from('institutions')
        .select(`
          *,
          district:districts (
            id,
            name,
            code
          )
        `)
        .eq('district_id', profile.district_id)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading institutions:', error);
        return;
      }
      setInstitutions((data as InstitutionWithDistrict[]) || []);
    } catch (error) {
      console.error('Error loading institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterInstitutions = async () => {
    let filtered = [...institutions];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inst) =>
          inst.name?.toLowerCase().includes(query) ||
          inst.code?.toLowerCase().includes(query) ||
          (inst as any).dcb?.ap_no?.toLowerCase().includes(query) ||
          (inst as any).dcb?.village?.toLowerCase().includes(query) ||
          (inst as any).dcb?.mandal?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      // Get institution IDs that have collections
      const { data: collections } = await supabase
        .from('collections')
        .select('institution_id')
        .eq('inspector_id', profile?.id || '');

      const collectedInstitutionIds = new Set(
        collections?.map((c) => c.institution_id) || []
      );

      if (filterStatus === 'pending') {
        filtered = filtered.filter((inst) => !collectedInstitutionIds.has(inst.id));
      } else if (filterStatus === 'completed') {
        filtered = filtered.filter((inst) => collectedInstitutionIds.has(inst.id));
      }
    }

    setFilteredInstitutions(filtered);
  };

  const handleInstitutionPress = (institution: InstitutionWithDistrict) => {
    router.push({
      pathname: '/inspector/search/collection',
      params: { institutionId: institution.id.toString() },
    });
  };

  const renderInstitutionItem = ({ item }: { item: InstitutionWithDistrict }) => {
    return (
      <TouchableOpacity
        style={styles.institutionCard}
        onPress={() => handleInstitutionPress(item)}
      >
        <View style={styles.institutionCardLeft}>
          <Text style={styles.institutionName}>{item.name}</Text>
          {item.code && (
            <Text style={styles.institutionCode}>Code: {item.code}</Text>
          )}
          <View style={styles.institutionLocation}>
            {item.district && (
              <Text style={styles.locationText}>
                {item.district.name}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.institutionCardRight}>
          <Ionicons name="chevron-forward" size={24} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or code..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'all' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('all')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'all' && styles.filterButtonTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'pending' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('pending')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'pending' && styles.filterButtonTextActive,
            ]}
          >
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filterStatus === 'completed' && styles.filterButtonActive,
          ]}
          onPress={() => setFilterStatus('completed')}
        >
          <Text
            style={[
              styles.filterButtonText,
              filterStatus === 'completed' && styles.filterButtonTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1A9D5C" />
        </View>
      ) : filteredInstitutions.length > 0 ? (
        <FlatList
          data={filteredInstitutions}
          renderItem={renderInstitutionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'No institutions found' : 'No institutions available'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#1A9D5C',
    borderColor: '#1A9D5C',
  },
  filterButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  institutionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  institutionCardLeft: {
    flex: 1,
  },
  institutionName: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  institutionCode: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  institutionLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  institutionCardRight: {
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginTop: 16,
    textAlign: 'center',
  },
});
