import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { 
  Fuel, 
  DollarSign, 
  Plus, 
  X, 
  AlertCircle, 
  Calendar, 
  Truck, 
  Navigation, 
  Tag, 
  FileText 
} from "lucide-react";
import { apiRequest, getUserData } from "../lib/api.ts";
import { FuelLog, Expense, Vehicle, Trip } from "../types.ts";

export default function ExpensesView() {
  const queryClient = useQueryClient();
  const user = getUserData();
  const isFleetManager = user?.role_id === 1;
  const isDriver = user?.role_id === 2;
  const canLogExpenses = isFleetManager || isDriver;

  const [activeTab, setActiveTab] = useState<"fuel" | "expense">("fuel");

  // Modals state
  const [isFuelModalOpen, setIsFuelModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // New Fuel Log form fields
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [associatedTripId, setAssociatedTripId] = useState("");
  const [fuelDate, setFuelDate] = useState(new Date().toISOString().split("T")[0]);
  const [fuelStation, setFuelStation] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [fuelOdometer, setFuelOdometer] = useState("");

  // New Expense form fields
  const [expenseVehicleId, setExpenseVehicleId] = useState("");
  const [expenseTripId, setExpenseTripId] = useState("");
  const [expenseType, setExpenseType] = useState("Toll");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [expenseDescription, setExpenseDescription] = useState("");

  // Query: Fuel Logs
  const { data: fuelLogs = [], isLoading: fuelLoading } = useQuery<FuelLog[]>({
    queryKey: ["fuelLogs"],
    queryFn: () => apiRequest("/api/fuel"),
  });

  // Query: Other Expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => apiRequest("/api/expenses"),
  });

  // Query: Vehicles (for selection)
  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["vehicles"],
    queryFn: () => apiRequest("/api/vehicles"),
  });

  // Query: Trips (for selection)
  const { data: trips = [] } = useQuery<Trip[]>({
    queryKey: ["trips"],
    queryFn: () => apiRequest("/api/trips"),
  });

  // Mutations
  const createFuelMutation = useMutation({
    mutationFn: (newFuelLog: any) => apiRequest("/api/fuel", {
      method: "POST",
      body: JSON.stringify(newFuelLog),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuelLogs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeFuelModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to log fuel refill.");
    }
  });

  const createExpenseMutation = useMutation({
    mutationFn: (newExpense: any) => apiRequest("/api/expenses", {
      method: "POST",
      body: JSON.stringify(newExpense),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
      closeExpenseModal();
    },
    onError: (err: any) => {
      setFormError(err.message || "Failed to log operational expense.");
    }
  });

  const openFuelModal = () => {
    setSelectedVehicleId("");
    setAssociatedTripId("");
    setFuelDate(new Date().toISOString().split("T")[0]);
    setFuelStation("");
    setLiters("");
    setPricePerLiter("");
    setFuelOdometer("");
    setFormError(null);
    setIsFuelModalOpen(true);
  };

  const closeFuelModal = () => {
    setIsFuelModalOpen(false);
    setFormError(null);
  };

  const openExpenseModal = () => {
    setExpenseVehicleId("");
    setExpenseTripId("");
    setExpenseType("Toll");
    setExpenseAmount("");
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setExpenseDescription("");
    setFormError(null);
    setIsExpenseModalOpen(true);
  };

  const closeExpenseModal = () => {
    setIsExpenseModalOpen(false);
    setFormError(null);
  };

  const handleFuelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    createFuelMutation.mutate({
      vehicle_id: parseInt(selectedVehicleId),
      trip_id: associatedTripId ? parseInt(associatedTripId) : null,
      date: fuelDate,
      fuel_station: fuelStation,
      fuel_type: "Diesel",
      liters: parseFloat(liters),
      price_per_liter: parseFloat(pricePerLiter),
      odometer: parseFloat(fuelOdometer),
    });
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    createExpenseMutation.mutate({
      vehicle_id: parseInt(expenseVehicleId),
      trip_id: expenseTripId ? parseInt(expenseTripId) : null,
      expense_type: expenseType,
      amount: parseFloat(expenseAmount),
      expense_date: expenseDate,
      description: expenseDescription,
    });
  };

  return (
    <div className="space-y-6" id="expenses-view-root">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-sans font-sans">Operational Costs & Refills</h2>
          <p className="text-xs text-gray-500 mt-1">Audit fuel logs, associate route incidentals, log tolls, and verify expenditures.</p>
        </div>
        {canLogExpenses && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={openFuelModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold shadow-xs transition-all"
              id="btn-add-fuel-log"
            >
              <Fuel className="h-3.5 w-3.5" />
              <span>Log Refill</span>
            </button>
            <button
              type="button"
              onClick={openExpenseModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 text-white rounded-lg hover:bg-slate-900 text-xs font-semibold shadow-xs transition-all"
              id="btn-add-expense-log"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span>Log Incidentals</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200" id="cost-tabs">
        <button
          onClick={() => setActiveTab("fuel")}
          className={`px-5 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === "fuel"
              ? "border-slate-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
          id="tab-fuel"
        >
          <div className="flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            <span>Fuel Refill Logs</span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab("expense")}
          className={`px-5 py-3 text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === "expense"
              ? "border-slate-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-900"
          }`}
          id="tab-expense"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span>Route Incidentals & Expenses</span>
          </div>
        </button>
      </div>

      {/* Tables depending on Active Tab */}
      {activeTab === "fuel" ? (
        fuelLoading ? (
          <div className="flex justify-center items-center py-20" id="fuel-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : fuelLogs.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="fuel-empty">
            <Fuel className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">No fuel refill logs recorded</h3>
            <p className="text-xs text-gray-500 mt-1">Log liters and price per liter to analyze fleet fuel efficiency metrics.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-xl shadow-xs overflow-hidden" id="fuel-table-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="fuel-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Refill Date</th>
                    <th className="px-6 py-4">Vehicle Details</th>
                    <th className="px-6 py-4">Station Location</th>
                    <th className="px-6 py-4">Odometer</th>
                    <th className="px-6 py-4">Volume (Liters)</th>
                    <th className="px-6 py-4">Price/Liter</th>
                    <th className="px-6 py-4 text-right">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {fuelLogs.map((log) => (
                    <tr key={log.fuel_log_id} className="hover:bg-gray-50/50 transition-colors animate-fade-in" id={`fuel-row-${log.fuel_log_id}`}>
                      <td className="px-6 py-4 font-semibold text-gray-900">{log.date}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold block">{log.vehicle?.vehicle_name}</span>
                        <span className="font-mono text-[9px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.2 rounded mt-0.5 inline-block">
                          {log.vehicle?.registration_number}
                        </span>
                      </td>
                      <td className="px-6 py-4">{log.fuel_station}</td>
                      <td className="px-6 py-4 font-mono">{log.odometer.toLocaleString()} km</td>
                      <td className="px-6 py-4 font-medium">{log.liters.toLocaleString()} L</td>
                      <td className="px-6 py-4 text-gray-500">${log.price_per_liter.toFixed(2)}/L</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-950">${log.total_cost.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        expensesLoading ? (
          <div className="flex justify-center items-center py-20" id="expenses-loading">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl py-12 text-center" id="expenses-empty">
            <DollarSign className="h-10 w-10 text-gray-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">No incidental expenses logged</h3>
            <p className="text-xs text-gray-500 mt-1">Log road tolls, lodging, parking receipts, or permits incurred during trips.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/60 rounded-xl shadow-xs overflow-hidden" id="expenses-table-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="expenses-table">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-4">Expense Date</th>
                    <th className="px-6 py-4">Asset / Vehicle</th>
                    <th className="px-6 py-4">Associated Trip</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Expense Description</th>
                    <th className="px-6 py-4 text-right">Incidental Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {expenses.map((exp) => (
                    <tr key={exp.expense_id} className="hover:bg-gray-50/50 transition-colors animate-fade-in" id={`expense-row-${exp.expense_id}`}>
                      <td className="px-6 py-4 font-semibold text-gray-900">{exp.expense_date}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold block">{exp.vehicle?.vehicle_name || "General Fleet"}</span>
                        {exp.vehicle?.registration_number && (
                          <span className="font-mono text-[9px] text-gray-400 bg-gray-50 border border-gray-150 px-1 py-0.2 rounded mt-0.5 inline-block">
                            {exp.vehicle?.registration_number}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px]">
                        {exp.trip_id ? `Trip #Manifest-${exp.trip_id.toString().padStart(4, "0")}` : <span className="text-gray-400 italic">No trip tied</span>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 font-bold uppercase tracking-wider text-[9px] rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                          {exp.expense_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={exp.description}>{exp.description}</td>
                      <td className="px-6 py-4 text-right font-bold text-red-600">${exp.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Refill Refuels Modal */}
      {isFuelModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="fuel-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Log Fuel Refill Receipt</h3>
              <button onClick={closeFuelModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleFuelSubmit} className="p-6 space-y-4" id="fuel-log-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Asset Vehicle</label>
                <select
                  required
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="">-- Choose Vehicle --</option>
                  {vehicles.map((v) => (
                    <option key={v.vehicle_id} value={v.vehicle_id}>
                      {v.vehicle_name} ({v.registration_number}) [Odo: {v.current_odometer.toLocaleString()} km]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Associated Dispatch (Optional)</label>
                <select
                  value={associatedTripId}
                  onChange={(e) => setAssociatedTripId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                >
                  <option value="">-- Select Active Trip Manifest --</option>
                  {trips.filter((t) => t.status === "Dispatched").map((t) => (
                    <option key={t.trip_id} value={t.trip_id}>
                      Manifest #{t.trip_id} - {t.source_city} to {t.destination_city} ({t.driver?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Fuel Station</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <Truck className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Chevron #90"
                      value={fuelStation}
                      onChange={(e) => setFuelStation(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Odometer on Refill</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 15302"
                    value={fuelOdometer}
                    onChange={(e) => setFuelOdometer(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Volume Refilled (Liters)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="e.g. 45"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Price per Liter ($)</label>
                  <input
                    type="number"
                    required
                    step="0.001"
                    placeholder="e.g. 1.45"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Transaction Refill Date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={fuelDate}
                    onChange={(e) => setFuelDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeFuelModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createFuelMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-confirm-fuel"
                >
                  {createFuelMutation.isPending ? "Logging..." : "Save Refill Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Incidental Expenses Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in" id="expense-modal">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900 font-sans text-sm">Log Incidental Operational Cost</h3>
              <button onClick={closeExpenseModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleExpenseSubmit} className="p-6 space-y-4" id="expense-log-form">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-xs rounded-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Target Vehicle Asset</label>
                  <select
                    required
                    value={expenseVehicleId}
                    onChange={(e) => setExpenseVehicleId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="">-- Choose Vehicle --</option>
                    {vehicles.map((v) => (
                      <option key={v.vehicle_id} value={v.vehicle_id}>
                        {v.vehicle_name} ({v.registration_number})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Associated Dispatch (Optional)</label>
                  <select
                    value={expenseTripId}
                    onChange={(e) => setExpenseTripId(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="">-- Choose Trip Manifest --</option>
                    {trips.map((t) => (
                      <option key={t.trip_id} value={t.trip_id}>
                        Manifest #{t.trip_id} - {t.source_city} to {t.destination_city}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expense Type</label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="Toll">Toll Fee</option>
                    <option value="Parking">Parking Fee</option>
                    <option value="Lodging">Lodging / Meals</option>
                    <option value="Permit">Road Permits</option>
                    <option value="Fines">Fines / Citations</option>
                    <option value="Other">Other / Incidental</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expense Amount ($)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                      <DollarSign className="h-3.5 w-3.5" />
                    </span>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 45"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Expense date</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                    <Calendar className="h-3.5 w-3.5" />
                  </span>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Cost Description & Receipt Notes</label>
                <textarea
                  required
                  placeholder="e.g. Seattle Interstate Toll payment or overnight driver hotel stay..."
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={closeExpenseModal}
                  className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createExpenseMutation.isPending}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 text-xs font-semibold disabled:opacity-50"
                  id="btn-confirm-expense"
                >
                  {createExpenseMutation.isPending ? "Logging..." : "Save Incidental Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
