export interface User {
  user_id: number;
  name: string;
  email: string;
  phone: string;
  role_id: number;
  role_name: string;
  status: string;
}

export interface Vehicle {
  vehicle_id: number;
  registration_number: string;
  vehicle_name: string;
  vehicle_model: string;
  vehicle_type: string;
  manufacturer: string;
  manufacture_year: number;
  maximum_load_capacity_kg: number;
  fuel_type: string;
  current_odometer: number;
  acquisition_cost: number;
  purchase_date: string;
  status: "Available" | "On Trip" | "In Shop" | "Retired";
  region: string;
  drivers?: Driver[];
}

export interface Driver {
  driver_id: number;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string;
  phone: string;
  email: string;
  joining_date: string;
  experience_years: number;
  safety_score: number;
  status: "Available" | "On Trip" | "Off Duty" | "Suspended";
  assigned_vehicle_id: number | null;
  assigned_vehicle?: Vehicle;
}

export interface Trip {
  trip_id: number;
  vehicle_id: number;
  vehicle?: Vehicle;
  driver_id: number;
  driver?: Driver;
  source_city: string;
  destination_city: string;
  start_date: string;
  end_date: string | null;
  cargo_weight: number;
  planned_distance: number;
  actual_distance: number | null;
  fuel_consumed: number | null;
  revenue: number;
  status: "Draft" | "Dispatched" | "Completed" | "Cancelled";
}

export interface MaintenanceLog {
  maintenance_id: number;
  vehicle_id: number;
  vehicle?: Vehicle;
  maintenance_type: string;
  description: string;
  start_date: string;
  completion_date: string | null;
  cost: number;
  status: "Pending" | "In Progress" | "Completed";
  service_center: string;
}

export interface FuelLog {
  fuel_log_id: number;
  vehicle_id: number;
  vehicle?: Vehicle;
  trip_id: number | null;
  trip?: Trip;
  date: string;
  fuel_station: string;
  fuel_type: string;
  liters: number;
  price_per_liter: number;
  total_cost: number;
  odometer: number;
}

export interface Expense {
  expense_id: number;
  trip_id: number | null;
  trip?: Trip;
  vehicle_id: number;
  vehicle?: Vehicle;
  expense_type: string;
  amount: number;
  expense_date: string;
  description: string;
}

export interface GlobalMetrics {
  revenue: number;
  operationalCost: number;
  fuelCost: number;
  maintenanceCost: number;
  otherCost: number;
  profit: number;
}

export interface TypeMetric {
  type: string;
  efficiency: number;
  operationalCost: number;
  revenue: number;
}

export interface VehicleMetric {
  vehicle_id: number;
  name: string;
  reg: string;
  type: string;
  distance: number;
  fuelEfficiency: number;
  fuelCost: number;
  maintenanceCost: number;
  otherCost: number;
  totalOpCost: number;
  revenue: number;
  roi: number;
}

export interface MonthlyChartPoint {
  month: string;
  cost: number;
  revenue: number;
  trips: number;
}

export interface AnalyticsReport {
  global: GlobalMetrics;
  vehicles: VehicleMetric[];
  types: TypeMetric[];
  monthlyChart: MonthlyChartPoint[];
}

export interface DashboardStats {
  activeVehicles: number;
  availableVehicles: number;
  vehiclesInMaintenance: number;
  activeTrips: number;
  pendingTrips: number;
  driversOnDuty: number;
  fleetUtilization: number;
}
