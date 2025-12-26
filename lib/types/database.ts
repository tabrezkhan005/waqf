// Database types for TypeScript
export type Role = 'admin' | 'inspector' | 'accounts' | 'reports';
export type CollectionStatus = 'pending' | 'sent_to_accounts' | 'verified' | 'rejected';
export type ReceiptType = 'bill' | 'transaction';

export interface District {
  id: string; // UUID - matches new schema
  name: string;
  code: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  role: Role;
  district_id: string | null; // UUID - matches new schema
  created_at: string;
}

export interface Institution {
  id: string; // UUID - matches new schema
  name: string;
  ap_gazette_no: string; // Unique identifier
  district_id: string; // UUID - matches new schema
  mandal: string | null;
  village: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Collection {
  id: string; // UUID (if using new schema) or number (if old schema still exists)
  institution_id: string; // UUID
  inspector_id: string; // UUID
  arrear_amount: number;
  current_amount: number;
  total_amount: number;
  status: CollectionStatus;
  collection_date: string;
  challan_no: string | null;
  challan_date: string | null;
  challan_file_path: string | null;
  verified_by: string | null;
  verified_at: string | null;
  remarks: string | null;
  created_at: string;
  updated_at?: string;
}

// Accounts-specific types
export interface DistrictSummary {
  district_id: string; // UUID
  district_name: string;
  pending_count: number;
  verified_count: number;
  rejected_count: number;
  verified_amount: number;
  arrear_amount: number;
  current_amount: number;
}

export interface InspectorSummary {
  inspector_id: string;
  inspector_name: string;
  district_name: string;
  total_collections: number;
  verified_count: number;
  rejected_count: number;
  pending_count: number;
  total_arrear: number;
  total_current: number;
  verification_rate: number;
}

export interface InstitutionHistory {
  institution_id: string; // UUID
  institution_name: string;
  institution_code: string | null;
  district_name: string;
  collections: CollectionWithRelations[];
  total_arrear: number;
  total_current: number;
  verified_count: number;
  pending_count: number;
  rejected_count: number;
}

// Reports-specific types
export interface GlobalMetrics {
  total_collections: number;
  total_arrear: number;
  total_current: number;
  pending_count: number;
  verified_count: number;
  rejected_count: number;
}

export interface TimeSeriesData {
  date: string;
  arrear: number;
  current: number;
  total: number;
}

export interface StatusBreakdown {
  pending: number;
  verified: number;
  rejected: number;
  pending_amount: number;
  verified_amount: number;
  rejected_amount: number;
}

export interface DistrictMetrics extends DistrictSummary {
  total_institutions: number;
  total_inspectors: number;
  top_institutions: Array<{
    institution_id: string; // UUID
    institution_name: string;
    total_collected: number;
  }>;
  top_inspectors: Array<{
    inspector_id: string;
    inspector_name: string;
    total_collected: number;
    verification_rate: number;
  }>;
}

export interface InstitutionMetrics {
  institution_id: string; // UUID
  institution_name: string;
  institution_code: string | null;
  district_name: string;
  total_arrear: number;
  total_current: number;
  total_outstanding: number;
  collection_count: number;
  first_collection_date: string | null;
  last_collection_date: string | null;
  collections: CollectionWithRelations[];
}

export interface InspectorMetrics {
  inspector_id: string;
  inspector_name: string;
  district_name: string;
  total_arrear: number;
  total_current: number;
  collection_count: number;
  verification_rate: number;
  average_per_day: number;
  institutions_served: number;
  collections: CollectionWithRelations[];
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface LineChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    color: string;
  }>;
}

export interface BarChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    colors: string[];
  }>;
}

export interface Receipt {
  id: string; // UUID (if using new schema) or number
  collection_id: string; // UUID
  type: ReceiptType;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string; // UUID (if using new schema) or number
  user_id: string | null; // UUID
  action: string;
  table_name: string | null;
  row_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Extended types with relations
export interface CollectionWithRelations extends Collection {
  institution?: Institution;
  inspector?: Profile;
  verified_by_profile?: Profile;
  receipts?: Receipt[];
}

export interface InstitutionWithDistrict extends Institution {
  district?: District;
}

// DCB (Demand, Collection, Balance) types
export interface InstitutionDCB {
  id: string; // UUID
  institution_id: string; // UUID
  inspector_id: string; // UUID
  financial_year: string;
  extent_dry: number;
  extent_wet: number;
  extent_total: number; // Generated
  demand_arrears: number;
  demand_current: number;
  demand_total: number; // Generated
  collection_arrears: number;
  collection_current: number;
  collection_total: number; // Generated
  balance_arrears: number; // Generated
  balance_current: number; // Generated
  balance_total: number; // Generated
  remarks: string | null;
  created_at: string;
}

export interface InstitutionWithDCB extends Institution {
  district?: District;
  dcb?: InstitutionDCB;
}

// Collection input types
export interface CollectionInput {
  institution_id: string; // UUID
  c_arrear: number;
  c_current: number;
  bill_receipt?: string; // File path or URI
  transaction_receipt?: string; // File path or URI
  collection_date?: string;
}
