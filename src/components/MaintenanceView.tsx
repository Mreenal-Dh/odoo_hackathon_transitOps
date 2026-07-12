import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  Wrench, 
  Plus, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Clock, 
  Activity 
} from "lucide-react";
import { apiRequest, getUserData } from "../lib/api.ts";
import { MaintenanceLog, Vehicle } from "../types.ts";

export default function MaintenanceView() {
  const queryClient = useQueryClient();
  const user = getUserData();
  const isFleetManager = user?.role_id === 1;

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Maintenance Form fields
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [maintenanceType, setMaintenanceType] = useState("Oil Change");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [estimatedCost, setEstimatedCost] = useState("");
  const [serviceCenter, setServiceCenter] = useState("");

  // Complete Maintenance Form fields
  const [completingLog, setCompletingLog] = useState<MaintenanceLog | null>(null);
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split("T")[0]);
  const [finalCost, setFinalCost] = useState("");

  // Query: Maintenance Logs
  const { data: logs = [], isLoading: logsLoading } = useQuery<MaintenanceLog[]>({
    queryKey: ["maintenanceLogs"],
    queryFn: () => apiRequest("/api/maintenance"),
  });

  // Query: Vehicles (to select available / active vehicles)
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest("/api/vehicles"),
  });

  // Filter vehicles: Hidden retired vehicles from maintenance logging
  const activeVehicles = vehicles.filter((v) => v.status !== "Retired");

  // Mutation: Create Maintenance Record (transitions vehicle to "In Shop")
  const createLogMutation = useMutation({
    mutationFn: (newLog: any) => apiRequest("/api/maintenance", {
      method: "POST",
      body: JSON.stringify(newLog),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeLogModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to create maintenance log.");
    }
  });

  // Mutation: Complete Maintenance Record (transitions vehicle back to "Available" & logs expense)
  const completeLogMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/maintenance/${id}/complete`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["maintenanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeCompleteModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to complete maintenance log.");
    }
  });

  const openLogModal = () => {
    setSelectedVehicleId("");
    setMaintenanceType("Oil Change");
    setDescription("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEstimatedCost("");
    setServiceCenter("");
    setFormError(null);
    setIsLogModalOpen(true);
  };

  const closeLogModal = () => {
    setIsLogModalOpen(false);
    setFormError(null);
  };

  const openCompleteModal = (log: MaintenanceLog) => {
    setCompletingLog(log);
    setCompletionDate(new Date().toISOString().split("T")[0]);
    setFinalCost(log.cost.toString());
    setFormError(null);
    setIsCompleteModalOpen(true);
  };

  const closeCompleteModal = () => {
    setIsCompleteModalOpen(false);
    setCompletingLog(null);
    setFormError(null);
  };

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    createLogMutation.mutate({
      vehicle_id: parseInt(selectedVehicleId),
      maintenance_type: maintenanceType,
      description,
      start_date: startDate,
      cost: parseFloat(estimatedCost) || 0.0,
      service_center: serviceCenter,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!completingLog) return;

    completeLogMutation.mutate({
      id: completingLog.maintenance_id,
      data: {
        completion_date: completionDate,
        final_cost: parseFloat(finalCost) || 0.0,
      },
    });
  };

  return (
    <div className="space-y-6" id="maintenance-view-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Maintenance & Repair Hub</h2>
          <p className="text-xs text-gray-500 mt-1">Schedule services, monitor workshop vehicles, record diagnostic actions, and resolve assets.</p>
        </div>
        {isFleetManager && (
          <button
            type="button"
            onClick={openLogModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all"
            id="btn-log-maintenance"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Workshop Service</span>
          </button>
        )}
      </div>

      {/* Logs Table */}
      {logsLoading ? (
        <div className="flex justify-center items-center py-20" id="logs-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="logs-empty">
          <Wrench className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No maintenance events booked</h3>
          <p className="text-xs text-gray-500 mt-1">Schedule service tickets when assets are due for oil shifts, brake repair, or overhauls.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-xs overflow-hidden" id="logs-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="maintenance-table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Ticket</th>
                  <th className="px-6 py-4">Asset Details</th>
                  <th className="px-6 py-4">Service Type</th>
                  <th className="px-6 py-4">Workshop / Center</th>
                  <th className="px-6 py-4">Cost Detail</th>
                  <th className="px-6 py-4">Dates</th>
                  <th className="px-6 py-4 text-center">Lifecycle</th>
                  <th className="px-6 py-4 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {logs.map((log) => {
                  let statusBadge = "bg-amber-50 text-amber-700 border-amber-200";
                  if (log.status === "Completed") statusBadge = "bg-emerald-50 text-emerald-700 border-emerald-200";

                  return (
                    <tr key={log.maintenance_id} className="hover:bg-gray-50/50 transition-colors" id={`maint-row-${log.maintenance_id}`}>
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        #SRV-{log.maintenance_id.toString().padStart(3, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900 block">{log.vehicle?.vehicle_name}</span>
                        <span className="font-mono text-[9px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.2 rounded mt-0.5 inline-block">
                          {log.vehicle?.registration_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold block">{log.maintenance_type}</span>
                        <span className="text-gray-400 text-[10px] block mt-0.5 max-w-[200px] truncate" title={log.description}>{log.description || "No diagnostics specified"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <MapPin className="h-3.5 w-3.5 text-gray-400" />
                          <span>{log.service_center}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        ${log.cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-[11px] text-gray-500">
                        <div className="space-y-0.5">
                          <div>Start: {log.start_date}</div>
                          {log.completion_date && <div className="text-emerald-600 font-medium">End: {log.completion_date}</div>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}`}>
                          {log.status === "In Progress" ? "In Shop" : log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end">
                          {isFleetManager && log.status === "In Progress" ? (
                            <button
                              type="button"
                              onClick={() => openCompleteModal(log)}
                              className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-[10px] font-semibold transition-all flex items-center gap-1"
                              title="Complete diagnostics"
                              id={`complete-maint-btn-${log.maintenance_id}`}
                            >
                              <CheckCircle className="h-2.5 w-2.5" />
                              <span>Complete</span>
                            </button>
                          ) : (
                            <span className="text-gray-400 text-[10px] italic">No active actions</span>
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

      {/* Book Maintenance Ticket Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="maintenance-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Create Maintenance Diagnostic Ticket</h3>
              <button onClick={closeLogModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto" id="maintenance-ticket-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Fleet Asset</label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {activeVehicles.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.vehicle_name} ({v.registration_number}) [Odo: {v.current_odometer.toLocaleString()} km] - Current: {v.status}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-1">Warning: Booking immediately sets vehicle status to 'In Shop' (removes from dispatch selections).</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Type</label>
                  <select
                    value={maintenanceType}
                    onChange={(e) => setMaintenanceType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="Oil Change">Oil Change</option>
                    <option value="Brake Repair">Brake Repair</option>
                    <option value="Tire Rotation">Tire Rotation</option>
                    <option value="Engine Diagnostics">Engine Diagnostics</option>
                    <option value="Body Repair">Body Repair</option>
                    <option value="Electrical Repair">Electrical Repair</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Workshop Center</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Mechanic Shop"
                      value={serviceCenter}
                      onChange={(e) => setServiceCenter(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estimated Cost ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <DollarSign className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={estimatedCost}
                      onChange={(e) => setEstimatedCost(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Workshop Entry Date</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Diagnostic Details & Comments</label>
                <textarea
                  placeholder="Describe service specifications, parts required, and repair conditions..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeLogModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLogMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-confirm-maintenance"
                >
                  {createLogMutation.isPending ? "Scheduling..." : "Schedule Service Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Workshop Service Modal */}
      {isCompleteModalOpen && completingLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="complete-maint-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Complete Workshop Service</h3>
              <button onClick={closeCompleteModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4" id="complete-maint-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                <p className="font-semibold text-slate-900 mb-1">Ticket #SRV-{completingLog.maintenance_id}</p>
                <p>Asset: <strong>{completingLog.vehicle?.vehicle_name}</strong> ({completingLog.vehicle?.registration_number})</p>
                <p>Diagnostic: <strong>{completingLog.maintenance_type}</strong></p>
                <p>Service Center: <strong>{completingLog.service_center}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Final Actual Invoice Cost ($)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <DollarSign className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="number"
                    required
                    value={finalCost}
                    onChange={(e) => setFinalCost(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Completion Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={completionDate}
                    onChange={(e) => setCompletionDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Completing service restores asset status to 'Available' and registers an automated maintenance expense entry.</p>
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeCompleteModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={completeLogMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-save-completed-maint"
                >
                  {completeLogMutation.isPending ? "Completing..." : "Complete & Restore Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
