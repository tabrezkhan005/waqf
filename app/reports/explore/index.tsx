import React, { useState, useEffect } from 'react';
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
import { supabase } from '@/lib/supabase/client';

type SearchMode = 'district' | 'institution' | 'inspector';

export default function ExploreHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [searchMode, setSearchMode] = useState<SearchMode>('district');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);
  const [institutions, setInstitutions] = useState<Array<{ id: string; name: string; ap_gazette_no: string | null }>>([]);
  const [inspectors, setInspectors] = useState<Array<{ id: string; name: string; district_name: string }>>([]);

  useEffect(() => {
    loadData();
  }, [searchMode]);

  useEffect(() => {
    filterResults();
  }, [searchQuery, searchMode]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (searchMode === 'district') {
        const { data } = await supabase
          .from('districts')
          .select('id, name')
          .order('name');
        setDistricts(data || []);
      } else if (searchMode === 'institution') {
        const { data } = await supabase
          .from('institutions')
          .select('id, name, ap_gazette_no')
          .eq('is_active', true)
          .order('name');
        setInstitutions(data || []);
      } else if (searchMode === 'inspector') {
        const { data } = await supabase
          .from('profiles')
          .select(`
            id,
            full_name,
            district:districts (
              name
            )
          `)
          .eq('role', 'inspector')
          .order('full_name');
        setInspectors(
          (data || []).map((p: any) => ({
            id: p.id,
            name: p.full_name,
            district_name: p.district?.name || 'Unknown',
          }))
        );
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterResults = () => {
    // Results are already filtered by searchQuery in render
  };

  const getFilteredResults = () => {
    const query = searchQuery.toLowerCase();
    if (searchMode === 'district') {
      return districts.filter((d) => d.name.toLowerCase().includes(query));
    } else if (searchMode === 'institution') {
      return institutions.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.code?.toLowerCase().includes(query)
      );
    } else {
      return inspectors.filter(
        (i) =>
          i.name.toLowerCase().includes(query) ||
          i.district_name.toLowerCase().includes(query)
      );
    }
  };

  const handleItemPress = (item: any) => {
    if (searchMode === 'district') {
      router.push(`/reports/explore/district?districtId=${item.id}`);
    } else if (searchMode === 'institution') {
      router.push(`/reports/explore/institution?institutionId=${item.id}`);
    } else {
      router.push(`/reports/explore/inspector?inspectorId=${item.id}`);
    }
  };

  const renderDistrictItem = ({ item }: { item: typeof districts[0] }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
    >
      <Ionicons name="map" size={24} color="#9C27B0" />
      <View style={styles.resultCardContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSubtitle}>District</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );

  const renderInstitutionItem = ({ item }: { item: typeof institutions[0] }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
    >
      <Ionicons name="business" size={24} color="#9C27B0" />
      <View style={styles.resultCardContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        {item.code && (
          <Text style={styles.resultSubtitle}>Code: {item.code}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );

  const renderInspectorItem = ({ item }: { item: typeof inspectors[0] }) => (
    <TouchableOpacity
      style={styles.resultCard}
      onPress={() => handleItemPress(item)}
    >
      <Ionicons name="person" size={24} color="#9C27B0" />
      <View style={styles.resultCardContent}>
        <Text style={styles.resultTitle}>{item.name}</Text>
        <Text style={styles.resultSubtitle}>{item.district_name}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
    </TouchableOpacity>
  );

  const filteredResults = getFilteredResults();

  return (
    <View style={styles.container}>
      {/* Search Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'district' && styles.modeButtonActive]}
          onPress={() => setSearchMode('district')}
        >
          <Text
            style={[
              styles.modeButtonText,
              searchMode === 'district' && styles.modeButtonTextActive,
            ]}
          >
            District
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'institution' && styles.modeButtonActive]}
          onPress={() => setSearchMode('institution')}
        >
          <Text
            style={[
              styles.modeButtonText,
              searchMode === 'institution' && styles.modeButtonTextActive,
            ]}
          >
            Institution
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, searchMode === 'inspector' && styles.modeButtonActive]}
          onPress={() => setSearchMode('inspector')}
        >
          <Text
            style={[
              styles.modeButtonText,
              searchMode === 'inspector' && styles.modeButtonTextActive,
            ]}
          >
            Inspector
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${searchMode}...`}
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#8E8E93" />
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#9C27B0" />
        </View>
      ) : filteredResults.length > 0 ? (
        <FlatList
          data={filteredResults}
          renderItem={
            searchMode === 'district'
              ? renderDistrictItem
              : searchMode === 'institution'
              ? renderInstitutionItem
              : renderInspectorItem
          }
          keyExtractor={(item) =>
            searchMode === 'district'
              ? item.id.toString()
              : searchMode === 'institution'
              ? item.id.toString()
              : item.id
          }
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyStateText}>
            {searchQuery ? 'No results found' : `No ${searchMode}s available`}
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
  modeSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: '#F7F9FC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  modeButtonText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
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
  listContainer: {
    padding: 16,
  },
  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  resultCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
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
