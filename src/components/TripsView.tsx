import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  Navigation, 
  Plus, 
  MapPin, 
  Calendar, 
  Scale, 
  Gauge, 
  DollarSign, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Play, 
  User, 
  Ban, 
  Flame
} from "lucide-react";
import { apiRequest, getUserData } from "../lib/api.ts";
import { Trip, Vehicle, Driver } from "../types.ts";

export default function TripsView() {
  const queryClient = useQueryClient();
  const user = getUserData();
  
  // RBAC permissions (Fleet Managers and Drivers can interact with dispatches)
  const isFleetManager = user?.role_id === 1;
  const isDriver = user?.role_id === 2;
  const canModifyTrips = isFleetManager || isDriver;

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Trip form fields
  const [sourceCity, setSourceCity] = useState("");
  const [destinationCity, setDestinationCity] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [cargoWeight, setCargoWeight] = useState("");
  const [plannedDistance, setPlannedDistance] = useState("");
  const [revenue, setRevenue] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [startStatus, setStartStatus] = useState("Draft"); // Draft or Dispatched

  // Completion modal form fields
  const [completingTrip, setCompletingTrip] = useState<Trip | null>(null);
  const [actualDistance, setActualDistance] = useState("");
  const [fuelConsumed, setFuelConsumed] = useState("");
  const [finalOdometer, setFinalOdometer] = useState("");

  // Query: Trips
  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: () => apiRequest("/api/trips"),
  });

  // Query: Vehicles (for selection)
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest("/api/vehicles"),
  });

  // Query: Drivers (for selection)
  const { data: drivers = [] } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => apiRequest("/api/drivers"),
  });

  // Filters for dropdown selections (Business Rule: Retired/In Shop vehicles & Suspended/Expired/On Trip drivers are hidden from dispatch)
  const todayStr = new Date().toISOString().split("T")[0];
  const availableVehicles = vehicles.filter((v) => v.status === "Available");
  const availableDrivers = drivers.filter((d) => 
    d.status === "Available" && 
    d.license_expiry_date >= todayStr
  );

  // Mutation: Dispatch/Create Trip
  const createTripMutation = useMutation({
    mutationFn: (newTrip: any) => apiRequest("/api/trips", {
      method: "POST",
      body: JSON.stringify(newTrip),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeDispatchModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to dispatch trip.");
    }
  });

  // Mutation: Update Status (Dispatched -> Complete / Cancelled)
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest(`/api/trips/${id}/status`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeCompleteModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to complete trip status update.");
    }
  });

  const openDispatchModal = () => {
    setSourceCity("");
    setDestinationCity("");
    setSelectedVehicleId("");
    setSelectedDriverId("");
    setCargoWeight("");
    setPlannedDistance("");
    setRevenue("");
    setStartDate(new Date().toISOString().split("T")[0]);
    setStartStatus("Draft");
    setFormError(null);
    setIsDispatchModalOpen(true);
  };

  const closeDispatchModal = () => {
    setIsDispatchModalOpen(false);
    setFormError(null);
  };

  const openCompleteModal = (trip: Trip) => {
    setCompletingTrip(trip);
    setActualDistance(trip.planned_distance.toString());
    setFuelConsumed("");
    // Pre-populate final odometer with current + planned distance as estimation
    const currentOdo = trip.vehicle?.current_odometer || 0;
    setFinalOdometer((currentOdo + trip.planned_distance).toString());
    setFormError(null);
    setIsCompleteModalOpen(true);
  };

  const closeCompleteModal = () => {
    setIsCompleteModalOpen(false);
    setCompletingTrip(null);
    setFormError(null);
  };

  const handleDispatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Frontend validations before fetch
    const vId = parseInt(selectedVehicleId);
    const dId = parseInt(selectedDriverId);
    const weight = parseFloat(cargoWeight);

    const vehicle = vehicles.find((v) => v.vehicle_id === vId);
    const driver = drivers.find((d) => d.driver_id === dId);

    if (!vehicle || !driver) {
      setFormError("Must select an available vehicle and operator.");
      return;
    }

    // Business Rule: Cargo weight <= vehicle maximum payload
    if (weight > vehicle.maximum_load_capacity_kg) {
      setFormError(`Cargo weight (${weight} kg) exceeds vehicle maximum payload limit (${vehicle.maximum_load_capacity_kg} kg).`);
      return;
    }

    createTripMutation.mutate({
      vehicle_id: vId,
      driver_id: dId,
      source_city: sourceCity,
      destination_city: destinationCity,
      start_date: startDate,
      cargo_weight: weight,
      planned_distance: parseFloat(plannedDistance),
      revenue: parseFloat(revenue) || 0.0,
      status: startStatus,
    });
  };

  const handleCompleteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!completingTrip) return;

    const odo = parseFloat(finalOdometer);
    const currentOdometer = completingTrip.vehicle?.current_odometer || 0;

    // Business Rule: Final odometer must be >= current vehicle odometer
    if (odo < currentOdometer) {
      setFormError(`Odometer reading cannot go backward. Current vehicle odometer is ${currentOdometer.toLocaleString()} km.`);
      return;
    }

    updateStatusMutation.mutate({
      id: completingTrip.trip_id,
      data: {
        status: "Completed",
        actual_distance: parseFloat(actualDistance),
        fuel_consumed: parseFloat(fuelConsumed) || 0.0,
        final_odometer: odo,
      },
    });
  };

  const triggerDispatchTransition = (tripId: number) => {
    if (confirm("Dispatch this trip? Both driver and vehicle statuses will shift to 'On Trip'.")) {
      updateStatusMutation.mutate({
        id: tripId,
        data: { status: "Dispatched" },
      });
    }
  };

  const triggerCancelTransition = (tripId: number) => {
    if (confirm("Are you sure you want to cancel this trip? Drivers and vehicles will be restored as 'Available'.")) {
      updateStatusMutation.mutate({
        id: tripId,
        data: { status: "Cancelled" },
      });
    }
  };

  return (
    <div className="space-y-6" id="trips-view-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans">Trip Management & Dispatch</h2>
          <p className="text-xs text-gray-500 mt-1">Deploy cargo, enforce safety clearances, track routes, and transition transit cycles.</p>
        </div>
        {canModifyTrips && (
          <button
            type="button"
            onClick={openDispatchModal}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all"
            id="btn-new-dispatch"
          >
            <Plus className="h-4 w-4" />
            <span>Plan Dispatch Route</span>
          </button>
        )}
      </div>

      {/* Trips List Table */}
      {tripsLoading ? (
        <div className="flex justify-center items-center py-20" id="trips-loading">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
        </div>
      ) : trips.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="trips-empty">
          <Navigation className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-gray-900">No trips dispatched yet</h3>
          <p className="text-xs text-gray-500 mt-1">Start dispatch planning by registering a payload and routing variables.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200/60 rounded-xl shadow-xs overflow-hidden" id="trips-table-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="trips-table">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  <th className="px-6 py-4">Manifest ID</th>
                  <th className="px-6 py-4">Transit Path</th>
                  <th className="px-6 py-4">Assigned Vehicle</th>
                  <th className="px-6 py-4">Assigned Operator</th>
                  <th className="px-6 py-4">Specs & Weight</th>
                  <th className="px-6 py-4">Financial Rev</th>
                  <th className="px-6 py-4 text-center">Lifecycle</th>
                  <th className="px-6 py-4 text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {trips.map((t) => {
                  let statusBadgeStyle = "bg-slate-50 text-slate-700 border-gray-200";
                  if (t.status === "Dispatched") statusBadgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                  if (t.status === "Completed") statusBadgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                  if (t.status === "Cancelled") statusBadgeStyle = "bg-red-50 text-red-700 border-red-200";

                  return (
                    <tr key={t.trip_id} className="hover:bg-gray-50/50 transition-colors animate-fade-in" id={`trip-row-${t.trip_id}`}>
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">
                        #{t.trip_id.toString().padStart(4, "0")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-1">
                          <span>{t.source_city}</span>
                          <span className="text-gray-400">→</span>
                          <span>{t.destination_city}</span>
                        </div>
                        <span className="text-gray-400 text-[10px] block mt-0.5">{t.start_date} {t.end_date ? `to ${t.end_date}` : "(En route)"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900 block">{t.vehicle?.vehicle_name || "Unassigned"}</span>
                        <span className="font-mono text-[9px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.2 rounded mt-0.5 inline-block">
                          {t.vehicle?.registration_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span>{t.driver?.name || "No driver assigned"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-gray-900 font-medium block">{t.cargo_weight.toLocaleString()} kg</span>
                        <span className="text-gray-400 text-[10px] block">Plan Dist: {t.planned_distance.toLocaleString()} km</span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        ${t.revenue.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadgeStyle}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canModifyTrips ? (
                            <>
                              {t.status === "Draft" && (
                                <button
                                  type="button"
                                  onClick={() => triggerDispatchTransition(t.trip_id)}
                                  className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-[10px] font-semibold transition-all flex items-center gap-1"
                                  title="Deploy payload"
                                  id={`dispatch-trip-btn-${t.trip_id}`}
                                >
                                  <Play className="h-2.5 w-2.5 fill-current" />
                                  <span>Dispatch</span>
                                </button>
                              )}
                              {t.status === "Dispatched" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => openCompleteModal(t)}
                                    className="px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-[10px] font-semibold transition-all flex items-center gap-1"
                                    title="Complete trip logistics"
                                    id={`complete-trip-btn-${t.trip_id}`}
                                  >
                                    <CheckCircle className="h-2.5 w-2.5" />
                                    <span>Complete</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => triggerCancelTransition(t.trip_id)}
                                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Cancel Route"
                                    id={`cancel-trip-btn-${t.trip_id}`}
                                  >
                                    <Ban className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              {(t.status === "Completed" || t.status === "Cancelled") && (
                                <span className="text-gray-400 text-[10px] italic">Cycle finished</span>
                              )}
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

      {/* Plan Dispatch route modal */}
      {isDispatchModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="dispatch-form-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Plan Dispatch Manifest</h3>
              <button onClick={closeDispatchModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleDispatchSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto" id="trip-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Departure City</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Seattle"
                      value={sourceCity}
                      onChange={(e) => setSourceCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Arrival City</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <MapPin className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Portland"
                      value={destinationCity}
                      onChange={(e) => setDestinationCity(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Available Asset</label>
                  <select
                    required
                    value={selectedVehicleId}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {availableVehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.vehicle_name} ({v.registration_number}) [Cap: {v.maximum_load_capacity_kg} kg]
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Select Cleared Operator</label>
                  <select
                    required
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="">-- Choose Operator --</option>
                    {availableDrivers.map((d) => (
                      <option key={d.driver_id} value={d.driver_id}>
                        {d.name} (Safety: {d.safety_score})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cargo Payload Weight (kg)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Scale className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 500"
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Planned Route Distance (km)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Gauge className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 180"
                      value={plannedDistance}
                      onChange={(e) => setPlannedDistance(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Revenue Estimate ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <DollarSign className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      placeholder="e.g. 1200"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Departure Date</label>
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
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Start Action</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg cursor-pointer flex-1 justify-center hover:bg-gray-100 transition-all">
                    <input
                      type="radio"
                      name="startStatus"
                      value="Draft"
                      checked={startStatus === "Draft"}
                      onChange={() => setStartStatus("Draft")}
                      className="text-slate-900 focus:ring-slate-900"
                    />
                    <span>Save Draft Manifest</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-white bg-slate-900 px-4 py-2 rounded-lg cursor-pointer flex-1 justify-center hover:bg-slate-850 transition-all">
                    <input
                      type="radio"
                      name="startStatus"
                      value="Dispatched"
                      checked={startStatus === "Dispatched"}
                      onChange={() => setStartStatus("Dispatched")}
                      className="text-white border-white focus:ring-white"
                    />
                    <span>Deploy Instantly</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeDispatchModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTripMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-confirm-dispatch"
                >
                  {createTripMutation.isPending ? "Deploying..." : "Confirm Dispatch Manifest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Trip Logging Modal */}
      {isCompleteModalOpen && completingTrip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="complete-trip-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Log Completed Trip Data</h3>
              <button onClick={closeCompleteModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCompleteSubmit} className="p-6 space-y-4" id="complete-trip-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700">
                <div className="flex justify-between font-semibold text-slate-900 mb-1.5 border-b border-slate-200 pb-1.5">
                  <span>Manifest #{completingTrip.trip_id}</span>
                  <span>{completingTrip.source_city} → {completingTrip.destination_city}</span>
                </div>
                <p>Asset: <strong>{completingTrip.vehicle?.vehicle_name}</strong> ({completingTrip.vehicle?.registration_number})</p>
                <p>Previous Odometer: <strong>{completingTrip.vehicle?.current_odometer.toLocaleString()} km</strong></p>
                <p>Operator: <strong>{completingTrip.driver?.name}</strong></p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Actual Distance Covered (km)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Gauge className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="number"
                    required
                    value={actualDistance}
                    onChange={(e) => setActualDistance(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fuel Consumed (Liters)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Flame className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 18.5"
                    value={fuelConsumed}
                    onChange={(e) => setFuelConsumed(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Saves a standard fuel cost record automatically on save.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Final Odometer Reading (km)</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Gauge className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="number"
                    required
                    value={finalOdometer}
                    onChange={(e) => setFinalOdometer(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
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
                  disabled={updateStatusMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-save-completed-trip"
                >
                  {updateStatusMutation.isPending ? "Saving..." : "Log Completed Cycle"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
