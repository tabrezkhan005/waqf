import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import type { Collection, CollectionWithRelations } from '@/lib/types/database';

export default function CollectionsListScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<CollectionWithRelations[]>([]);
  const [filteredCollections, setFilteredCollections] = useState<CollectionWithRelations[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    loadCollections();
  }, [profile]);

  useEffect(() => {
    filterCollections();
  }, [searchQuery, statusFilter, collections]);

  const loadCollections = async () => {
    if (!profile) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('collections')
        .select(`
          *,
          institution:institutions (
            id,
            name,
            code
          )
        `)
        .eq('inspector_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading collections:', error);
        return;
      }

      setCollections((data as CollectionWithRelations[]) || []);
    } catch (error) {
      console.error('Error loading collections:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCollections = () => {
    let filtered = [...collections];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((collection) => {
        const institution = collection.institution;
        return (
          institution?.name.toLowerCase().includes(query) ||
          institution?.code?.toLowerCase().includes(query)
        );
      });
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((collection) => collection.status === statusFilter);
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
      case 'verified':
        return '#1A9D5C';
      case 'rejected':
        return '#FF3B30';
      case 'sent_to_accounts':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const renderCollectionItem = ({ item }: { item: CollectionWithRelations }) => {
    const totalAmount = Number(item.arrear_amount || 0) + Number(item.current_amount || 0);

    return (
      <TouchableOpacity
        style={styles.collectionCard}
        onPress={() => router.push(`/inspector/collections/${item.id}`)}
      >
        <View style={styles.collectionCardLeft}>
          <Text style={styles.institutionName}>
            {item.institution?.name || `Institution #${item.institution_id}`}
          </Text>
          {item.institution?.code && (
            <Text style={styles.institutionCode}>{item.institution.code}</Text>
          )}
          <View style={styles.collectionDetails}>
            <Text style={styles.collectionDate}>{formatDate(item.collection_date)}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.collectionCardRight}>
          <Text style={styles.collectionAmount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1A9D5C" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by institution name..."
          placeholderTextColor="#8E8E93"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {['all', 'pending', 'sent_to_accounts', 'verified', 'rejected'].map((status) => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterButton,
              statusFilter === status && styles.filterButtonActive,
            ]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.filterButtonText,
                statusFilter === status && styles.filterButtonTextActive,
              ]}
            >
              {status.replace('_', ' ').toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
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
          <Ionicons name="receipt-outline" size={64} color="#8E8E93" />
          <Text style={styles.emptyStateText}>No collections found</Text>
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
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F7F9FC',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  filterButtonActive: {
    backgroundColor: '#1A9D5C',
    borderColor: '#1A9D5C',
  },
  filterButtonText: {
    fontSize: 12,
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
  },
  collectionDate: {
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
  collectionCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collectionAmount: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#1A9D5C',
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

























