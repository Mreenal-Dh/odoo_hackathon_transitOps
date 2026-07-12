import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  Car, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  MapPin, 
  AlertCircle, 
  Wrench, 
  X, 
  CheckCircle,
  Truck,
  DollarSign
} from "lucide-react";
import { apiRequest, getUserData } from "../lib/api.ts";
import { Vehicle } from "../types.ts";

export default function VehiclesView() {
  const queryClient = useQueryClient();
  const user = getUserData();
  const isFleetManager = user?.role_id === 1;

  // Search & filter states
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields state
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleType, setVehicleType] = useState("Van");
  const [manufacturer, setManufacturer] = useState("");
  const [manufactureYear, setManufactureYear] = useState(new Date().getFullYear().toString());
  const [maximumLoadCapacityKg, setMaximumLoadCapacityKg] = useState("");
  const [fuelType, setFuelType] = useState("Diesel");
  const [currentOdometer, setCurrentOdometer] = useState("");
  const [acquisitionCost, setAcquisitionCost] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [status, setStatus] = useState("Available");
  const [region, setRegion] = useState("West");

  // Query: Vehicles
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest("/api/vehicles"),
  });

  // Mutation: Create Vehicle
  const createMutation = useMutation({
    mutationFn: (newVehicle: any) => apiRequest("/api/vehicles", {
      method: "POST",
      body: JSON.stringify(newVehicle),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to register vehicle.");
    }
  });

  // Mutation: Update Vehicle
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/vehicles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to update vehicle.");
    }
  });

  // Mutation: Delete Vehicle
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/vehicles/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete vehicle. It may be referenced in historical logs.");
    }
  });

  const openCreateModal = () => {
    setEditingVehicle(null);
    setRegistrationNumber("");
    setVehicleName("");
    setVehicleModel("");
    setVehicleType("Van");
    setManufacturer("");
    setManufactureYear(new Date().getFullYear().toString());
    setMaximumLoadCapacityKg("");
    setFuelType("Diesel");
    setCurrentOdometer("");
    setAcquisitionCost("");
    setPurchaseDate(new Date().toISOString().split("T")[0]);
    setStatus("Available");
    setRegion("West");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setRegistrationNumber(vehicle.registration_number);
    setVehicleName(vehicle.vehicle_name);
    setVehicleModel(vehicle.vehicle_model);
    setVehicleType(vehicle.vehicle_type);
    setManufacturer(vehicle.manufacturer);
    setManufactureYear(vehicle.manufacture_year.toString());
    setMaximumLoadCapacityKg(vehicle.maximum_load_capacity_kg.toString());
    setFuelType(vehicle.fuel_type);
    setCurrentOdometer(vehicle.current_odometer.toString());
    setAcquisitionCost(vehicle.acquisition_cost.toString());
    setPurchaseDate(vehicle.purchase_date);
    setStatus(vehicle.status);
    setRegion(vehicle.region);
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingVehicle(null);
    setFormError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const vehicleData = {
      registration_number: registrationNumber,
      vehicle_name: vehicleName,
      vehicle_model: vehicleModel,
      vehicle_type: vehicleType,
      manufacturer: manufacturer || "Unknown",
      manufacture_year: parseInt(manufactureYear),
      maximum_load_capacity_kg: parseFloat(maximumLoadCapacityKg),
      fuel_type: fuelType,
      current_odometer: parseFloat(currentOdometer),
      acquisition_cost: parseFloat(acquisitionCost) || 0.0,
      purchase_date: purchaseDate,
      status,
      region,
    };

    if (editingVehicle) {
      updateMutation.mutate({ id: editingVehicle.vehicle_id, data: vehicleData });
    } else {
      createMutation.mutate(vehicleData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete vehicle ${name}? This action is permanent.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filter vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch = 
      v.vehicle_name.toLowerCase().includes(search.toLowerCase()) ||
      v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
      v.vehicle_model.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === "All" || v.vehicle_type === typeFilter;
    const matchesRegion = regionFilter === "All" || v.region === regionFilter;

    return matchesSearch && matchesType && matchesRegion;
  });

  return (
    <div className="space-y-6" id="vehicles-view-root">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Vehicle Registry</h2>
          <p className="text-xs text-gray-500 mt-1">Manage master inventory of assets, specifications, and live conditions.</p>
        </div>
        {isFleetManager && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all"
            id="btn-register-vehicle"
          >
            <Plus className="h-4 w-4" />
            <span>Register Vehicle</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center gap-4" id="vehicles-search-container">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by registration, name, model..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all"
            id="search-vehicles-input"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex-1 md:flex-initial">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full md:w-40 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg focus:outline-none"
              id="filter-vehicles-type"
            >
              <option value="All">All Types</option>
              <option value="Truck">Trucks</option>
              <option value="Van">Vans</option>
              <option value="Trailer">Trailers</option>
            </select>
          </div>

          <div className="flex-1 md:flex-initial">
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="w-full md:w-40 px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg focus:outline-none"
              id="filter-vehicles-region"
            >
              <option value="All">All Regions</option>
              <option value="West">West</option>
              <option value="East">East</option>
              <option value="North">North</option>
              <option value="South">South</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20" id="vehicles-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      ) : filteredVehicles.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="vehicles-empty">
          <Car className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No vehicles registered</h3>
          <p className="text-xs text-gray-500 mt-1">Register a delivery vehicle to begin logging operations.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-xs overflow-hidden" id="vehicles-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="vehicles-table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Vehicle Details</th>
                  <th className="px-6 py-4">Specs & Type</th>
                  <th className="px-6 py-4">Location / Region</th>
                  <th className="px-6 py-4">Odometer</th>
                  <th className="px-6 py-4">Purchase Detail</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredVehicles.map((v) => {
                  let statusStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (v.status === "On Trip") statusStyle = "bg-blue-50 text-blue-700 border-blue-200";
                  if (v.status === "In Shop") statusStyle = "bg-amber-50 text-amber-700 border-amber-200";
                  if (v.status === "Retired") statusStyle = "bg-red-50 text-red-700 border-red-200";

                  return (
                    <tr key={v.vehicle_id} className="hover:bg-gray-50/50 transition-colors" id={`vehicle-row-${v.vehicle_id}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                            {v.vehicle_type === "Truck" ? <Truck className="h-4 w-4" /> : <Car className="h-4 w-4" />}
                          </div>
                          <div>
                            <span className="font-semibold text-gray-900 block">{v.vehicle_name}</span>
                            <span className="font-mono text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mt-0.5 inline-block">{v.registration_number}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="block font-medium">{v.vehicle_model}</span>
                        <span className="text-gray-400 text-[10px] mt-0.5 block">{v.vehicle_type} • {v.manufacturer}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{v.region}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 block">{v.current_odometer.toLocaleString()} km</span>
                        <span className="text-gray-400 text-[10px] block">Max Cap: {v.maximum_load_capacity_kg.toLocaleString()} kg</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-600 block">${v.acquisition_cost.toLocaleString()}</span>
                        <span className="text-gray-400 text-[10px] block">{v.purchase_date}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusStyle}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isFleetManager ? (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(v)}
                                className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                                title="Edit specs"
                                id={`edit-vehicle-btn-${v.vehicle_id}`}
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(v.vehicle_id, v.vehicle_name)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                                title="Delete vehicle"
                                id={`delete-vehicle-btn-${v.vehicle_id}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[10px] font-medium text-gray-400 italic">No access</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="vehicle-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-slide-up">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">
                {editingVehicle ? "Modify Asset Specs" : "Register Logistics Asset"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto" id="vehicle-register-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Reg Plate #</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TX-VAN-09"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vehicle Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. South Courier Van"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Model / Trim</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sprinter 3500"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Vehicle Type</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="Van">Van</option>
                    <option value="Truck">Truck</option>
                    <option value="Trailer">Trailer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Manufacturer</label>
                  <input
                    type="text"
                    placeholder="e.g. Mercedes-Benz"
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Manufacture Year</label>
                  <input
                    type="number"
                    placeholder="e.g. 2023"
                    value={manufactureYear}
                    onChange={(e) => setManufactureYear(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Max Load Capacity (kg)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 1500"
                    value={maximumLoadCapacityKg}
                    onChange={(e) => setMaximumLoadCapacityKg(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Odometer (km)</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 12000"
                    value={currentOdometer}
                    onChange={(e) => setCurrentOdometer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Acquisition Cost ($)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45000"
                    value={acquisitionCost}
                    onChange={(e) => setAcquisitionCost(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Purchase Date</label>
                  <input
                    type="date"
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assigned Region</label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="West">West</option>
                    <option value="East">East</option>
                    <option value="North">North</option>
                    <option value="South">South</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Lifecycle Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="Available">Available</option>
                  <option value="On Trip">On Trip</option>
                  <option value="In Shop">In Shop (Maintenance)</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-save-vehicle"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Specifications"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
