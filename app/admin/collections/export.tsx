import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { saveAndShareTextFile, timestampForFilename } from '@/lib/export/files';
import { toCsv, toExcelHtml, type Row } from '@/lib/export/tabular';
import { exportRowsToPdf } from '@/lib/export/pdf';

type Scope = 'all' | 'district' | 'inspector' | 'institution';
type Option = { id: string; name: string };
type InspectorOption = { id: string; full_name: string; district_id: string | null };
type InstitutionOption = { id: string; name: string; ap_gazette_no: string | null; district_id: string };

function safeSlug(s: string) {
  return String(s || '')
    .trim()
    .replaceAll(/\s+/g, '_')
    .replaceAll(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, 60);
}

export default function ExportCollectionsScreen() {
  const [exporting, setExporting] = useState(false);
  const [progressText, setProgressText] = useState<string>('');

  const nowStamp = useMemo(() => timestampForFilename(), []);

  const [scope, setScope] = useState<Scope>('all');
  const [districts, setDistricts] = useState<Option[]>([]);
  const [inspectors, setInspectors] = useState<InspectorOption[]>([]);

  const [selectedDistrict, setSelectedDistrict] = useState<Option | null>(null);
  const [selectedInspector, setSelectedInspector] = useState<InspectorOption | null>(null);
  const [selectedInstitution, setSelectedInstitution] = useState<InstitutionOption | null>(null);

  const [districtModalOpen, setDistrictModalOpen] = useState(false);
  const [inspectorModalOpen, setInspectorModalOpen] = useState(false);
  const [institutionModalOpen, setInstitutionModalOpen] = useState(false);

  const [institutionSearch, setInstitutionSearch] = useState('');
  const [institutionResults, setInstitutionResults] = useState<InstitutionOption[]>([]);
  const [institutionSearching, setInstitutionSearching] = useState(false);

  useEffect(() => {
    // load dropdown data once
    (async () => {
      const [{ data: distData }, { data: inspData }] = await Promise.all([
        supabase.from('districts').select('id, name').order('name'),
        supabase.from('profiles').select('id, full_name, district_id').eq('role', 'inspector').order('full_name'),
      ]);

      setDistricts((distData || []).map((d: any) => ({ id: String(d.id), name: d.name })));
      setInspectors((inspData || []).map((i: any) => ({ id: String(i.id), full_name: i.full_name, district_id: i.district_id })));
    })();
  }, []);

  useEffect(() => {
    // reset selections when scope changes
    setSelectedDistrict(null);
    setSelectedInspector(null);
    setSelectedInstitution(null);
    setInstitutionSearch('');
    setInstitutionResults([]);
  }, [scope]);

  useEffect(() => {
    if (!institutionModalOpen) return;

    const q = institutionSearch.trim();
    if (q.length === 0) {
      setInstitutionResults([]);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setInstitutionSearching(true);
        const like = `*${q.replaceAll('%', '').replaceAll(',', '').trim()}*`;
        const { data, error } = await supabase
          .from('institutions')
          .select('id, name, ap_gazette_no, district_id')
          .or(`name.ilike.${like},ap_gazette_no.ilike.${like}`)
          .order('name')
          .limit(50);

        if (error) throw error;
        if (!cancelled) {
          setInstitutionResults(
            (data || []).map((r: any) => ({
              id: String(r.id),
              name: r.name,
              ap_gazette_no: r.ap_gazette_no ?? null,
              district_id: String(r.district_id),
            }))
          );
        }
      } catch (e) {
        if (!cancelled) setInstitutionResults([]);
      } finally {
        if (!cancelled) setInstitutionSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [institutionModalOpen, institutionSearch]);

  const fetchAll = async <T,>(
    queryFactory: (from: number, to: number) => Promise<{ data: T[] | null; error: any }>
  ): Promise<T[]> => {
    const pageSize = 1000;
    const maxRows = 50000;
    let from = 0;
    const out: T[] = [];

    while (from < maxRows) {
      const to = from + pageSize - 1;
      setProgressText(`Fetching rows ${from + 1} - ${to + 1}...`);
      const { data, error } = await queryFactory(from, to);
      if (error) throw error;
      const rows = data || [];
      out.push(...rows);
      if (rows.length < pageSize) break;
      from += pageSize;
    }

    return out;
  };

  const buildRows = (data: any[]): Row[] => {
    return (data || []).map((c: any) => ({
      id: c.id,
      status: c.status,
      total_amount: c.total_amount ?? '',
      arrear_amount: c.arrear_amount ?? '',
      current_amount: c.current_amount ?? '',
      collection_date: c.collection_date ?? '',
      verified_at: c.verified_at ?? '',
      rejection_reason: c.rejection_reason ?? '',
      created_at: c.created_at ?? '',
      updated_at: c.updated_at ?? '',
      institution_name: c.institution?.name ?? '',
      ap_gazette_no: c.institution?.ap_gazette_no ?? '',
      district_name: c.institution?.district?.name ?? '',
      inspector_name: c.inspector?.full_name ?? '',
    }));
  };

  const resolveInstitutionIdsForDistrict = async (districtId: string) => {
    setProgressText('Loading institutions for district...');
    const { data, error } = await supabase
      .from('institutions')
      .select('id')
      .eq('district_id', districtId)
      .eq('is_active', true)
      .limit(10000);
    if (error) throw error;
    return (data || []).map((r: any) => String(r.id)).filter(Boolean);
  };

  const handleExport = async (format: 'csv' | 'excel') => {
    try {
      setExporting(true);
      setProgressText('Preparing export...');

      let institutionIds: string[] | null = null;
      let inspectorId: string | null = null;
      let institutionId: string | null = null;
      let filenamePrefix = 'collections';

      if (scope === 'district') {
        if (!selectedDistrict) {
          Alert.alert('Select District', 'Please choose a district to export.');
          return;
        }
        filenamePrefix = `collections_district_${safeSlug(selectedDistrict.name)}`;
        institutionIds = await resolveInstitutionIdsForDistrict(selectedDistrict.id);
        if (institutionIds.length === 0) {
          Alert.alert('No data', 'No institutions found for this district.');
          return;
        }
        if (institutionIds.length > 5000) {
          Alert.alert('Too many institutions', 'This district is too large to export in one file. Please export by inspector or institution.');
          return;
        }
      }

      if (scope === 'inspector') {
        if (!selectedInspector) {
          Alert.alert('Select Inspector', 'Please choose an inspector to export.');
          return;
        }
        filenamePrefix = `collections_inspector_${safeSlug(selectedInspector.full_name)}`;
        inspectorId = selectedInspector.id;
      }

      if (scope === 'institution') {
        if (!selectedInstitution) {
          Alert.alert('Select Institution', 'Please search and select an institution to export.');
          return;
        }
        filenamePrefix = `collections_institution_${safeSlug(selectedInstitution.name)}`;
        institutionId = selectedInstitution.id;
      }

      const rows = await fetchAll<any>((from, to) =>
        (() => {
          let q = supabase
            .from('collections')
            .select(
              `
              id,
              status,
              total_amount,
              arrear_amount,
              current_amount,
              collection_date,
              verified_at,
              rejection_reason,
              created_at,
              updated_at,
              institution:institutions (
                id,
                name,
                ap_gazette_no,
                district:districts (
                  id,
                  name
                )
              ),
              inspector:profiles!collections_inspector_id_fkey (
                id,
                full_name
              )
            `
            )
            .order('created_at', { ascending: false });

          if (inspectorId) q = q.eq('inspector_id', inspectorId);
          if (institutionId) q = q.eq('institution_id', institutionId);
          if (institutionIds) q = q.in('institution_id', institutionIds);
          return q.range(from, to);
        })()
      );

      const exportRows = buildRows(rows);
      if (exportRows.length === 0) {
        Alert.alert('No data', 'No collections found to export.');
        return;
      }

      setProgressText('Generating file...');

      if (format === 'csv') {
        const csv = toCsv(exportRows, { bom: true });
        const filename = `${filenamePrefix}_${nowStamp}.csv`;
        await saveAndShareTextFile({
          filename,
          mimeType: 'text/csv',
          contents: csv,
        });
        Alert.alert('Export ready', 'CSV exported successfully.');
        return;
      }

      // Excel-compatible .xls (HTML table)
      const xls = toExcelHtml(exportRows, 'Collections');
      const filename = `${filenamePrefix}_${nowStamp}.xls`;
      await saveAndShareTextFile({
        filename,
        mimeType: 'application/vnd.ms-excel',
        contents: xls,
      });
      Alert.alert('Export ready', 'Excel exported successfully.');
    } catch (error) {
      console.error('Export error:', error);
      setExporting(false);
      setProgressText('');
      Alert.alert('Error', 'Failed to export data');
      return;
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export Collections</Text>
        <Text style={styles.subtitle}>
          Generate and download collection reports in your preferred format
        </Text>

        <Text style={styles.sectionTitle}>Export scope</Text>
        <View style={styles.chipRow}>
          {(
            [
              { id: 'all', label: 'All' },
              { id: 'district', label: 'District' },
              { id: 'inspector', label: 'Inspector' },
              { id: 'institution', label: 'Institution' },
            ] as Array<{ id: Scope; label: string }>
          ).map((c) => {
            const active = scope === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setScope(c.id)}
                activeOpacity={0.85}
                disabled={exporting}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {scope === 'district' && (
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setDistrictModalOpen(true)}
            activeOpacity={0.85}
            disabled={exporting}
          >
            <Ionicons name="location-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedDistrict?.name || 'Select district'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {scope === 'inspector' && (
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setInspectorModalOpen(true)}
            activeOpacity={0.85}
            disabled={exporting}
          >
            <Ionicons name="person-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedInspector?.full_name || 'Select inspector'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {scope === 'institution' && (
          <TouchableOpacity
            style={styles.pickerRow}
            onPress={() => setInstitutionModalOpen(true)}
            activeOpacity={0.85}
            disabled={exporting}
          >
            <Ionicons name="business-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedInstitution ? `${selectedInstitution.name}${selectedInstitution.ap_gazette_no ? ` (${selectedInstitution.ap_gazette_no})` : ''}` : 'Search and select institution'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        {!!progressText && (
          <View style={styles.progressPill}>
            <ActivityIndicator color="#0A7E43" />
            <Text style={styles.progressText}>{progressText}</Text>
          </View>
        )}

        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.exportOption}
            onPress={() => handleExport('csv')}
            disabled={exporting}
          >
            <View style={[styles.exportIcon, { backgroundColor: '#003D9915' }]}>
              <Ionicons name="document-text-outline" size={32} color="#003D99" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export as CSV</Text>
              <Text style={styles.exportDescription}>
                Download collections data as CSV file
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator color="#003D99" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#003D99" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportOption}
            onPress={() => handleExport('excel')}
            disabled={exporting}
          >
            <View style={[styles.exportIcon, { backgroundColor: '#1A9D5C15' }]}>
              <Ionicons name="document-outline" size={32} color="#1A9D5C" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export as Excel</Text>
              <Text style={styles.exportDescription}>
                Download collections data as Excel file
              </Text>
            </View>
            {exporting ? (
              <ActivityIndicator color="#1A9D5C" />
            ) : (
              <Ionicons name="download-outline" size={24} color="#1A9D5C" />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.exportOption}
            onPress={async () => {
              try {
                setExporting(true);
                setProgressText('Preparing PDF...');
                // Reuse the same export data as CSV/Excel
                // Generate rows with current scope filters
                let institutionIds: string[] | null = null;
                let inspectorId: string | null = null;
                let institutionId: string | null = null;
                let filenamePrefix = 'collections';

                if (scope === 'district') {
                  if (!selectedDistrict) {
                    Alert.alert('Select District', 'Please choose a district to export.');
                    return;
                  }
                  filenamePrefix = `collections_district_${safeSlug(selectedDistrict.name)}`;
                  institutionIds = await resolveInstitutionIdsForDistrict(selectedDistrict.id);
                  if (institutionIds.length === 0) {
                    Alert.alert('No data', 'No institutions found for this district.');
                    return;
                  }
                }
                if (scope === 'inspector') {
                  if (!selectedInspector) {
                    Alert.alert('Select Inspector', 'Please choose an inspector to export.');
                    return;
                  }
                  filenamePrefix = `collections_inspector_${safeSlug(selectedInspector.full_name)}`;
                  inspectorId = selectedInspector.id;
                }
                if (scope === 'institution') {
                  if (!selectedInstitution) {
                    Alert.alert('Select Institution', 'Please search and select an institution to export.');
                    return;
                  }
                  filenamePrefix = `collections_institution_${safeSlug(selectedInstitution.name)}`;
                  institutionId = selectedInstitution.id;
                }

                const rows = await fetchAll<any>((from, to) =>
                  (() => {
                    let q = supabase
                      .from('collections')
                      .select(
                        `
                        id,
                        status,
                        total_amount,
                        arrear_amount,
                        current_amount,
                        collection_date,
                        verified_at,
                        rejection_reason,
                        created_at,
                        updated_at,
                        institution:institutions (
                          id,
                          name,
                          ap_gazette_no,
                          district:districts (
                            id,
                            name
                          )
                        ),
                        inspector:profiles!collections_inspector_id_fkey (
                          id,
                          full_name
                        )
                      `
                      )
                      .order('created_at', { ascending: false });
                    if (inspectorId) q = q.eq('inspector_id', inspectorId);
                    if (institutionId) q = q.eq('institution_id', institutionId);
                    if (institutionIds) q = q.in('institution_id', institutionIds);
                    return q.range(from, to);
                  })()
                );

                const exportRows = buildRows(rows);
                if (exportRows.length === 0) {
                  Alert.alert('No data', 'No collections found to export.');
                  return;
                }

                await exportRowsToPdf({
                  filenameBase: `${filenamePrefix}_${nowStamp}`,
                  title: 'Collections Report',
                  rows: exportRows,
                });

                Alert.alert('Export ready', 'PDF exported successfully.');
              } catch (error: any) {
                console.error('PDF export error:', error);
                Alert.alert('Export failed', error?.message || 'Failed to export PDF.');
              } finally {
                setExporting(false);
                setProgressText('');
              }
            }}
            disabled={exporting}
          >
            <View style={[styles.exportIcon, { backgroundColor: '#F59E0B15' }]}>
              <Ionicons name="document" size={32} color="#F59E0B" />
            </View>
            <View style={styles.exportContent}>
              <Text style={styles.exportTitle}>Export as PDF</Text>
              <Text style={styles.exportDescription}>Download collections report as PDF</Text>
            </View>
            {exporting ? <ActivityIndicator color="#F59E0B" /> : <Ionicons name="download-outline" size={24} color="#F59E0B" />}
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#003D99" />
          <Text style={styles.infoText}>
            Exports will include all collections based on your current filters. Large exports may take a few moments to generate.
          </Text>
        </View>
      </View>

      {/* District modal */}
      <Modal visible={districtModalOpen} transparent animationType="fade" onRequestClose={() => setDistrictModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setDistrictModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select district</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDistrictModalOpen(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={districts}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setSelectedDistrict(item);
                  setDistrictModalOpen(false);
                }}
              >
                <Text style={styles.modalRowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Inspector modal */}
      <Modal visible={inspectorModalOpen} transparent animationType="fade" onRequestClose={() => setInspectorModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInspectorModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select inspector</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setInspectorModalOpen(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={inspectors}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setSelectedInspector(item);
                  setInspectorModalOpen(false);
                }}
              >
                <Text style={styles.modalRowText}>{item.full_name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Institution modal */}
      <Modal visible={institutionModalOpen} transparent animationType="fade" onRequestClose={() => setInstitutionModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setInstitutionModalOpen(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Search institution</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setInstitutionModalOpen(false)}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color="#64748B" />
            <TextInput
              value={institutionSearch}
              onChangeText={setInstitutionSearch}
              placeholder="Type institution name or AP gazette no..."
              placeholderTextColor="#94A3B8"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {institutionSearching ? <ActivityIndicator /> : null}
          </View>

          <FlatList
            data={institutionResults}
            keyExtractor={(i) => i.id}
            ListEmptyComponent={
              <View style={{ paddingVertical: 12 }}>
                <Text style={{ color: '#64748B', fontFamily: 'Nunito-Regular' }}>
                  {institutionSearch.trim() ? 'No matches found.' : 'Start typing to search.'}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.modalRow}
                onPress={() => {
                  setSelectedInstitution(item);
                  setInstitutionModalOpen(false);
                }}
              >
                <Text style={styles.modalRowText} numberOfLines={1}>
                  {item.name}
                </Text>
                {!!item.ap_gazette_no && <Text style={styles.modalRowSub}>{item.ap_gazette_no}</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
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
  title: {
    fontSize: 28,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: 'Nunito-Bold',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#F7F9FC',
  },
  chipActive: {
    borderColor: '#0A7E43',
    backgroundColor: '#0A7E4312',
  },
  chipText: {
    fontSize: 13,
    fontFamily: 'Nunito-SemiBold',
    color: '#334155',
  },
  chipTextActive: {
    color: '#0A7E43',
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
    marginBottom: 14,
  },
  pickerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#0F172A',
  },
  optionsSection: {
    marginBottom: 24,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 14,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  exportIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  exportContent: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 18,
    fontFamily: 'Nunito-Bold',
    color: '#2A2A2A',
    marginBottom: 4,
  },
  exportDescription: {
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#8E8E93',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#003D9915',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#003D9930',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#2A2A2A',
    marginLeft: 12,
    lineHeight: 20,
  },
  progressPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A7E4310',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#0A7E4325',
    marginBottom: 14,
    gap: 10,
  },
  progressText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Nunito-Regular',
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalSheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '15%',
    bottom: '15%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    padding: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: 'Nunito-Bold',
    color: '#0F172A',
  },
  modalClose: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
  },
  modalRowText: {
    fontSize: 14,
    fontFamily: 'Nunito-SemiBold',
    color: '#0F172A',
  },
  modalRowSub: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'Nunito-Regular',
    color: '#64748B',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Nunito-Regular',
    color: '#0F172A',
    paddingVertical: 6,
  },
});
