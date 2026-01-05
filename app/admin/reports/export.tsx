import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase/client';
import { queryAllDistrictDCB, queryDistrictDCB, districtNameToTableName } from '@/lib/dcb/district-tables';
import { saveAndShareTextFile, timestampForFilename } from '@/lib/export/files';
import { toCsv, toExcelHtml, type Row } from '@/lib/export/tabular';
import { exportRowsToPdf } from '@/lib/export/pdf';

type Scope = 'all' | 'district' | 'inspector' | 'institution';
type Dataset = 'collections' | 'dcb';
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

export default function ExportReportsScreen() {
  const [exporting, setExporting] = useState(false);
  const [progressText, setProgressText] = useState('');

  const nowStamp = useMemo(() => timestampForFilename(), []);

  const [dataset, setDataset] = useState<Dataset>('collections');
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
    setSelectedDistrict(null);
    setSelectedInspector(null);
    setSelectedInstitution(null);
    setInstitutionSearch('');
    setInstitutionResults([]);
  }, [scope, dataset]);

  useEffect(() => {
    if (!institutionModalOpen) return;
    const q = institutionSearch.trim();
    if (!q) {
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

  const exportDistrictPerformance = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      setProgressText('Loading DCB rows...');
      // Load DCB data from all district tables
      // OPTIMIZATION: Limit rows per table to prevent fetching all data
      const rows = await queryAllDistrictDCB('demand_total, collection_total, ap_gazette_no, _district_name', { maxRowsPerTable: 1000 });

      const map = new Map<string, { district_name: string; total_demand: number; total_collection: number; institutions: Set<string> }>();
      (rows || []).forEach((r: any) => {
        const districtName = r._district_name || 'Unknown';
        const key = districtName;
        if (!map.has(key)) {
          map.set(key, {
            district_name: districtName,
            total_demand: 0,
            total_collection: 0,
            institutions: new Set<string>(),
          });
        }
        const agg = map.get(key)!;
        agg.total_demand += Number(r.demand_total || 0);
        agg.total_collection += Number(r.collection_total || 0);
        // Use ap_gazette_no as unique identifier
        if (r.ap_gazette_no) agg.institutions.add(String(r.ap_gazette_no));
      });

      const out: Row[] = Array.from(map.values()).map((d) => ({
        district_name: d.district_name,
        institutions_count: d.institutions.size,
        total_demand: d.total_demand,
        total_collection: d.total_collection,
        collection_rate: d.total_demand ? Number(((d.total_collection / d.total_demand) * 100).toFixed(2)) : 0,
      }));

      if (out.length === 0) {
        Alert.alert('No data', 'No district performance data found.');
        return;
      }

      setProgressText('Generating file...');
      if (format === 'csv') {
        await saveAndShareTextFile({
          filename: `district_performance_${nowStamp}.csv`,
          mimeType: 'text/csv',
          contents: toCsv(out, { bom: true }),
        });
      } else {
        await saveAndShareTextFile({
          filename: `district_performance_${nowStamp}.xls`,
          mimeType: 'application/vnd.ms-excel',
          contents: toExcelHtml(out, 'District Performance'),
        });
      }
      Alert.alert('Export ready', 'Report exported successfully.');
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export failed', error?.message || 'Failed to export report.');
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  const exportCollections = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      setProgressText('Loading collections...');

      let institutionIds: string[] | null = null;
      let inspectorId: string | null = null;
      let institutionId: string | null = null;
      let filenamePrefix = 'collections';

      if (scope === 'district') {
        if (!selectedDistrict) {
          Alert.alert('Select District', 'Please choose a district.');
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
          Alert.alert('Select Inspector', 'Please choose an inspector.');
          return;
        }
        filenamePrefix = `collections_inspector_${safeSlug(selectedInspector.full_name)}`;
        inspectorId = selectedInspector.id;
      }
      if (scope === 'institution') {
        if (!selectedInstitution) {
          Alert.alert('Select Institution', 'Please search and select an institution.');
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

      const out: Row[] = (rows || []).map((c: any) => ({
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

      if (out.length === 0) {
        Alert.alert('No data', 'No collections found.');
        return;
      }

      setProgressText('Generating file...');
      if (format === 'csv') {
        await saveAndShareTextFile({
          filename: `${filenamePrefix}_${nowStamp}.csv`,
          mimeType: 'text/csv',
          contents: toCsv(out, { bom: true }),
        });
      } else {
        await saveAndShareTextFile({
          filename: `${filenamePrefix}_${nowStamp}.xls`,
          mimeType: 'application/vnd.ms-excel',
          contents: toExcelHtml(out, 'Collections'),
        });
      }
      Alert.alert('Export ready', 'Report exported successfully.');
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export failed', error?.message || 'Failed to export report.');
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  const exportDcb = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      setProgressText('Loading DCB rows...');

      let institutionIds: string[] | null = null;
      let inspectorId: string | null = null;
      let institutionId: string | null = null;
      let filenamePrefix = 'dcb';

      if (scope === 'district') {
        if (!selectedDistrict) {
          Alert.alert('Select District', 'Please choose a district.');
          return;
        }
        filenamePrefix = `dcb_district_${safeSlug(selectedDistrict.name)}`;
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
          Alert.alert('Select Inspector', 'Please choose an inspector.');
          return;
        }
        filenamePrefix = `dcb_inspector_${safeSlug(selectedInspector.full_name)}`;
        inspectorId = selectedInspector.id;
      }
      if (scope === 'institution') {
        if (!selectedInstitution) {
          Alert.alert('Select Institution', 'Please search and select an institution.');
          return;
        }
        filenamePrefix = `dcb_institution_${safeSlug(selectedInstitution.name)}`;
        institutionId = selectedInstitution.id;
      }

      // Load DCB data based on scope
      let rows: any[] = [];

      if (scope === 'all') {
        // OPTIMIZATION: Limit rows per table to prevent fetching all data
        rows = await queryAllDistrictDCB(
          'id, ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, created_at, _district_name',
          { maxRowsPerTable: 1000 }
        );
      } else if (scope === 'district' && selectedDistrict) {
        rows = await queryDistrictDCB(
          selectedDistrict.name,
          'id, ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, created_at, _district_name'
        );
      } else if (scope === 'inspector' && selectedInspector) {
        // For inspector, get their district and query that district's table
        if (!selectedInspector.district_id) {
          Alert.alert('No District', 'Inspector is not assigned to a district.');
          return;
        }
        const { data: districtData } = await supabase
          .from('districts')
          .select('name')
          .eq('id', selectedInspector.district_id)
          .single();
        if (districtData) {
          rows = await queryDistrictDCB(
            districtData.name,
            'id, ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, created_at, _district_name'
          );
        }
      } else if (scope === 'institution' && selectedInstitution) {
        // For institution, get its district and filter by ap_gazette_no
        const { data: institutionData } = await supabase
          .from('institutions')
          .select('ap_gazette_no, district:districts(name)')
          .eq('id', selectedInstitution.id)
          .single();
        if (institutionData && institutionData.district) {
          const districtName = (institutionData.district as any).name;
          const allRows = await queryDistrictDCB(
            districtName,
            'id, ap_gazette_no, institution_name, demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total, created_at, _district_name'
          );
          // Filter by ap_gazette_no
          const instApNo = institutionData.ap_gazette_no;
          rows = instApNo ? allRows.filter((r: any) => r.ap_gazette_no === instApNo) : [];
        }
      }

      // Get inspector names for districts (if needed)
      const { data: inspectorsData } = await supabase
        .from('profiles')
        .select('id, full_name, district_id')
        .eq('role', 'inspector');

      const inspectorMap = new Map<string, string>();
      (inspectorsData || []).forEach((insp: any) => {
        if (insp.district_id) {
          inspectorMap.set(insp.district_id, insp.full_name);
        }
      });

      // Get district names for mapping
      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name');
      const districtMap = new Map<string, string>();
      (districtsData || []).forEach((d: any) => {
        districtMap.set(d.id, d.name);
      });

      const out: Row[] = rows.map((r: any) => {
        const districtName = r._district_name || 'Unknown';
        // Find inspector for this district
        let inspectorName = '';
        for (const [districtId, name] of districtMap.entries()) {
          if (name === districtName) {
            inspectorName = inspectorMap.get(districtId) || '';
            break;
          }
        }

        return {
          id: r.id || r.ap_gazette_no || '',
          financial_year: '', // District tables don't have financial_year
          created_at: r.created_at ?? '',
          district_name: districtName,
          institution_name: r.institution_name ?? '',
          ap_gazette_no: r.ap_gazette_no ?? '',
          inspector_name: inspectorName,
          demand_arrears: r.demand_arrears ?? 0,
          demand_current: r.demand_current ?? 0,
          demand_total: r.demand_total ?? 0,
          collection_arrears: r.collection_arrears ?? 0,
          collection_current: r.collection_current ?? 0,
          collection_total: r.collection_total ?? 0,
          balance_arrears: r.balance_arrears ?? 0,
          balance_current: r.balance_current ?? 0,
          balance_total: r.balance_total ?? 0,
        };
      });

      if (out.length === 0) {
        Alert.alert('No data', 'No DCB rows found.');
        return;
      }

      setProgressText('Generating file...');
      if (format === 'csv') {
        await saveAndShareTextFile({
          filename: `${filenamePrefix}_${nowStamp}.csv`,
          mimeType: 'text/csv',
          contents: toCsv(out, { bom: true }),
        });
      } else {
        await saveAndShareTextFile({
          filename: `${filenamePrefix}_${nowStamp}.xls`,
          mimeType: 'application/vnd.ms-excel',
          contents: toExcelHtml(out, 'DCB'),
        });
      }

      Alert.alert('Export ready', 'Report exported successfully.');
    } catch (error: any) {
      console.error('Export error:', error);
      Alert.alert('Export failed', error?.message || 'Failed to export report.');
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  const exportCurrentSelectionAsPdf = async () => {
    setExporting(true);
    try {
      if (dataset === 'collections') {
        // Reuse existing CSV generation logic but output as PDF instead
        setProgressText('Preparing PDF...');
        // Generate rows by calling exportCollections path but capturing rows:
        // (Light duplication for clarity & reliability)
        let institutionIds: string[] | null = null;
        let inspectorId: string | null = null;
        let institutionId: string | null = null;
        let filenamePrefix = 'collections';

        if (scope === 'district') {
          if (!selectedDistrict) {
            Alert.alert('Select District', 'Please choose a district.');
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
            Alert.alert('Select Inspector', 'Please choose an inspector.');
            return;
          }
          filenamePrefix = `collections_inspector_${safeSlug(selectedInspector.full_name)}`;
          inspectorId = selectedInspector.id;
        }
        if (scope === 'institution') {
          if (!selectedInstitution) {
            Alert.alert('Select Institution', 'Please search and select an institution.');
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

        const out: Row[] = (rows || []).map((c: any) => ({
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

        if (out.length === 0) {
          Alert.alert('No data', 'No collections found.');
          return;
        }

        await exportRowsToPdf({
          filenameBase: `${filenamePrefix}_${nowStamp}`,
          title: 'Collections Report',
          rows: out,
        });
        Alert.alert('Export ready', 'PDF exported successfully.');
        return;
      }

      // DCB PDF
      setProgressText('Preparing PDF...');
      let institutionIds: string[] | null = null;
      let inspectorId: string | null = null;
      let institutionId: string | null = null;
      let filenamePrefix = 'dcb';

      if (scope === 'district') {
        if (!selectedDistrict) {
          Alert.alert('Select District', 'Please choose a district.');
          return;
        }
        filenamePrefix = `dcb_district_${safeSlug(selectedDistrict.name)}`;
        institutionIds = await resolveInstitutionIdsForDistrict(selectedDistrict.id);
        if (institutionIds.length === 0) {
          Alert.alert('No data', 'No institutions found for this district.');
          return;
        }
      }
      if (scope === 'inspector') {
        if (!selectedInspector) {
          Alert.alert('Select Inspector', 'Please choose an inspector.');
          return;
        }
        filenamePrefix = `dcb_inspector_${safeSlug(selectedInspector.full_name)}`;
        inspectorId = selectedInspector.id;
      }
      if (scope === 'institution') {
        if (!selectedInstitution) {
          Alert.alert('Select Institution', 'Please search and select an institution.');
          return;
        }
        filenamePrefix = `dcb_institution_${safeSlug(selectedInstitution.name)}`;
        institutionId = selectedInstitution.id;
      }

      // Load DCB data based on scope (same logic as CSV/Excel export)
      let rows: any[] = [];

      if (scope === 'all') {
        // OPTIMIZATION: Limit rows per table to prevent fetching all data
        rows = await queryAllDistrictDCB(
          'id, ap_gazette_no, institution_name, demand_total, collection_total, balance_total, created_at, _district_name',
          { maxRowsPerTable: 1000 }
        );
      } else if (scope === 'district' && selectedDistrict) {
        rows = await queryDistrictDCB(
          selectedDistrict.name,
          'id, ap_gazette_no, institution_name, demand_total, collection_total, balance_total, created_at, _district_name'
        );
      } else if (scope === 'inspector' && selectedInspector) {
        if (!selectedInspector.district_id) {
          Alert.alert('No District', 'Inspector is not assigned to a district.');
          return;
        }
        const { data: districtData } = await supabase
          .from('districts')
          .select('name')
          .eq('id', selectedInspector.district_id)
          .single();
        if (districtData) {
          rows = await queryDistrictDCB(
            districtData.name,
            'id, ap_gazette_no, institution_name, demand_total, collection_total, balance_total, created_at, _district_name'
          );
        }
      } else if (scope === 'institution' && selectedInstitution) {
        const { data: institutionData } = await supabase
          .from('institutions')
          .select('ap_gazette_no, district:districts(name)')
          .eq('id', selectedInstitution.id)
          .single();
        if (institutionData && institutionData.district) {
          const districtName = (institutionData.district as any).name;
          const allRows = await queryDistrictDCB(
            districtName,
            'id, ap_gazette_no, institution_name, demand_total, collection_total, balance_total, created_at, _district_name'
          );
          const instApNo = institutionData.ap_gazette_no;
          rows = instApNo ? allRows.filter((r: any) => r.ap_gazette_no === instApNo) : [];
        }
      }

      // Get inspector names
      const { data: inspectorsData } = await supabase
        .from('profiles')
        .select('id, full_name, district_id')
        .eq('role', 'inspector');

      const inspectorMap = new Map<string, string>();
      (inspectorsData || []).forEach((insp: any) => {
        if (insp.district_id) {
          inspectorMap.set(insp.district_id, insp.full_name);
        }
      });

      const { data: districtsData } = await supabase
        .from('districts')
        .select('id, name');
      const districtMap = new Map<string, string>();
      (districtsData || []).forEach((d: any) => {
        districtMap.set(d.id, d.name);
      });

      const out: Row[] = rows.map((r: any) => {
        const districtName = r._district_name || 'Unknown';
        let inspectorName = '';
        for (const [districtId, name] of districtMap.entries()) {
          if (name === districtName) {
            inspectorName = inspectorMap.get(districtId) || '';
            break;
          }
        }

        return {
          id: r.id || r.ap_gazette_no || '',
          financial_year: '',
          created_at: r.created_at ?? '',
          district_name: districtName,
          institution_name: r.institution_name ?? '',
          ap_gazette_no: r.ap_gazette_no ?? '',
          inspector_name: inspectorName,
          demand_total: r.demand_total ?? 0,
          collection_total: r.collection_total ?? 0,
          balance_total: r.balance_total ?? 0,
        };
      });

      if (out.length === 0) {
        Alert.alert('No data', 'No DCB rows found.');
        return;
      }

      await exportRowsToPdf({
        filenameBase: `${filenamePrefix}_${nowStamp}`,
        title: 'DCB Report',
        rows: out,
      });
      Alert.alert('Export ready', 'PDF exported successfully.');
    } catch (error: any) {
      console.error('PDF export error:', error);
      Alert.alert('Export failed', error?.message || 'Failed to export PDF.');
    } finally {
      setExporting(false);
      setProgressText('');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export Reports</Text>
        <Text style={styles.subtitle}>
          Generate comprehensive reports in your preferred format
        </Text>

        {!!progressText && (
          <View style={styles.progressPill}>
            <ActivityIndicator color="#0A7E43" />
            <Text style={styles.progressText}>{progressText}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Custom export</Text>

        <View style={styles.chipRow}>
          {([
            { id: 'collections', label: 'Collections' },
            { id: 'dcb', label: 'DCB' },
          ] as Array<{ id: Dataset; label: string }>).map((c) => {
            const active = dataset === c.id;
            return (
              <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setDataset(c.id)} disabled={exporting}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.chipRow}>
          {([
            { id: 'all', label: 'All' },
            { id: 'district', label: 'District' },
            { id: 'inspector', label: 'Inspector' },
            { id: 'institution', label: 'Institution' },
          ] as Array<{ id: Scope; label: string }>).map((c) => {
            const active = scope === c.id;
            return (
              <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setScope(c.id)} disabled={exporting}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {scope === 'district' && (
          <TouchableOpacity style={styles.pickerRow} onPress={() => setDistrictModalOpen(true)} disabled={exporting}>
            <Ionicons name="location-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>{selectedDistrict?.name || 'Select district'}</Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
        {scope === 'inspector' && (
          <TouchableOpacity style={styles.pickerRow} onPress={() => setInspectorModalOpen(true)} disabled={exporting}>
            <Ionicons name="person-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>{selectedInspector?.full_name || 'Select inspector'}</Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}
        {scope === 'institution' && (
          <TouchableOpacity style={styles.pickerRow} onPress={() => setInstitutionModalOpen(true)} disabled={exporting}>
            <Ionicons name="business-outline" size={18} color="#64748B" />
            <Text style={styles.pickerText} numberOfLines={1}>
              {selectedInstitution ? `${selectedInstitution.name}${selectedInstitution.ap_gazette_no ? ` (${selectedInstitution.ap_gazette_no})` : ''}` : 'Search and select institution'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#94A3B8" />
          </TouchableOpacity>
        )}

        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnCsv]}
            onPress={() => (dataset === 'collections' ? exportCollections('csv') : exportDcb('csv'))}
            disabled={exporting}
          >
            <Ionicons name="document-text-outline" size={20} color="#003D99" />
            <Text style={styles.exportBtnText}>CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, styles.exportBtnXls]}
            onPress={() => (dataset === 'collections' ? exportCollections('excel') : exportDcb('excel'))}
            disabled={exporting}
          >
            <Ionicons name="document-outline" size={20} color="#1A9D5C" />
            <Text style={styles.exportBtnText}>Excel</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.exportBtn, styles.exportBtnPdf]}
          onPress={exportCurrentSelectionAsPdf}
          disabled={exporting}
        >
          <Ionicons name="document" size={20} color="#B45309" />
          <Text style={styles.exportBtnText}>PDF</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Performance</Text>
        <TouchableOpacity style={styles.exportOption} onPress={() => exportDistrictPerformance('csv')} disabled={exporting}>
          <Ionicons name="bar-chart-outline" size={28} color="#003D99" />
          <Text style={styles.exportText}>Export District Performance (CSV)</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportOption} onPress={() => exportDistrictPerformance('excel')} disabled={exporting}>
          <Ionicons name="bar-chart" size={28} color="#1A9D5C" />
          <Text style={styles.exportText}>Export District Performance (Excel)</Text>
        </TouchableOpacity>
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
    fontSize: 24,
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
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F9FC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  exportText: {
    fontSize: 18,
    fontFamily: 'Nunito-SemiBold',
    color: '#2A2A2A',
    marginLeft: 16,
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
  exportRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  exportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  exportBtnCsv: {
    backgroundColor: '#003D9910',
    borderColor: '#003D9930',
  },
  exportBtnXls: {
    backgroundColor: '#1A9D5C10',
    borderColor: '#1A9D5C30',
  },
  exportBtnText: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: '#0F172A',
  },
  exportBtnPdf: {
    backgroundColor: '#F59E0B10',
    borderColor: '#F59E0B30',
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Nunito-Bold',
    color: '#6B7280',
    marginTop: 14,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
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
