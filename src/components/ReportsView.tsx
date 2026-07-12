import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  DollarSign, 
  Download, 
  Flame, 
  BarChart3, 
  Activity, 
  Percent, 
  FileSpreadsheet, 
  PieChart as PieIcon, 
  AlertCircle 
} from "lucide-react";
import { apiRequest } from "../lib/api.ts";
import { AnalyticsReport } from "../types.ts";
import { jsPDF } from "jspdf";

export default function ReportsView() {
  const [downloadingCsv, setDownloadingCsv] = useState<string | null>(null);

  // Query: Analytics Report
  const { data: report, isLoading, error } = useQuery<AnalyticsReport>({
    queryKey: ["analyticsReport"],
    queryFn: () => apiRequest("/api/reports/analytics"),
  });

  // Client-Side CSV Exporters
  const downloadCsv = async (entity: "vehicles" | "drivers" | "trips" | "fuel" | "expenses") => {
    setDownloadingCsv(entity);
    try {
      // Fetch full raw dataset for the entity
      const data = await apiRequest(`/api/${entity}`);
      if (!data || data.length === 0) {
        alert("No data available to export.");
        return;
      }

      // Convert json to CSV
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","), // Header row
        ...data.map((row: any) => {
          return headers.map(fieldName => {
            let val = row[fieldName];
            // Format nested objects/dates or escape commas
            if (typeof val === "object" && val !== null) {
              val = val.name || val.registration_number || JSON.stringify(val);
            }
            const stringified = String(val === null || val === undefined ? "" : val);
            const escaped = stringified.replace(/"/g, '""');
            return `"${escaped}"`;
          }).join(",");
        })
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `transitops_${entity}_export_${new Date().toISOString().split("T")[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Failed to export CSV. Please try again.");
    } finally {
      setDownloadingCsv(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20" id="reports-loading">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl flex items-center gap-3" id="reports-error">
        <AlertCircle className="h-5 w-5" />
        <span>Failed to compile profitability reports. Verify your operations database connection.</span>
      </div>
    );
  }

  const { global, vehicles = [], types = [], monthlyChart = [] } = report;

  // Custom high-quality client-side PDF Report generation
  const exportPdfReport = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    // Theme Colors
    const primaryColor = [15, 23, 42]; // Slate 900
    const secondaryColor = [71, 85, 105]; // Slate 600
    const successColor = [16, 185, 129]; // Emerald 500
    const dangerColor = [239, 68, 68]; // Red 500
    const borderLight = [226, 232, 240]; // Slate 200

    // Title / Header Banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 40, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("TRANSITOPS CONTROL CENTER", 15, 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("FLEET OPERATIONAL & PROFITABILITY EXECUTIVE SUMMARY REPORT", 15, 24);
    doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (UTC)`, 15, 29);

    let y = 50;

    // Section 1: Financial Performance
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("1. Financial Executive Summary", 15, y);
    
    y += 2;
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y, 195, y);
    
    y += 8;
    
    // Draw summary boxes (3 columns)
    // Box 1: Revenue
    doc.setFillColor(248, 250, 252); // Light bg
    doc.rect(15, y, 55, 22, "F");
    doc.rect(15, y, 55, 22, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("TOTAL INVOICED REVENUE", 18, y + 5);
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`$${global.revenue.toLocaleString()}`, 18, y + 14);

    // Box 2: Operations Cost
    doc.setFillColor(248, 250, 252);
    doc.rect(77, y, 55, 22, "F");
    doc.rect(77, y, 55, 22, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("OPERATIONAL COST", 80, y + 5);
    doc.setFontSize(13);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(`$${global.operationalCost.toLocaleString()}`, 80, y + 14);

    // Box 3: Net Profit
    doc.setFillColor(15, 23, 42); // dark slate
    doc.rect(139, y, 56, 22, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // light slate
    doc.text("NET LOGISTICS PROFIT", 142, y + 5);
    doc.setFontSize(13);
    if (global.profit >= 0) {
      doc.setTextColor(52, 211, 153); // emerald 400
    } else {
      doc.setTextColor(248, 113, 113); // red 400
    }
    doc.text(`$${global.profit.toLocaleString()}`, 142, y + 14);

    y += 30;

    // Section 2: Fleet Cost Distribution
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("2. Operational Cost Breakdown", 15, y);
    
    y += 2;
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y, 195, y);
    y += 7;

    const breakdownItems = [
      { label: "Fuel Refills & Station Bills", value: global.fuelCost },
      { label: "Workshop Service & Maintenance", value: global.maintenanceCost },
      { label: "Other Incidental Expenses (Tolls, etc.)", value: global.otherCost },
    ];

    breakdownItems.forEach((item) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
      doc.text(item.label, 15, y);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text(`$${item.value.toLocaleString()}`, 150, y);
      y += 6;
    });

    y += 8;

    // Section 3: Asset Performance Table
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3. Vehicle Fleet Asset Profitability Metrics", 15, y);
    
    y += 2;
    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(15, y, 195, y);
    y += 7;

    // Table Header
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.rect(15, y, 180, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("REG NUMBER", 17, y + 5);
    doc.text("NAME / MODEL", 45, y + 5);
    doc.text("FUEL COST", 85, y + 5);
    doc.text("MAINTENANCE", 115, y + 5);
    doc.text("REVENUE", 145, y + 5);
    doc.text("NET ROI", 175, y + 5);

    y += 7;

    // Table Body
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    vehicles.forEach((v, index) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
        // Header for new page
        doc.setFillColor(30, 41, 59);
        doc.rect(15, y, 180, 7, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.text("REG NUMBER", 17, y + 5);
        doc.text("NAME / MODEL", 45, y + 5);
        doc.text("FUEL COST", 85, y + 5);
        doc.text("MAINTENANCE", 115, y + 5);
        doc.text("REVENUE", 145, y + 5);
        doc.text("NET ROI", 175, y + 5);
        y += 7;
        doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setFont("helvetica", "normal");
      }

      // Alternating rows bg
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(15, y, 180, 6, "F");
      }

      doc.text(v.reg, 17, y + 4.5);
      doc.text(v.name.length > 20 ? v.name.substring(0, 18) + ".." : v.name, 45, y + 4.5);
      doc.text(`$${v.fuelCost.toLocaleString()}`, 85, y + 4.5);
      doc.text(`$${v.maintenanceCost.toLocaleString()}`, 115, y + 4.5);
      doc.text(`$${v.revenue.toLocaleString()}`, 145, y + 4.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${v.roi.toFixed(2)}x`, 175, y + 4.5);
      doc.setFont("helvetica", "normal");

      y += 6;
    });

    // Footer on last page
    doc.setFontSize(7);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text("TransitOps Control Center - Confidential Profitability Audit Report", 15, 285);
    doc.text("Page 1 of 1", 185, 285);

    doc.save(`TransitOps_Fleet_Profitability_Report_${new Date().toISOString().split("T")[0]}.pdf`);
  };

  // Colors for charts
  const COLORS = ["#0f172a", "#2563eb", "#10b981", "#f59e0b", "#ef4444"];

  // Pie chart data for operational cost distribution
  const costPieData = [
    { name: "Fuel Cost", value: global.fuelCost, color: "#3b82f6" },
    { name: "Maintenance", value: global.maintenanceCost, color: "#f59e0b" },
    { name: "Other incidentals", value: global.otherCost, color: "#64748b" },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-8 animate-fade-in" id="reports-view-root">
      {/* PDF Executive Export Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-900 text-white rounded-xl p-5 shadow-xs border border-slate-800" id="pdf-report-banner">
        <div>
          <h3 className="font-bold text-sm tracking-wide text-white">Executive Profitability Audit Report</h3>
          <p className="text-xs text-slate-400 mt-0.5">Generate and download a comprehensive, printer-ready PDF dispatch and net profit audit sheet.</p>
        </div>
        <button
          type="button"
          onClick={exportPdfReport}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shrink-0 uppercase"
          id="btn-export-pdf-report"
        >
          <Download className="h-4 w-4" />
          <span>Export PDF Report</span>
        </button>
      </div>

      {/* Financial Executive Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="reports-finance-cards">
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute right-3 top-3 p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Invoiced Revenue</span>
          <h3 className="text-3xl font-bold font-sans text-gray-900 mt-2">${global.revenue.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 mt-2">Aggregated from all completed and active transport routes.</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute right-3 top-3 p-2 bg-red-50 text-red-600 rounded-lg">
            <Activity className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Total Operations Expenditure</span>
          <h3 className="text-3xl font-bold font-sans text-gray-950 mt-2">${global.operationalCost.toLocaleString()}</h3>
          <p className="text-xs text-gray-500 mt-2">Sum of fuel refills, service maintenance invoices, and tolls.</p>
        </div>

        <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs relative overflow-hidden">
          <div className="absolute right-3 top-3 p-2 bg-slate-800 text-emerald-400 rounded-lg border border-slate-700">
            <Percent className="h-5 w-5" />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Logistics Net Profit</span>
          <h3 className={`text-3xl font-bold font-sans mt-2 ${global.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${global.profit.toLocaleString()}
          </h3>
          <p className="text-xs text-slate-400 mt-2">Net operational profit margin post asset depreciation and refills.</p>
        </div>
      </div>

      {/* CSV Data Exporters */}
      <div className="bg-white border border-gray-200/60 rounded-xl p-6 shadow-xs" id="csv-export-panel">
        <h3 className="font-bold text-gray-900 text-sm font-sans mb-1.5 flex items-center gap-2">
          <FileSpreadsheet className="h-4.5 w-4.5 text-slate-700" />
          <span>Operational Registry Exporter</span>
        </h3>
        <p className="text-xs text-gray-500 mb-4">Export raw datasets to standard CSV files for offline spreadsheets, audits, or compliance reports.</p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { id: "vehicles", label: "Fleet Assets" },
            { id: "drivers", label: "Operators" },
            { id: "trips", label: "Route Trips" },
            { id: "fuel", label: "Fuel Logbook" },
            { id: "expenses", label: "Incidental Expenses" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={downloadingCsv !== null}
              onClick={() => downloadCsv(item.id as any)}
              className="px-3 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              id={`csv-export-${item.id}`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>{downloadingCsv === item.id ? "Exporting..." : item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Core Operational Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="reports-charts-grid">
        {/* Monthly Cost vs Revenue Area Chart */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs flex flex-col justify-between" id="chart-monthly-balance">
          <div className="mb-4">
            <h4 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-slate-900" />
              <span>Financial Operating Balance</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Analysis of monthly cargo invoices vs operational expenditures.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyChart}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Legend iconType="circle" />
                <Area type="monotone" dataKey="revenue" name="Invoiced Revenue" stroke="#10b981" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" name="Operational Cost" stroke="#ef4444" fillOpacity={1} fill="url(#colorCost)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ROI comparison by vehicle asset */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs flex flex-col justify-between" id="chart-vehicle-roi">
          <div className="mb-4">
            <h4 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-slate-900" />
              <span>Asset Profitability (ROI Ratio)</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Ratio of Invoiced Revenue / Total Maintenance & Fuel Cost per vehicle.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={vehicles.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="reg" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="roi" name="ROI Ratio (x)" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Distribution Pie Chart */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs flex flex-col justify-between" id="chart-cost-dist">
          <div className="mb-4">
            <h4 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-1.5">
              <PieIcon className="h-4.5 w-4.5 text-slate-900" />
              <span>Operating Costs Allocation</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Breakdown of fuel, workshops, and incidentals.</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {costPieData.length === 0 ? (
              <span className="text-xs text-gray-400 italic">No expense entries logged</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={costPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {costPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Fuel Efficiency bar chart */}
        <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-xs flex flex-col justify-between" id="chart-fuel-efficiency">
          <div className="mb-4">
            <h4 className="font-bold text-gray-900 text-sm font-sans flex items-center gap-1.5">
              <Flame className="h-4.5 w-4.5 text-slate-900" />
              <span>Category Fuel Consumption</span>
            </h4>
            <p className="text-xs text-gray-400 mt-0.5">Liters consumed per 100 km covered across asset classes.</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={types}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="type" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip formatter={(value: number) => `${value.toFixed(1)} L/100km`} />
                <Bar dataKey="efficiency" name="Fuel Rate (L/100km)" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={25} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
