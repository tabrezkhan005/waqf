/**
 * Utility functions for querying district-specific DCB tables
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Convert district name to table name
 * Example: "Chittoor" -> "dcb_chittoor", "Dr. B.R. A.Konaseema" -> "dcb_dr_b_r_a_konaseema"
 */
export function districtNameToTableName(districtName: string): string {
  if (!districtName) return '';

  let name = districtName.toLowerCase().trim();
  // Replace spaces, dots, hyphens with underscores
  name = name.replace(/[\s\.\-]/g, '_');
  // Remove apostrophes
  name = name.replace(/'/g, '');
  // Remove multiple underscores (collapse to single)
  name = name.replace(/_+/g, '_');
  // Remove leading/trailing underscores
  name = name.replace(/^_+|_+$/g, '');
  return `dcb_${name}`;
}

/**
 * Get district name from district_id
 */
export async function getDistrictName(districtId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('districts')
      .select('name')
      .eq('id', districtId)
      .single();

    if (error || !data) {
      console.error('Error fetching district name:', error);
      return null;
    }

    return data.name;
  } catch (error) {
    console.error('Error fetching district name:', error);
    return null;
  }
}

/**
 * Get all district DCB table names
 */
export async function getAllDistrictTableNames(): Promise<string[]> {
  try {
    const { data: districts } = await supabase
      .from('districts')
      .select('name')
      .order('name');

    if (!districts) return [];

    return districts.map((d) => districtNameToTableName(d.name));
  } catch (error) {
    console.error('Error fetching district table names:', error);
    return [];
  }
}

/**
 * Query all district DCB tables and aggregate results
 */
export async function queryAllDistrictDCB<T = any>(
  select: string,
  options?: {
    filter?: (row: any) => boolean;
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  try {
    const tableNames = await getAllDistrictTableNames();
    const allResults: T[] = [];

    // Remove _district_name and _district_table from select string as they're added in code
    const cleanSelect = select
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '_district_name' && s !== '_district_table')
      .join(', ');

    // Fetch districts once for all tables
    const { data: districts } = await supabase
      .from('districts')
      .select('name')
      .order('name');

    // Create a map of table name to district name
    const tableToDistrictMap = new Map<string, string>();
    if (districts) {
      districts.forEach((d) => {
        const tableName = districtNameToTableName(d.name);
        tableToDistrictMap.set(tableName, d.name);
      });
    }

    // Query all district tables in parallel for faster loading
    const queryPromises = tableNames.map(async (tableName) => {
      try {
        let query = supabase.from(tableName).select(cleanSelect || '*');

        if (options?.orderBy) {
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? false,
          });
        }

        if (options?.limit) {
          query = query.limit(options.limit);
        }

        const { data, error } = await query;

        if (error) {
          console.warn(`Error querying ${tableName}:`, error);
          return [];
        }

        if (!data) return [];

        // Get district name from map, fallback to formatted table name
        const districtName = tableToDistrictMap.get(tableName) ||
          tableName.replace('dcb_', '').replace(/_/g, ' ');

        // Add district context to each row
        const rowsWithDistrict = data.map((row: any) => ({
          ...row,
          _district_table: tableName,
          _district_name: districtName,
        }));

        if (options?.filter) {
          return rowsWithDistrict.filter(options.filter);
        }
        return rowsWithDistrict;
      } catch (error) {
        console.warn(`Error querying ${tableName}:`, error);
        return [];
      }
    });

    // Wait for all queries to complete in parallel
    const results = await Promise.all(queryPromises);

    // Flatten results
    results.forEach((rows) => {
      allResults.push(...rows);
    });

    return allResults;
  } catch (error) {
    console.error('Error querying all district DCB tables:', error);
    return [];
  }
}

/**
 * Query a specific district's DCB table
 */
export async function queryDistrictDCB<T = any>(
  districtName: string,
  select: string,
  options?: {
    filter?: (row: any) => boolean;
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
): Promise<T[]> {
  try {
    const tableName = districtNameToTableName(districtName);
    let query = supabase.from(tableName).select(select);

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error(`Error querying ${tableName}:`, error);
      return [];
    }

    if (!data) return [];

    // Add district context
    const rowsWithDistrict = data.map((row: any) => ({
      ...row,
      _district_table: tableName,
      _district_name: districtName,
    }));

    if (options?.filter) {
      return rowsWithDistrict.filter(options.filter) as T[];
    }

    return rowsWithDistrict as T[];
  } catch (error) {
    console.error(`Error querying district DCB for ${districtName}:`, error);
    return [];
  }
}

/**
 * Get aggregated stats from all district DCB tables
 */
export async function getAggregatedDCBStats() {
  try {
    const allData = await queryAllDistrictDCB(
      'demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total'
    );

    const stats = {
      totalDemandArrears: 0,
      totalDemandCurrent: 0,
      totalDemand: 0,
      totalCollectionArrears: 0,
      totalCollectionCurrent: 0,
      totalCollection: 0,
      totalBalanceArrears: 0,
      totalBalanceCurrent: 0,
      totalBalance: 0,
      totalRecords: allData.length,
    };

    allData.forEach((row: any) => {
      stats.totalDemandArrears += Number(row.demand_arrears || 0);
      stats.totalDemandCurrent += Number(row.demand_current || 0);
      stats.totalDemand += Number(row.demand_total || 0);
      stats.totalCollectionArrears += Number(row.collection_arrears || 0);
      stats.totalCollectionCurrent += Number(row.collection_current || 0);
      stats.totalCollection += Number(row.collection_total || 0);
      stats.totalBalanceArrears += Number(row.balance_arrears || 0);
      stats.totalBalanceCurrent += Number(row.balance_current || 0);
      stats.totalBalance += Number(row.balance_total || 0);
    });

    return stats;
  } catch (error) {
    console.error('Error getting aggregated DCB stats:', error);
    return {
      totalDemandArrears: 0,
      totalDemandCurrent: 0,
      totalDemand: 0,
      totalCollectionArrears: 0,
      totalCollectionCurrent: 0,
      totalCollection: 0,
      totalBalanceArrears: 0,
      totalBalanceCurrent: 0,
      totalBalance: 0,
      totalRecords: 0,
    };
  }
}
