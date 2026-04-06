
export type UserRole = 'admin' | 'operations' | 'viewer';

export interface User {
  username: string;
  role: UserRole;
}

export interface ModuleBuild {
  id: number;
  manufacturer: string;
  model_name: string;
  rated_power_wp: number;
  degradation_rate_pct: number;
}

export interface Inverter {
  id: number;
  serial_number: string;
  vendor_type?: string;
  project_id?: number;
  module_build_id?: number | null;
  name?: string; // Mapped from serial_number in project view
  kwac?: number; // Mapped from capacity_kw in project view
  solisSn?: string;
  deviceSn?: string;
  psKey?: string;
  moduleCount?: number;
  capacity_kw?: number; // Backend field name
  live_data?: any;
}

export interface MonthlyData {
  month: string; // YYYY-MM format
  electricityImportedKWh: number; // Project-level as per requirement
  targetNetKWhP50: number; // Project-level P50 target, retained

  // Inverter-specific data. Each array's index corresponds to the project's inverters array.
  inverterExportKWh: number[];
  inverterTargetOMKWh: number[];
  inverterIrradiation: number[];
  inverterDcCapacityKW: number[]; // Was already inverter-specific
}

export enum BreakdownReason {
  GRID_FAILURE = 'Grid Failure',
  GRID_OVER_VOLTAGE = 'Grid Over Voltage',
  GRID_UNDER_VOLTAGE = 'Grid Under Voltage',
  TRANSMISSION_LINE = 'Transmission Line Breakdown',
  PLANT_BREAKDOWN = 'Plant Breakdown',
  OTHER = 'Other'
}

export interface BreakdownEvent {
  id?: number | string;
  inverter_id?: number;
  inverterName?: string; // Legacy/UI display
  start_date: string; // ISO DateTime
  end_date: string; // ISO DateTime
  description: string;
  loss_kwh: number;
  created_at?: string;
}

export interface Project {
  id?: number;
  name: string;
  location: string;
  projectName: string;
  projectState: string;
  capacity_kw: number;
  projectCode?: string; // Optional for legacy compatibility
  projectOwner?: string;
  dateOfCommissioning: string; // ISO String
  tariff: number; // Project-level fixed tariff
  plantId?: number; // Corresponding Plant ID from SolisCloud API
  inverters: Inverter[];
  monthlyData: Record<string, MonthlyData>; // Keyed by YYYY-MM
  breakdownEvents?: BreakdownEvent[];
}

export interface KPIResult {
  totalCapacityKWac: number;
  totalCapacityKWdc: number; // This will now be the *latest* dynamic DC capacity
  tariff: number;
  totalExport: number;
  totalImport: number;
  netEnergy: number;
  revenue: number;
  targetRevenue: number; // Based on O&M Target
  yield: number; // kWh / kW
  pr: number; // Performance Ratio %
  cuf: number; // AC CUF %
  dcCuf: number; // DC CUF %
  co2Reduction: number; // Tons
  targetP50: number;
  targetOM: number; // O&M Target
  totalDays: number;
  averageDailyYield: number; // kWh/kW/day
}

export interface InverterKPIResult extends Omit<KPIResult, 'totalImport' | 'targetP50' | 'netEnergy'> {
  totalTheoreticalEnergy: number;
}

export interface BreakdownStats {
  totalBreakdownDurationMinutes: number;
  totalGenerationLossKwh: number;
  totalGiiLoss: number;
  availabilityPercent: number;
  byReason: {
    [key: string]: {
      durationMinutes: number;
      giiLoss: number;
      generationLossKwh: number;
      count: number;
    }
  };
}

export interface MonthlyKPI {
  id: number;
  project_id: number;
  month: string;
  total_yield_kwh: number;
  pr_percentage: number | null;
  cuf_percentage: number | null;
  target_p50_kwh: number | null;
  revenue: number | null;
  irradiation_kwh_m2: number | null;
  computed_at: string;
}

export interface ProxyLiveStatus {
  vendor: string;
  device_id: string;
  power_output_kw: number;
  daily_yield_kwh: number;
  status: 'ONLINE' | 'OFFLINE' | 'ERROR' | 'UNREACHABLE';
}

export interface ProxyDayCurve {
  vendor: string;
  device_id: string;
  date: string;
  data_points: { timestamp: string, value: number }[];
}

export type TimeRange = '6M' | '12M' | 'ALL';

export interface ChartDataPoint {
  month: string;
  actualEnergy: number;
  targetEnergyP50: number;
  targetEnergyOM: number;
  theoreticalEnergy?: number; // Added for inverter chart
  revenue: number;
  targetRevenueP50: number;
  targetRevenueOM: number;
  // Growth metrics for Tooltip
  energyMom?: number;
  energyYoy?: number;
  revenueMom?: number;
  revenueYoy?: number;
  // Technical Monthly KPIs
  dcCuf?: number;
  pr?: number;
  yield?: number;
  // History for comparisons
  history?: { year: number; energy: number }[];
}
