/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  Navigation, 
  Wrench, 
  DollarSign, 
  BarChart3, 
  LogOut, 
  Truck, 
  User as UserIcon,
  ShieldAlert,
  Loader2,
  Sun,
  Moon,
  Bell,
  AlertTriangle,
  AlertCircle,
  X
} from "lucide-react";
import { getUserData, removeAuthToken, removeUserData, apiRequest } from "./lib/api.ts";
import LoginView from "./components/LoginView.tsx";
import DashboardView from "./components/DashboardView.tsx";
import VehiclesView from "./components/VehiclesView.tsx";
import DriversView from "./components/DriversView.tsx";
import TripsView from "./components/TripsView.tsx";
import MaintenanceView from "./components/MaintenanceView.tsx";
import ExpensesView from "./components/ExpensesView.tsx";
import ReportsView from "./components/ReportsView.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

type Tab = "dashboard" | "vehicles" | "drivers" | "trips" | "maintenance" | "expenses" | "reports";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Theme states
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return "light";
  });

  // Compliance alerting states
  const [drivers, setDrivers] = useState<any[]>([]);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);

  useEffect(() => {
    // Check if user and token exist on initial load
    const storedUser = getUserData();
    if (storedUser) {
      setUser(storedUser);
      setIsAuthenticated(true);
    }
    setCheckingAuth(false);
  }, []);

  // Fetch drivers list to process license alerts dynamically
  useEffect(() => {
    if (isAuthenticated) {
      apiRequest("/api/drivers")
        .then((data) => setDrivers(data || []))
        .catch((err) => console.error("Error loading drivers for alert check", err));
    }
  }, [isAuthenticated, activeTab]);

  // Apply theme to HTML tag
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Calculate expired or expiring licenses
  const today = new Date("2026-07-12");
  const expiringLicenses = drivers
    .filter((driver) => {
      if (!driver.license_expiry_date) return false;
      const expiryDate = new Date(driver.license_expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30; // Already expired or expiring in 30 days
    })
    .map((driver) => {
      const expiryDate = new Date(driver.license_expiry_date);
      const diffTime = expiryDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return {
        ...driver,
        daysLeft: diffDays,
        isExpired: diffDays < 0,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft); // soonest/most expired first

  const handleLoginSuccess = () => {
    const storedUser = getUserData();
    setUser(storedUser);
    setIsAuthenticated(true);
    setActiveTab("dashboard");
  };

  const handleLogout = () => {
    removeAuthToken();
    removeUserData();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-900" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Define tab navigation based on roles
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "vehicles", label: "Vehicle Registry", icon: Car },
    { id: "drivers", label: "Operator Directory", icon: Users },
    { id: "trips", label: "Trips & Dispatch", icon: Navigation },
    { id: "maintenance", label: "Maintenance Logs", icon: Wrench },
    { id: "expenses", label: "Expenses & Refills", icon: DollarSign },
    { id: "reports", label: "Profitability Reports", icon: BarChart3 },
  ];

  // Helper to render active panel
  const renderActiveView = () => {
    switch (activeTab) {
      case "dashboard":
        return <DashboardView />;
      case "vehicles":
        return <VehiclesView />;
      case "drivers":
        return <DriversView />;
      case "trips":
        return <TripsView />;
      case "maintenance":
        return <MaintenanceView />;
      case "expenses":
        return <ExpensesView />;
      case "reports":
        return <ReportsView />;
      default:
        return <DashboardView />;
    }
  };

  // Helper to format role name dynamically
  const getRoleName = (roleId: number) => {
    switch (roleId) {
      case 1: return "Fleet Manager";
      case 2: return "Driver";
      case 3: return "Safety Officer";
      case 4: return "Financial Analyst";
      default: return "Operator";
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex bg-gray-50/50 text-gray-800 font-sans" id="app-root">
        
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-gray-200/80 bg-white flex flex-col shrink-0" id="app-sidebar">
          {/* Logo Brand */}
          <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-900 text-white rounded-lg">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight font-sans text-sm">TransitOps</span>
              <span className="text-[10px] text-gray-400 block -mt-0.5">Control Center</span>
            </div>
          </div>

          {/* User Profile Info & RBAC Badge */}
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/30">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 border border-gray-200/50">
                <UserIcon className="h-4.5 w-4.5" />
              </div>
              <div className="overflow-hidden">
                <span className="font-bold text-xs text-gray-900 block truncate">{user?.name}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-0.5 inline-block border border-slate-150">
                  {getRoleName(user?.role_id)}
                </span>
              </div>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" id="sidebar-nav">
            {navItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as Tab)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-100/80"
                  }`}
                  id={`nav-item-${item.id}`}
                >
                  <IconComponent className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Logout Trigger */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/20">
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-gray-500 hover:text-red-600 hover:bg-red-50/60 transition-all"
              id="btn-logout"
            >
              <LogOut className="h-4 w-4" />
              <span>Exit Platform</span>
            </button>
          </div>
        </aside>

        {/* Main Operating Panel */}
        <main className="flex-1 flex flex-col min-w-0" id="main-panel">
          {/* Header Bar */}
          <header className="h-16 border-b border-gray-200/80 bg-white px-8 flex items-center justify-between shrink-0" id="main-header">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-450 font-sans">
              {activeTab === "dashboard" && "Dashboard Analytics"}
              {activeTab === "vehicles" && "Vehicle Asset Inventory"}
              {activeTab === "drivers" && "Operator Compliance List"}
              {activeTab === "trips" && "Transport Route Lifecycle"}
              {activeTab === "maintenance" && "Maintenance Workshop Ticket logs"}
              {activeTab === "expenses" && "Incidental Operational Cost Logs"}
              {activeTab === "reports" && "Financial Profitability Summary"}
            </h2>

            <div className="flex items-center gap-3 text-xs">
              <span className="text-gray-400 font-mono hidden sm:inline">Date: {new Date().toLocaleDateString()}</span>
              
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all cursor-pointer border border-gray-200/50 dark:hover:bg-slate-800 dark:border-slate-800 flex items-center justify-center"
                title={theme === "light" ? "Enable Dark Mode" : "Enable Light Mode"}
                id="btn-theme-toggle"
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4 text-amber-400 animate-pulse" />
                )}
              </button>

              {/* License Alerts Notification Center */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsAlertsOpen(!isAlertsOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-all cursor-pointer border border-gray-200/50 relative dark:hover:bg-slate-800 dark:border-slate-800 flex items-center justify-center"
                  title="Compliance License Alerts"
                  id="btn-alerts-toggle"
                >
                  <Bell className="h-4 w-4" />
                  {expiringLicenses.length > 0 && (
                    <span className="absolute -top-1 -right-1 h-4.5 w-4.5 bg-red-500 text-[8px] font-bold text-white rounded-full flex items-center justify-center animate-pulse" id="alerts-badge">
                      {expiringLicenses.length}
                    </span>
                  )}
                </button>

                {/* Dropdown Card */}
                {isAlertsOpen && (
                  <div className="absolute right-0 mt-2.5 w-80 bg-white border border-gray-200 shadow-xl rounded-xl p-4 z-50 text-left animate-slide-up dark:bg-slate-900 dark:border-slate-800" id="alerts-dropdown">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-2.5 mb-3">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        <span className="font-bold text-gray-900 text-xs uppercase tracking-wider dark:text-white">License Reminders</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsAlertsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {expiringLicenses.length === 0 ? (
                      <div className="py-6 text-center text-gray-400 text-xs">
                        All operator licenses are compliant and active.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {expiringLicenses.map((driver) => (
                          <div 
                            key={driver.driver_id} 
                            className={`p-2 rounded-lg border text-[11px] flex flex-col gap-0.5 transition-all ${
                              driver.isExpired 
                                ? "bg-red-50/50 border-red-100 dark:bg-red-950/20 dark:border-red-900/40" 
                                : "bg-amber-50/50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/40"
                            }`}
                          >
                            <div className="flex items-center justify-between font-semibold">
                              <span className="text-gray-900 dark:text-white truncate max-w-[150px]">{driver.name}</span>
                              <span className={`px-1 rounded text-[9px] font-bold uppercase tracking-wider ${
                                driver.isExpired 
                                  ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-450" 
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-450"
                              }`}>
                                {driver.isExpired ? "Expired" : `${driver.daysLeft}d left`}
                              </span>
                            </div>
                            <div className="text-[10px] text-gray-500 font-mono dark:text-slate-400">
                              No: {driver.license_number} ({driver.license_category})
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3 inline shrink-0" />
                              <span>Expires: {driver.license_expiry_date}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="border-t border-gray-100 dark:border-slate-800 pt-2.5 mt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("drivers");
                          setIsAlertsOpen(false);
                        }}
                        className="w-full text-center py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase dark:bg-blue-600 dark:hover:bg-blue-700 cursor-pointer"
                      >
                        Manage Operators
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Operational Viewport */}
          <div className="flex-1 p-8 overflow-y-auto" id="main-viewport">
            {expiringLicenses.length > 0 && (
              <div className="mb-6 bg-red-50/75 dark:bg-red-950/10 border-l-4 border-l-red-600 border-y border-r border-red-100 dark:border-red-900/40 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm animate-fade-in" id="expiring-licenses-global-alert">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900/30 dark:text-red-400 shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-red-950 dark:text-red-300 text-xs uppercase tracking-wider">Critical Compliance Alert</h4>
                      <span className="bg-red-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        Action Required
                      </span>
                    </div>
                    <p className="text-slate-950 font-medium dark:text-gray-100 text-xs mt-1.5 leading-relaxed">
                      There are <strong className="text-red-600 dark:text-red-400 font-extrabold">{expiringLicenses.length} operators</strong> with expired credentials or licenses expiring within 30 days. Legally, expired operators are restricted from active vehicle dispatch.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 self-end md:self-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab("drivers")}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg tracking-wider transition-all uppercase cursor-pointer shadow-xs whitespace-nowrap"
                  >
                    Resolve Credentials
                  </button>
                </div>
              </div>
            )}
            {renderActiveView()}
          </div>
        </main>

      </div>
    </QueryClientProvider>
  );
}

