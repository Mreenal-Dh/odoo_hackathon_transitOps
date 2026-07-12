import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  User, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Phone, 
  Mail,
  Shield,
  Calendar,
  AlertTriangle,
  Award,
  X,
  UserCheck,
  Check,
  AlertCircle
} from "lucide-react";
import { apiRequest, getUserData } from "../lib/api.ts";
import { Driver, Vehicle } from "../types.ts";

export default function DriversView() {
  const queryClient = useQueryClient();
  const user = getUserData();
  
  // RBAC Roles Check
  const isFleetManager = user?.role_id === 1;
  const isSafetyOfficer = user?.role_id === 3;
  const canEditAll = isFleetManager;
  const canEditSafety = isFleetManager || isSafetyOfficer;
  const hasEditAccess = isFleetManager || isSafetyOfficer;

  // Search/Filter states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseCategory, setLicenseCategory] = useState("Class A");
  const [licenseExpiryDate, setLicenseExpiryDate] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [safetyScore, setSafetyScore] = useState("100");
  const [status, setStatus] = useState("Available");
  const [assignedVehicleId, setAssignedVehicleId] = useState("");

  // Query: Drivers
  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => apiRequest("/api/drivers"),
  });

  // Query: Available Vehicles (for assignment)
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest("/api/vehicles"),
  });

  // Mutation: Create Driver
  const createMutation = useMutation({
    mutationFn: (newDriver: any) => apiRequest("/api/drivers", {
      method: "POST",
      body: JSON.stringify(newDriver),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to register driver.");
    }
  });

  // Mutation: Update Driver
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/drivers/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to update driver profile.");
    }
  });

  // Mutation: Delete Driver
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/drivers/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
    },
    onError: (err: any) => {
      alert(err.message || "Failed to delete driver.");
    }
  });

  const openCreateModal = () => {
    setEditingDriver(null);
    setName("");
    setLicenseNumber("");
    setLicenseCategory("Class A");
    setLicenseExpiryDate("");
    setPhone("");
    setEmail("");
    setJoiningDate(new Date().toISOString().split("T")[0]);
    setExperienceYears("");
    setSafetyScore("100");
    setStatus("Available");
    setAssignedVehicleId("");
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setLicenseNumber(driver.license_number);
    setLicenseCategory(driver.license_category);
    setLicenseExpiryDate(driver.license_expiry_date);
    setPhone(driver.phone);
    setEmail(driver.email);
    setJoiningDate(driver.joining_date);
    setExperienceYears(driver.experience_years.toString());
    setSafetyScore(driver.safety_score.toString());
    setStatus(driver.status);
    setAssignedVehicleId(driver.assigned_vehicle_id ? driver.assigned_vehicle_id.toString() : "");
    setFormError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDriver(null);
    setFormError(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    let driverData: any = {};

    if (isFleetManager) {
      // Fleet Managers can update everything
      driverData = {
        name,
        license_number: licenseNumber,
        license_category: licenseCategory,
        license_expiry_date: licenseExpiryDate,
        phone,
        email,
        joining_date: joiningDate,
        experience_years: parseInt(experienceYears),
        safety_score: parseFloat(safetyScore),
        status,
        assigned_vehicle_id: assignedVehicleId === "" ? null : parseInt(assignedVehicleId),
      };
    } else if (isSafetyOfficer && editingDriver) {
      // Safety Officers can ONLY update compliance aspects
      driverData = {
        safety_score: parseFloat(safetyScore),
        status,
      };
    }

    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.driver_id, data: driverData });
    } else {
      createMutation.mutate(driverData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete driver profile: ${name}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const filteredDrivers = drivers.filter((d) => {
    const matchesSearch = 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.license_number.toLowerCase().includes(search.toLowerCase()) ||
      d.email.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "All" || d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6" id="drivers-view-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Driver Directory</h2>
          <p className="text-xs text-gray-500 mt-1">Monitor compliance, licensing, safety ratings, and current operator statuses.</p>
        </div>
        {isFleetManager && (
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all"
            id="btn-register-driver"
          >
            <Plus className="h-4 w-4" />
            <span>Onboard Operator</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4" id="drivers-filters">
        <div className="relative flex-1 w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by driver name, license, contact info..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 text-gray-900 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            id="search-drivers-input"
          />
        </div>

        <div className="w-full sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-xs rounded-lg focus:outline-none"
            id="filter-drivers-status"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="On Trip">On Trip</option>
            <option value="Off Duty">Off Duty</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Drivers List */}
      {driversLoading ? (
        <div className="flex justify-center items-center py-20" id="drivers-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="drivers-empty">
          <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No operators found</h3>
          <p className="text-xs text-gray-500 mt-1">Register drivers and assign active transport assets.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="drivers-grid">
          {filteredDrivers.map((d) => {
            const isLicenseExpired = d.license_expiry_date < todayStr;
            let statusColor = "bg-emerald-50 text-emerald-700 border-emerald-200";
            if (d.status === "On Trip") statusColor = "bg-blue-50 text-blue-700 border-blue-200";
            if (d.status === "Off Duty") statusColor = "bg-slate-100 text-slate-700 border-gray-200";
            if (d.status === "Suspended") statusColor = "bg-red-50 text-red-700 border-red-200";

            return (
              <div 
                key={d.driver_id} 
                className={`bg-white border rounded-xl p-5 shadow-xs flex flex-col justify-between transition-all hover:shadow-md relative overflow-hidden ${
                  isLicenseExpired ? "border-red-300 ring-1 ring-red-100" : "border-gray-100"
                }`}
                id={`driver-card-${d.driver_id}`}
              >
                {/* Expired Ribbon Warning */}
                {isLicenseExpired && (
                  <div className="absolute top-0 right-0 bg-red-600 text-white text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg flex items-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    <span>Expired License</span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-11 w-11 rounded-full bg-slate-100 border border-gray-200/50 flex items-center justify-center text-slate-600">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm font-sans">{d.name}</h4>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{d.license_category} • Exp: {d.experience_years} Years</span>
                      </div>
                    </div>
                    {/* Status Badge */}
                    {!isLicenseExpired && (
                      <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor}`}>
                        {d.status}
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 border-t border-gray-50 pt-3 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-gray-400" />
                      <span>{d.phone || "No direct phone"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="truncate">{d.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Shield className="h-3.5 w-3.5 text-gray-400" />
                      <span>Lic: <span className="font-mono bg-gray-50 px-1 py-0.5 border border-gray-150 rounded">{d.license_number}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      <span>Expiry: <span className={isLicenseExpired ? "text-red-600 font-bold" : "text-gray-600"}>{d.license_expiry_date}</span></span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50 mt-4 pt-3 flex items-center justify-between">
                  {/* Safety Score Indicators */}
                  <div className="flex items-center gap-1.5">
                    <Award className={`h-4 w-4 ${d.safety_score >= 90 ? "text-amber-500" : d.safety_score >= 75 ? "text-blue-500" : "text-red-500"}`} />
                    <span className="text-[11px] text-gray-500">
                      Safety Score: <span className="font-bold text-gray-850">{d.safety_score}/100</span>
                    </span>
                  </div>

                  {/* Actions depending on RBAC */}
                  <div className="flex items-center gap-1">
                    {hasEditAccess ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(d)}
                          className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-all"
                          title="Edit operators/scores"
                          id={`edit-driver-btn-${d.driver_id}`}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {isFleetManager && (
                          <button
                            type="button"
                            onClick={() => handleDelete(d.driver_id, d.name)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-all"
                            title="Remove operator"
                            id={`delete-driver-btn-${d.driver_id}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-[9px] font-medium text-gray-400 italic">View Only</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="driver-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">
                {editingDriver 
                  ? (isSafetyOfficer && !isFleetManager ? "Log Driver Safety & Compliance" : "Modify Operator Profile") 
                  : "Onboard Logistics Operator"
                }
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto" id="driver-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Safety Officers can ONLY edit safety rating and status */}
              {isSafetyOfficer && !isFleetManager && editingDriver ? (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700">
                    <p className="font-semibold text-slate-900">Safety & Compliance Mode</p>
                    <p className="mt-1">You are logged in as a <strong>Safety Officer</strong>. Your access is restricted to editing safety scores and compliance statuses only.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Safety Rating Score (0 - 100)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="100"
                      step="0.1"
                      value={safetyScore}
                      onChange={(e) => setSafetyScore(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Compliance Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="Available">Available / Approved</option>
                      <option value="Off Duty">Off Duty</option>
                      <option value="Suspended">Suspended (License Expired / Infractions)</option>
                    </select>
                  </div>
                </div>
              ) : (
                /* Full Fleet Manager editing fields */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Driver Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Alex Johnson"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="operator@transitops.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                      <input
                        type="tel"
                        placeholder="+1555019283"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">License Code Number</label>
                      <input
                        type="text"
                        required
                        placeholder="DL-993821"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">License Category</label>
                      <select
                        value={licenseCategory}
                        onChange={(e) => setLicenseCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="Class A">Class A (Heavy Commercials)</option>
                        <option value="Class B">Class B (Vans / Light Cargo)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">License Expiry Date</label>
                      <input
                        type="date"
                        required
                        value={licenseExpiryDate}
                        onChange={(e) => setLicenseExpiryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Onboarding Date</label>
                      <input
                        type="date"
                        value={joiningDate}
                        onChange={(e) => setJoiningDate(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Commercial Exp (Years)</label>
                      <input
                        type="number"
                        placeholder="6"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Safety Rating Score</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={safetyScore}
                        onChange={(e) => setSafetyScore(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Workplace Status</label>
                      <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                      >
                        <option value="Available">Available</option>
                        <option value="On Trip">On Trip</option>
                        <option value="Off Duty">Off Duty</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Assigned Fleet Vehicle</label>
                    <select
                      value={assignedVehicleId}
                      onChange={(e) => setAssignedVehicleId(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    >
                      <option value="">Unassigned</option>
                      {vehicles.map((v) => (
                        <option key={v.vehicle_id} value={v.vehicle_id}>
                          {v.vehicle_name} ({v.registration_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Modal Footer */}
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
                  id="btn-save-driver"
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Operator Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
