import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  ScrollView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import type { Collection, CollectionWithRelations } from '@/lib/types/database';

export default function PendingApprovalsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<CollectionWithRelations[]>([]);

  // Filters
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [inspectorFilter, setInspectorFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [inspectors, setInspectors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterCollections();
  }, [districtFilter, inspectorFilter, searchQuery, collections]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPendingCollections(),
        loadDistricts(),
        loadInspectors(),
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            code,
            district:districts (
              id,
              name
            )
          ),
          inspector:profiles!collections_inspector_id_fkey (
            id,
            full_name
          )
        `)
        .in('status', ['pending', 'sent_to_accounts'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading collections:', error);
        return;
      }

      setCollections((data as CollectionWithRelations[]) || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadDistricts = async () => {
    try {
      const { data } = await supabase
        .from('districts')
        .select('id, name')
        .order('name');

      setDistricts(data || []);
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  const loadInspectors = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'inspector')
        .order('full_name');

      setInspectors(data || []);
    } catch (error) {
      console.error('Error loading inspectors:', error);
    }
  };

  const filterCollections = () => {
    let filtered = [...collections];

    // District filter
    if (districtFilter !== 'all') {
      filtered = filtered.filter((c) => {
        const district = c.institution?.district;
        return district && district.id.toString() === districtFilter;
      });
    }

    // Inspector filter
    if (inspectorFilter !== 'all') {
      filtered = filtered.filter((c) => c.inspector_id === inspectorFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const institution = c.institution;
        return (
          institution?.name.toLowerCase().includes(query) ||
          institution?.code?.toLowerCase().includes(query)
        );
      });
    }

    setFilteredCollections(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent_to_accounts':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const totalAmount = filteredCollections.reduce(
    (sum, c) => sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0),
    0
  );

  const renderCollectionItem = ({ item }: { item: CollectionWithRelations }) => {
    const total = Number(item.arrear_amount || 0) + Number(item.current_amount || 0);

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        onPress={() => router.push(`/accounts/approvals/${item.id}`)}
      >
        <View style={styles.collectionCardLeft}>
          <Text style={styles.institutionName}>
            {item.institution?.name || `Institution #${item.institution_id}`}
          </Text>
          {item.institution?.code && (
            <Text style={styles.institutionCode}>{item.institution.code}</Text>
          )}
          <View style={styles.collectionDetails}>
            <Text style={styles.detailText}>
              {item.institution?.district?.name || 'Unknown District'}
            </Text>
            <Text style={styles.detailText}>•</Text>
            <Text style={styles.detailText}>
              {item.inspector?.full_name || 'Unknown Inspector'}
            </Text>
          </View>
          <Text style={styles.collectionDate}>{formatDate(item.collection_date)}</Text>
        </View>
        <View style={styles.collectionCardRight}>
          <Text style={styles.collectionAmount}>₹{total.toLocaleString('en-IN')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Pending Approvals</Text>
          <Text style={styles.summaryValue}>{filteredCollections.length}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Total Amount</Text>
          <Text style={styles.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by institution name or code..."
            placeholderTextColor="#8E8E93"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* District Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>District:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, districtFilter === 'all' && styles.filterChipActive]}
              onPress={() => setDistrictFilter('all')}
            >
              <Text style={[styles.filterChipText, districtFilter === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {districts.map((district) => (
              <TouchableOpacity
                key={district.id}
                style={[styles.filterChip, districtFilter === district.id.toString() && styles.filterChipActive]}
                onPress={() => setDistrictFilter(district.id.toString())}
              >
                <Text style={[styles.filterChipText, districtFilter === district.id.toString() && styles.filterChipTextActive]}>
                  {district.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Inspector Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Inspector:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, inspectorFilter === 'all' && styles.filterChipActive]}
              onPress={() => setInspectorFilter('all')}
            >
              <Text style={[styles.filterChipText, inspectorFilter === 'all' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {inspectors.map((inspector) => (
              <TouchableOpacity
                key={inspector.id}
                style={[styles.filterChip, inspectorFilter === inspector.id && styles.filterChipActive]}
                onPress={() => setInspectorFilter(inspector.id)}
              >
                <Text style={[styles.filterChipText, inspectorFilter === inspector.id && styles.filterChipTextActive]}>
                  {inspector.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Collections List */}
      {filteredCollections.length > 0 ? (
        <FlatList
          data={filteredCollections}
          renderItem={renderCollectionItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyStateText}>No pending approvals</Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
  },
  filtersContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
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
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
    borderColor: '#FF9500',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  collectionCard: {
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
  collectionCardLeft: {
    flex: 1,
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
    marginBottom: 8,
  },
  collectionDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  collectionDate: {
    fontSize: 11,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  collectionCardRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  collectionAmount: {
    fontSize: 18,
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
  },
});
