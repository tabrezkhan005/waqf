import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';

interface InstitutionRanking {
  institution_id: string; // UUID
  institution_name: string;
  institution_code: string | null;
  district_name: string;
  total_collected: number;
  pending_count: number;
  collection_count: number;
}

export default function InstitutionRankingScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [institutions, setInstitutions] = useState<InstitutionRanking[]>([]);
  const [filteredInstitutions, setFilteredInstitutions] = useState<InstitutionRanking[]>([]);
  const [districtFilter, setDistrictFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [districts, setDistricts] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterInstitutions();
  }, [districtFilter, searchQuery, institutions]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadInstitutionRankings(), loadDistricts()]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInstitutionRankings = async () => {
    try {
      const { data: institutionsData } = await supabase
        .from('institutions')
        .select(`
          id,
          name,
          code,
          district:districts (
            id,
            name
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (!institutionsData) return;

      const rankings: InstitutionRanking[] = [];

      for (const institution of institutionsData) {
        const { data: collections } = await supabase
          .from('collections')
          .select('*')
          .eq('institution_id', institution.id);

        const totalCollected = collections?.reduce(
          (sum, c) => sum + Number(c.arrear_amount || 0) + Number(c.current_amount || 0),
          0
        ) || 0;

        const pending = collections?.filter((c) =>
          ['pending', 'sent_to_accounts'].includes(c.status)
        ).length || 0;

        rankings.push({
          institution_id: institution.id,
          institution_name: institution.name,
          institution_code: institution.code,
          district_name: institution.district?.name || 'Unknown',
          total_collected: totalCollected,
          pending_count: pending,
          collection_count: collections?.length || 0,
        });
      }

      // Sort by total collected
      rankings.sort((a, b) => b.total_collected - a.total_collected);

      setInstitutions(rankings);
    } catch (error) {
      console.error('Error loading institution rankings:', error);
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

  const filterInstitutions = () => {
    let filtered = [...institutions];

    // District filter
    if (districtFilter !== 'all') {
      filtered = filtered.filter((inst) => {
        const district = districts.find((d) => d.id.toString() === districtFilter);
        return district && inst.district_name === district.name;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inst) =>
          inst.institution_name.toLowerCase().includes(query) ||
          inst.institution_code?.toLowerCase().includes(query)
      );
    }

    setFilteredInstitutions(filtered);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(2)}L`;
    }
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C27B0" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Filters */}
      <View style={styles.filtersContainer}>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.districtFilter}>
          <TouchableOpacity
            style={[styles.filterChip, districtFilter === 'all' && styles.filterChipActive]}
            onPress={() => setDistrictFilter('all')}
          >
            <Text style={[styles.filterChipText, districtFilter === 'all' && styles.filterChipTextActive]}>
              All Districts
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

      {/* Rankings List */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {filteredInstitutions.map((institution, index) => (
          <TouchableOpacity
            key={institution.institution_id}
            style={styles.rankingCard}
            onPress={() => router.push(`/reports/explore/institution?institutionId=${institution.institution_id}`)}
          >
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.rankingContent}>
              <Text style={styles.institutionName}>{institution.institution_name}</Text>
              {institution.institution_code && (
                <Text style={styles.institutionCode}>Code: {institution.institution_code}</Text>
              )}
              <Text style={styles.districtName}>{institution.district_name}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statText}>
                  Total: {formatCurrency(institution.total_collected)}
                </Text>
                <Text style={styles.statDivider}>•</Text>
                <Text style={styles.statText}>
                  Collections: {institution.collection_count}
                </Text>
                <Text style={styles.statDivider}>•</Text>
                <Text style={styles.statText}>
                  Pending: {institution.pending_count}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  districtFilter: {
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
    backgroundColor: '#9C27B0',
    borderColor: '#9C27B0',
  },
  filterChipText: {
    fontSize: 12,
    fontFamily: 'Nunito-SemiBold',
    color: '#8E8E93',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
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
  rankingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  rankBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#9C27B0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#FFFFFF',
  },
  rankingContent: {
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
    marginBottom: 4,
  },
  districtName: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  statText: {
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  statDivider: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
