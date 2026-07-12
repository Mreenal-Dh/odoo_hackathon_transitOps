import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  Car, 
  CheckCircle2, 
  Wrench, 
  Navigation, 
  Clock, 
  UserCheck, 
  Gauge, 
  Filter, 
  MapPin, 
  Settings, 
  AlertTriangle 
} from "lucide-react";
import { apiRequest } from "../lib/api.ts";
import { DashboardStats, Vehicle } from "../types.ts";

export default function DashboardView() {
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");

  // Fetch stats
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["dashboardStats"],
    queryFn: () => apiRequest("/api/dashboard/stats"),
    refetchInterval: 10000, // Auto-refresh metrics every 10s
  });

  // Fetch vehicles to apply filters and show matching grid
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles", vehicleTypeFilter, statusFilter, regionFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (vehicleTypeFilter !== "All") params.append("type", vehicleTypeFilter);
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (regionFilter !== "All") params.append("region", regionFilter);
      return apiRequest(`/api/vehicles?${params.toString()}`);
    },
  });

  const kpis = [
    {
      title: "Active Vehicles",
      value: statsLoading ? "..." : stats?.activeVehicles,
      icon: Car,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      desc: "Currently on delivery routes",
    },
    {
      title: "Available Vehicles",
      value: statsLoading ? "..." : stats?.availableVehicles,
      icon: CheckCircle2,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      desc: "Ready to be dispatched",
    },
    {
      title: "In Maintenance",
      value: statsLoading ? "..." : stats?.vehiclesInMaintenance,
      icon: Wrench,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      desc: "In shop for repairs/service",
    },
    {
      title: "Active Trips",
      value: statsLoading ? "..." : stats?.activeTrips,
      icon: Navigation,
      color: "bg-indigo-50 text-indigo-600 border-indigo-100",
      desc: "Dispatched & en route",
    },
    {
      title: "Pending Trips",
      value: statsLoading ? "..." : stats?.pendingTrips,
      icon: Clock,
      color: "bg-slate-50 text-slate-600 border-slate-100",
      desc: "Draft status assignments",
    },
    {
      title: "Drivers On Duty",
      value: statsLoading ? "..." : stats?.driversOnDuty,
      icon: UserCheck,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      desc: "On duty / available",
    },
  ];

  return (
    <div className="space-y-8" id="dashboard-view-root">
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <div 
              key={idx} 
              className="bg-white border border-gray-100 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all duration-200"
              id={`kpi-card-${idx}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-500 font-sans">{kpi.title}</span>
                <div className={`p-2.5 rounded-lg border ${kpi.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">{kpi.value}</h3>
                <p className="text-xs text-gray-400 mt-1">{kpi.desc}</p>
              </div>
            </div>
          );
        })}

        {/* Fleet Utilization Large Indicator */}
        <div 
          className="col-span-2 bg-slate-900 text-white rounded-xl p-5 shadow-xs flex flex-col justify-between border border-slate-850 hover:shadow-md transition-all duration-200"
          id="kpi-utilization-card"
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-medium text-slate-400">Fleet Utilization</span>
              <p className="text-xs text-slate-400 mt-1">Percentage of non-retired vehicles on trip</p>
            </div>
            <div className="p-2.5 bg-slate-800 rounded-lg border border-slate-700">
              <Gauge className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="flex items-end justify-between mt-4">
            <div>
              <h3 className="text-4xl font-extrabold text-white tracking-tight">
                {statsLoading ? "..." : `${stats?.fleetUtilization}%`}
              </h3>
            </div>
            <div className="w-1/2 bg-slate-800 rounded-full h-3 overflow-hidden border border-slate-700">
              <div 
                className="bg-emerald-400 h-full rounded-full transition-all duration-1000" 
                style={{ width: `${statsLoading ? 0 : stats?.fleetUtilization || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Live Operations Filters */}
      <div className="bg-white border border-gray-200/60 rounded-xl p-6 shadow-xs" id="dashboard-filters-container">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900 font-sans">Live Fleet Status</h2>
            <p className="text-xs text-gray-500 mt-1">Filter active vehicles and manage operational status in real-time.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/50">
            <Filter className="h-3.5 w-3.5" />
            <span>Refreshed Live</span>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Vehicle Type</label>
            <select
              value={vehicleTypeFilter}
              onChange={(e) => setVehicleTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              id="filter-vehicle-type"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Trailer">Trailers</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Vehicle Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              id="filter-vehicle-status"
            >
              <option value="All">All Statuses</option>
              <option value="Available">Available</option>
              <option value="On Trip">On Trip</option>
              <option value="In Shop">In Shop (Maintenance)</option>
              <option value="Retired">Retired</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Region Location</label>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              id="filter-vehicle-region"
            >
              <option value="All">All Regions</option>
              <option value="West">West Coast</option>
              <option value="East">East Coast</option>
              <option value="North">North Region</option>
              <option value="South">South Region</option>
            </select>
          </div>
        </div>

        {/* Live Filter Grid Results */}
        {vehiclesLoading ? (
          <div className="flex items-center justify-center py-12" id="filter-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 border border-dashed border-gray-200 rounded-lg bg-gray-50/50" id="filter-empty">
            <AlertTriangle className="h-8 w-8 text-amber-500 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">No vehicles match filters</h3>
            <p className="text-xs text-gray-500 mt-1">Try resetting or broadening your filter criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="filtered-vehicles-grid">
            {vehicles.map((v) => {
              let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
              if (v.status === "On Trip") statusColor = "bg-blue-50 text-blue-700 border-blue-200";
              if (v.status === "In Shop") statusColor = "bg-amber-50 text-amber-700 border-amber-200";
              if (v.status === "Retired") statusColor = "bg-red-50 text-red-700 border-red-200";

              return (
                <div 
                  key={v.vehicle_id} 
                  className="p-4 border border-gray-200/80 rounded-xl hover:border-gray-300 transition-all bg-white"
                  id={`vehicle-live-card-${v.vehicle_id}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-sm font-sans">{v.vehicle_name}</h4>
                      <p className="text-xs font-mono text-gray-500 mt-0.5">{v.registration_number}</p>
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                      {v.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-xs border-t border-gray-50 pt-3 text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-gray-400" />
                      <span>{v.vehicle_model}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span>{v.region} Region</span>
                    </div>
                    <div className="col-span-2 border-t border-gray-50/50 pt-2 flex justify-between text-[11px] text-gray-500 font-mono">
                      <span>Odo: {v.current_odometer.toLocaleString()} km</span>
                      <span>Cap: {v.maximum_load_capacity_kg.toLocaleString()} kg</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
