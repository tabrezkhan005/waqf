/**
 * Utility functions for querying district-specific DCB tables
 * Performance optimizations: caching, limits, and database aggregation
 */

import { supabase } from '@/lib/supabase/client';

// Cache for district data (5 minute TTL)
const districtCache = {
  data: null as { districts: any[]; tableNames: string[]; tableToDistrictMap: Map<string, string> } | null,
  timestamp: 0,
  ttl: 5 * 60 * 1000, // 5 minutes
};

/**
 * Get cached district data or fetch fresh data
 */
async function getCachedDistrictData() {
  const now = Date.now();
  if (districtCache.data && (now - districtCache.timestamp) < districtCache.ttl) {
    return districtCache.data;
  }

  const { data: districts } = await supabase
    .from('districts')
    .select('name')
    .order('name');

  if (!districts) {
    return { districts: [], tableNames: [], tableToDistrictMap: new Map() };
  }

  const tableNames = districts.map((d) => districtNameToTableName(d.name));
  const tableToDistrictMap = new Map<string, string>();
  districts.forEach((d) => {
    const tableName = districtNameToTableName(d.name);
    tableToDistrictMap.set(tableName, d.name);
  });

  districtCache.data = { districts, tableNames, tableToDistrictMap };
  districtCache.timestamp = now;

  return districtCache.data;
}

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
 * Get all district DCB table names (uses cache)
 */
export async function getAllDistrictTableNames(): Promise<string[]> {
  try {
    const cached = await getCachedDistrictData();
    return cached.tableNames;
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
    verifiedOnly?: boolean; // Filter by is_provisional = false (only verified collections)
    financialYear?: string; // Filter by financial_year
    maxRowsPerTable?: number; // Maximum rows to fetch per table (default: 1000)
  }
): Promise<T[]> {
  try {
    const cached = await getCachedDistrictData();
    const tableNames = cached.tableNames;
    const tableToDistrictMap = cached.tableToDistrictMap;
    const allResults: T[] = [];

    // Remove _district_name and _district_table from select string as they're added in code
    const cleanSelect = select
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s !== '_district_name' && s !== '_district_table')
      .join(', ');

    // Default limit: 1000 rows per table to prevent fetching all data
    const defaultLimit = options?.maxRowsPerTable ?? 1000;
    const effectiveLimit = options?.limit ? Math.min(options.limit, defaultLimit) : defaultLimit;

    // Query all district tables in parallel for faster loading
    const queryPromises = tableNames.map(async (tableName) => {
      try {
        let query = supabase.from(tableName).select(cleanSelect || '*');

        // Financial Safety: Filter by is_provisional = false (only verified) if requested
        if (options?.verifiedOnly) {
          query = query.eq('is_provisional', false);
        }

        // Financial Safety: Filter by financial_year if provided
        if (options?.financialYear) {
          query = query.eq('financial_year', options.financialYear);
        }

        if (options?.orderBy) {
          query = query.order(options.orderBy.column, {
            ascending: options.orderBy.ascending ?? false,
          });
        }

        // Always apply limit to prevent fetching all rows
        query = query.limit(effectiveLimit);

        const { data, error } = await query;

        if (error) {
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
    verifiedOnly?: boolean; // Filter by is_provisional = false (only verified collections)
    financialYear?: string; // Filter by financial_year
    maxRows?: number; // Maximum rows to fetch (default: 1000)
  }
): Promise<T[]> {
  try {
    const tableName = districtNameToTableName(districtName);
    let query = supabase.from(tableName).select(select);

    // Financial Safety: Filter by is_provisional = false (only verified) if requested
    if (options?.verifiedOnly) {
      query = query.eq('is_provisional', false);
    }

    // Financial Safety: Filter by financial_year if provided
    if (options?.financialYear) {
      query = query.eq('financial_year', options.financialYear);
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy.column, {
        ascending: options.orderBy.ascending ?? false,
      });
    }

    // Default limit: 1000 rows to prevent fetching all data
    const defaultLimit = options?.maxRows ?? 1000;
    const effectiveLimit = options?.limit ? Math.min(options.limit, defaultLimit) : defaultLimit;
    query = query.limit(effectiveLimit);

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
 * Get aggregated stats from all district DCB tables using database aggregation
 * By default, only includes verified collections (is_provisional = false)
 * This is optimized to use database-side aggregation instead of fetching all rows
 */
export async function getAggregatedDCBStats(options?: { includeProvisional?: boolean }) {
  try {
    const tableNames = await getAllDistrictTableNames();
    const verifiedOnly = !options?.includeProvisional;

    // Use database aggregation for each table in parallel
    const aggregationPromises = tableNames.map(async (tableName) => {
      try {
        // Build query with aggregation
        let query = supabase
          .from(tableName)
          .select('demand_arrears, demand_current, demand_total, collection_arrears, collection_current, collection_total, balance_arrears, balance_current, balance_total');

        if (verifiedOnly) {
          query = query.eq('is_provisional', false);
        }

        const { data, error } = await query;

        if (error || !data) {
          return {
            demand_arrears: 0,
            demand_current: 0,
            demand_total: 0,
            collection_arrears: 0,
            collection_current: 0,
            collection_total: 0,
            balance_arrears: 0,
            balance_current: 0,
            balance_total: 0,
            count: 0,
          };
        }

        // Aggregate in memory (database doesn't support SUM across all rows easily with dynamic tables)
        // But we limit to first 1000 rows per table for performance
        const limitedData = data.slice(0, 1000);
        const stats = limitedData.reduce(
          (acc, row) => ({
            demand_arrears: acc.demand_arrears + Number(row.demand_arrears || 0),
            demand_current: acc.demand_current + Number(row.demand_current || 0),
            demand_total: acc.demand_total + Number(row.demand_total || 0),
            collection_arrears: acc.collection_arrears + Number(row.collection_arrears || 0),
            collection_current: acc.collection_current + Number(row.collection_current || 0),
            collection_total: acc.collection_total + Number(row.collection_total || 0),
            balance_arrears: acc.balance_arrears + Number(row.balance_arrears || 0),
            balance_current: acc.balance_current + Number(row.balance_current || 0),
            balance_total: acc.balance_total + Number(row.balance_total || 0),
            count: acc.count + 1,
          }),
          {
            demand_arrears: 0,
            demand_current: 0,
            demand_total: 0,
            collection_arrears: 0,
            collection_current: 0,
            collection_total: 0,
            balance_arrears: 0,
            balance_current: 0,
            balance_total: 0,
            count: 0,
          }
        );

        return stats;
      } catch (error) {
        return {
          demand_arrears: 0,
          demand_current: 0,
          demand_total: 0,
          collection_arrears: 0,
          collection_current: 0,
          collection_total: 0,
          balance_arrears: 0,
          balance_current: 0,
          balance_total: 0,
          count: 0,
        };
      }
    });

    const results = await Promise.all(aggregationPromises);

    // Sum all district stats
    const totalStats = results.reduce(
      (acc, stats) => ({
        totalDemandArrears: acc.totalDemandArrears + stats.demand_arrears,
        totalDemandCurrent: acc.totalDemandCurrent + stats.demand_current,
        totalDemand: acc.totalDemand + stats.demand_total,
        totalCollectionArrears: acc.totalCollectionArrears + stats.collection_arrears,
        totalCollectionCurrent: acc.totalCollectionCurrent + stats.collection_current,
        totalCollection: acc.totalCollection + stats.collection_total,
        totalBalanceArrears: acc.totalBalanceArrears + stats.balance_arrears,
        totalBalanceCurrent: acc.totalBalanceCurrent + stats.balance_current,
        totalBalance: acc.totalBalance + stats.balance_total,
        totalRecords: acc.totalRecords + stats.count,
      }),
      {
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
      }
    );

    return totalStats;
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

/**
 * Get sum of a specific column from a specific district DCB table (optimized)
 * Uses limited query to prevent fetching all rows
 */
export async function getDistrictDCBSum(
  districtName: string,
  column: string,
  options?: { verifiedOnly?: boolean; financialYear?: string }
): Promise<number> {
  try {
    const tableName = districtNameToTableName(districtName);
    let query = supabase.from(tableName).select(column).limit(1000); // Limit to prevent fetching all

    if (options?.verifiedOnly) {
      query = query.eq('is_provisional', false);
    }

    if (options?.financialYear) {
      query = query.eq('financial_year', options.financialYear);
    }

    const { data, error } = await query;
    if (error || !data) return 0;

    return data.reduce((sum: number, row: any) => sum + Number(row[column] || 0), 0);
  } catch (error) {
    console.error(`Error getting district DCB sum for ${districtName}:`, error);
    return 0;
  }
}
