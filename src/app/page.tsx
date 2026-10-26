"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  Zap,
  Activity,
  Gauge,
  Power,
  Fan,
  Flame,
  BatteryCharging,
  Cpu,
  Wifi,
  WifiOff,
  Radio,
  Server,
  Eye,
  EyeOff,
  Trash2,
  Waves,
  Compass,
  Coins,
  Leaf,
  ShieldCheck,
  AlertTriangle,
  Download,
  Timer,
  FileSpreadsheet,
  Building2,
  ArrowRight,
} from "lucide-react";

// Permanent Render Cloud Backend Endpoint
const API_URL = "https://nilm-backend.onrender.com/api/status";

// Response interface from the NILM backend
interface ApplianceDetail {
  state: "ON" | "IDLE" | "OFF" | string;
  current_rms_a: number;
  power_w: number;
}

interface IMUData {
  accel_x_g?: number;
  accel_y_g?: number;
  accel_z_g?: number;
  gyro_x_dps?: number;
  gyro_y_dps?: number;
  gyro_z_dps?: number;
  vibration_magnitude_g?: number;
}

interface MLInference {
  predicted_appliance?: string;
  confidence?: number;
  model?: string;
  last_inference_time?: string;
}

interface AnalyticsData {
  energy_kwh?: number;
  cost_inr?: number;
  tariff_rate_inr?: number;
  projected_monthly_inr?: number;
  carbon_kg?: number;
  carbon_g?: number;
}

interface PredictiveMaintenanceData {
  health_score?: number;
  anomaly_status?: string;
  bearing_fault?: boolean;
  vibration_severity?: string;
}

interface EdgeBenchmarkData {
  inference_latency_us?: number;
  ram_usage_kb?: number;
  flash_usage_kb?: number;
  hardware?: string;
  execution_location?: string;
}

interface RecentEvent {
  id: number;
  timestamp: string;
  appliance: string;
  current_a: number;
  delta_i_a: number;
  power_w: number;
  vibration_g: number;
  latency_us: number;
  status: string;
  health_status: string;
}

interface BackendStatus {
  timestamp?: string;
  simulation_mode?: boolean;
  mode?: string;
  voltage_v?: number;
  total_current_a?: number;
  delta_i_a?: number;
  total_power_w?: number;
  imu?: IMUData;
  ml_inference?: MLInference;
  analytics?: AnalyticsData;
  predictive_maintenance?: PredictiveMaintenanceData;
  edge_benchmark?: EdgeBenchmarkData;
  recent_events?: RecentEvent[];
  appliance_states?: Record<string, string>;
  appliances?: Record<string, ApplianceDetail>;
}

interface CustomTooltipProps {
  active?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: readonly any[];
  label?: string | number;
}

// Custom Tooltip for Recharts
function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3.5 shadow-2xl backdrop-blur-md">
        <p className="mb-2 text-xs font-semibold text-slate-400">Time: {label}</p>
        <div className="space-y-1.5">
          {payload.map((entry, index) => (
            <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: entry.color }}>
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}:
              </span>
              <span className="font-mono font-bold text-slate-100">
                {entry.value !== undefined ? `${Number(entry.value).toFixed(2)} A` : "--"}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}

// Meta helper for appliance icons, colors, and descriptions
function getApplianceMeta(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("fan")) {
    return {
      icon: Fan,
      color: "#10b981", // Emerald
      type: "Inductive Motor (BLDC)",
      spinOnActive: true,
    };
  }
  if (lower.includes("iron")) {
    return {
      icon: Flame,
      color: "#f43f5e", // Rose
      type: "Resistive Thermal Heating",
      spinOnActive: false,
    };
  }
  if (lower.includes("charger") || lower.includes("phone")) {
    return {
      icon: BatteryCharging,
      color: "#0ea5e9", // Sky Blue
      type: "GaN SMPS Fast Adapter",
      spinOnActive: false,
    };
  }
  if (lower.includes("refrigerator") || lower.includes("fridge")) {
    return {
      icon: Cpu,
      color: "#06b6d4", // Cyan
      type: "Compressor Duty Cycle",
      spinOnActive: false,
    };
  }
  if (lower.includes("air conditioner") || lower.includes("ac")) {
    return {
      icon: Activity,
      color: "#3b82f6", // Blue
      type: "Heavy Cooling Compressor",
      spinOnActive: false,
    };
  }
  if (lower.includes("microwave")) {
    return {
      icon: Power,
      color: "#f59e0b", // Amber
      type: "Magnetron Pulse Load",
      spinOnActive: false,
    };
  }
  return {
    icon: Zap,
    color: "#a855f7", // Purple
    type: "Disaggregated Load Channel",
    spinOnActive: false,
  };
}

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<"office" | "engineering">("office");
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [statusMode, setStatusMode] = useState<string>("Connecting...");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Live Metrics
  const [voltage, setVoltage] = useState(230.0);
  const [totalCurrent, setTotalCurrent] = useState(0.0);
  const [totalPower, setTotalPower] = useState(0.0);
  const [appliances, setAppliances] = useState<Record<string, ApplianceDetail>>({});
  const [imu, setImu] = useState<IMUData>({
    accel_x_g: 0.0,
    accel_y_g: 0.0,
    accel_z_g: 1.0,
    gyro_x_dps: 0.0,
    gyro_y_dps: 0.0,
    gyro_z_dps: 0.0,
    vibration_magnitude_g: 1.0,
  });
  const [mlInference, setMlInference] = useState<MLInference>({
    predicted_appliance: "Standby",
    confidence: 1.0,
    model: "TinyML ESP32 (inference.h)",
  });
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    energy_kwh: 0.0,
    cost_inr: 0.0,
    tariff_rate_inr: 7.50,
    projected_monthly_inr: 0.0,
    carbon_kg: 0.0,
    carbon_g: 0.0,
  });
  const [maintenance, setMaintenance] = useState<PredictiveMaintenanceData>({
    health_score: 100,
    anomaly_status: "System Idle / Optimal",
    bearing_fault: false,
    vibration_severity: "Normal",
  });
  const [benchmark, setBenchmark] = useState<EdgeBenchmarkData>({
    inference_latency_us: 14,
    ram_usage_kb: 42.6,
    flash_usage_kb: 184.2,
    hardware: "ESP32 Xtensa 240MHz",
    execution_location: "Edge Node (Wokwi on-chip)",
  });
  const [events, setEvents] = useState<RecentEvent[]>([]);

  // Chart Telemetry Points & buffer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [chartData, setChartData] = useState<Array<Record<string, any>>>([]);
  const [bufferSeconds, setBufferSeconds] = useState(30);

  // Hidden traces
  const [hiddenLines, setHiddenLines] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setMounted(true);
  }, []);

  // --------------------------------------------------------------------------
  // Polling Hook: Smooth live stream with pause detection
  // --------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    let lastSeenTimestamp = "";

    const fetchStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(API_URL, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Server responded with HTTP ${res.status}`);
        }

        const data: BackendStatus = await res.json();
        if (!isMounted) return;

        setIsConnected(true);

        const rawTimestamp = data.timestamp || "";
        const isFresh = rawTimestamp
          ? Date.now() - new Date(rawTimestamp).getTime() < 55000
          : false;

        if (isFresh) {
          setStatusMode(data.mode ? `Live (${data.mode})` : "Node Streaming");
        } else if (rawTimestamp) {
          setStatusMode("ESP32 Paused / Idle");
        } else {
          setStatusMode("Waiting for ESP32...");
        }

        const timeStr = rawTimestamp
          ? new Date(rawTimestamp).toLocaleTimeString()
          : new Date().toLocaleTimeString();

        const v = data.voltage_v ?? 230.0;
        const i = data.total_current_a ?? 0.0;
        const p = data.total_power_w ?? Number((v * i).toFixed(1));

        setVoltage(v);
        setTotalCurrent(i);
        setTotalPower(p);
        setLastUpdated(timeStr);

        const appData = data.appliances ?? {};
        setAppliances(appData);

        if (data.imu) {
          setImu(data.imu);
        }
        if (data.ml_inference) {
          setMlInference(data.ml_inference);
        }
        if (data.analytics) {
          setAnalytics(data.analytics);
        }
        if (data.predictive_maintenance) {
          setMaintenance(data.predictive_maintenance);
        }
        if (data.edge_benchmark) {
          setBenchmark(data.edge_benchmark);
        }
        if (data.recent_events && data.recent_events.length > 0) {
          setEvents(data.recent_events);
        }

        // Only append to the live chart when a fresh packet actually arrives from ESP32
        if (rawTimestamp && rawTimestamp !== lastSeenTimestamp) {
          lastSeenTimestamp = rawTimestamp;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const newPoint: Record<string, any> = {
            time: timeStr,
            total: i,
          };

          Object.entries(appData).forEach(([appName, detail]) => {
            newPoint[appName] = detail.current_rms_a ?? 0.0;
          });

          setChartData((prev) => {
            const updated = [...prev, newPoint];
            return updated.slice(-bufferSeconds);
          });
        }
      } catch {
        if (!isMounted) return;
        setIsConnected(false);
        setStatusMode("Connecting to Cloud...");
      }
    };

    fetchStatus();
    const intervalId = setInterval(fetchStatus, 350);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [bufferSeconds]);

  const toggleLineVisibility = (key: string) => {
    setHiddenLines((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClearChart = () => {
    setChartData([]);
  };

  const handleExportCSV = () => {
    const dataToExport = events.length > 0 ? events : [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        appliance: mlInference.predicted_appliance || "Standby",
        current_a: totalCurrent,
        delta_i_a: 0.0,
        power_w: totalPower,
        vibration_g: imu.vibration_magnitude_g || 1.0,
        latency_us: benchmark.inference_latency_us || 14,
        status: totalCurrent >= 0.20 ? "ACTIVE" : "STANDBY",
        health_status: maintenance.anomaly_status || "Optimal"
      }
    ];

    const headers = [
      "Event ID",
      "Timestamp (UTC)",
      "Appliance Detected",
      "Current (A)",
      "Delta-I (A)",
      "Active Power (W)",
      "Vibration (g)",
      "Edge Latency (us)",
      "State",
      "Diagnostic Health Status"
    ];

    const rows = dataToExport.map((ev) => [
      ev.id,
      ev.timestamp,
      `"${ev.appliance}"`,
      ev.current_a,
      ev.delta_i_a,
      ev.power_w,
      ev.vibration_g,
      ev.latency_us,
      ev.status,
      `"${ev.health_status}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `NILM_Audit_Telemetry_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const activeCount = useMemo(() => {
    return Object.values(appliances).filter((a) => a.state === "ON").length;
  }, [appliances]);

  const applianceKeys = useMemo(() => {
    return Object.keys(appliances);
  }, [appliances]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 antialiased">
      {/* Top Navigation / Branding Header */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              {/* Required Student & Project Header */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold tracking-wide text-indigo-300 ring-1 ring-indigo-500/30">
                  Manav Rachna AIoT Project | Golla Pushkal | 2K24ECUN03009
                </span>
                <span className="hidden rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 ring-1 ring-emerald-500/30 sm:inline-block">
                  Live 1Hz Edge Node
                </span>
              </div>
              <h1 className="mt-0.5 text-base font-bold tracking-tight text-white sm:text-lg">
                Non-Intrusive Load Monitoring (NILM) Telemetry Dashboard
              </h1>
            </div>
          </div>

          {/* Mode Switcher + Connection Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
              <button
                onClick={() => setViewMode("office")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                  viewMode === "office"
                    ? "bg-indigo-600 text-white shadow-md font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Simplified view for office staff & facility managers"
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Office View</span>
              </button>
              <button
                onClick={() => setViewMode("engineering")}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${
                  viewMode === "engineering"
                    ? "bg-purple-600 text-white shadow-md font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
                title="Deep diagnostic view with waveforms & TinyML benchmark"
              >
                <Cpu className="h-3.5 w-3.5" />
                <span>Engineering View</span>
              </button>
            </div>

            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-all ${
                isConnected === true
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/30"
                  : isConnected === false
                  ? "bg-rose-500/10 text-rose-400 ring-rose-500/30"
                  : "bg-slate-800 text-slate-400 ring-slate-700"
              }`}
            >
              {isConnected === true ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                  </span>
                  <Wifi className="h-3.5 w-3.5" />
                  <span>{statusMode}</span>
                </>
              ) : isConnected === false ? (
                <>
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{statusMode}</span>
                  <span className="sm:hidden">Offline</span>
                </>
              ) : (
                <>
                  <Server className="h-3.5 w-3.5 animate-pulse" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Container */}
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Offline / Tunnel Waiting Banner */}
        {isConnected === false && (
          <div className="flex flex-col gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2.5">
              <Radio className="h-4 w-4 shrink-0 animate-pulse text-amber-400" />
              <span>
                <strong>Backend / Tunnel Offline:</strong> Attempting connection to{" "}
                <code className="rounded bg-black/40 px-1.5 py-0.5 font-mono text-amber-200">
                  {API_URL}
                </code>
                . Connecting to Render cloud backend...
              </span>
            </div>
            <span className="font-mono text-[11px] text-amber-400/80">Retrying every 1s...</span>
          </div>
        )}

        {viewMode === "office" ? (
          /* ================================================================= */
          /* SIMPLE OFFICE VIEW: Plain English, Glanceable & Actionable        */
          /* ================================================================= */
          <div className="space-y-6">
            {/* 1. Large Glanceable Status Hero Banner */}
            <section
              className={`relative overflow-hidden rounded-3xl border p-6 shadow-xl backdrop-blur-md transition-all ${
                totalCurrent < 0.20
                  ? "border-slate-800 bg-slate-900/60"
                  : appliances["Electric Iron"]?.state === "ON"
                  ? "border-rose-500/40 bg-gradient-to-r from-rose-950/40 via-slate-900/70 to-slate-900/90"
                  : "border-emerald-500/40 bg-gradient-to-r from-emerald-950/40 via-slate-900/70 to-slate-900/90"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                      totalCurrent < 0.20
                        ? "bg-slate-800 text-slate-400 ring-slate-700"
                        : appliances["Electric Iron"]?.state === "ON"
                        ? "bg-rose-500/20 text-rose-400 ring-rose-500/40"
                        : "bg-emerald-500/20 text-emerald-400 ring-emerald-500/40"
                    }`}
                  >
                    {totalCurrent < 0.20 ? (
                      <Power className="h-7 w-7" />
                    ) : appliances["Electric Iron"]?.state === "ON" ? (
                      <Flame className="h-7 w-7" />
                    ) : (
                      <Zap className="h-7 w-7" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${
                          totalCurrent < 0.20
                            ? "bg-slate-800 text-slate-300"
                            : appliances["Electric Iron"]?.state === "ON"
                            ? "bg-rose-500/20 text-rose-300 ring-1 ring-rose-500/40"
                            : "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                        }`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${
                            totalCurrent < 0.20
                              ? "bg-slate-400"
                              : appliances["Electric Iron"]?.state === "ON"
                              ? "animate-ping bg-rose-400"
                              : "bg-emerald-400"
                          }`}
                        />
                        {totalCurrent < 0.20
                          ? "Office Standby / Idle"
                          : appliances["Electric Iron"]?.state === "ON"
                          ? "High Energy Usage Detected"
                          : "Normal Energy Usage"}
                      </span>
                      <span className="text-xs text-slate-400">Updated: {lastUpdated || "--:--:--"}</span>
                    </div>

                    <h2 className="mt-2 text-xl font-bold tracking-tight text-white sm:text-2xl">
                      {totalCurrent < 0.20
                        ? "All Office Equipment is Currently Switched Off"
                        : appliances["Electric Iron"]?.state === "ON"
                        ? "Electric Iron is Currently In Use (Heavy Heating Load)"
                        : appliances["Ceiling Fan"]?.state === "ON"
                        ? "Ceiling Fan is Running (Motor Operating Smoothly)"
                        : "Fast Charger Adapter is Active (Charging Device)"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                      {totalCurrent < 0.20
                        ? "Zero electrical waste detected. The office is in standby mode drawing minimal baseline power."
                        : appliances["Electric Iron"]?.state === "ON"
                        ? `The office is currently drawing ${totalPower.toFixed(0)} Watts of heating power (~₹${((totalPower / 1000) * 7.5).toFixed(2)}/hour). Please ensure the iron is turned off when finished.`
                        : `Current draw is ${totalPower.toFixed(0)} Watts with an operating run cost of ~₹${((totalPower / 1000) * 7.5).toFixed(2)} per hour.`}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center sm:text-right">
                  <div className="text-xs uppercase tracking-wider text-slate-400">Current Run Rate</div>
                  <div className="mt-1 font-mono text-2xl font-extrabold text-white">
                    ₹{((totalPower / 1000.0) * 7.5).toFixed(2)}
                    <span className="text-xs font-semibold text-slate-400 font-sans"> / hour</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {activeCount} active appliance{activeCount !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </section>

            {/* 2. Three Clean Office KPI Cards */}
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {/* Office Electricity Bill Card */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Office Electricity Bill
                  </span>
                  <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-400">
                    <Coins className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                    ₹{(analytics.cost_inr ?? 0).toFixed(2)}
                  </span>
                  <span className="text-xs font-medium text-amber-400">Session Total</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Commercial tariff: ₹7.50 / unit (kWh)</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <span className="text-slate-400">Est. Monthly Bill:</span>
                  <span className="font-mono font-bold text-amber-300">
                    ₹{(analytics.projected_monthly_inr ?? 0).toFixed(0)} / mo
                  </span>
                </div>
              </div>

              {/* Equipment Health & Safety Alert */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Equipment Safety & Health
                  </span>
                  <div
                    className={`rounded-xl p-2.5 ${
                      maintenance.bearing_fault
                        ? "bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/30"
                        : "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30"
                    }`}
                  >
                    {maintenance.bearing_fault ? (
                      <AlertTriangle className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                    {maintenance.health_score ?? 100}%
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      maintenance.bearing_fault ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {maintenance.bearing_fault ? "Inspection Needed" : "Optimal Condition"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400 truncate">
                  {maintenance.bearing_fault
                    ? "Abnormal vibration detected on fan motor."
                    : "Zero electrical faults or mechanical issues detected."}
                </p>
                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-800/80 pt-3 text-xs">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      maintenance.bearing_fault ? "animate-ping bg-rose-400" : "bg-emerald-400"
                    }`}
                  />
                  <span className={maintenance.bearing_fault ? "text-rose-300 font-semibold" : "text-emerald-300"}>
                    {maintenance.bearing_fault
                      ? "Check Ceiling Fan for loose mounting / bearing wear"
                      : "All monitored devices operating within safety limits"}
                  </span>
                </div>
              </div>

              {/* Eco & Carbon Impact */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Office Carbon Footprint
                  </span>
                  <div className="rounded-xl bg-teal-500/10 p-2.5 text-teal-400">
                    <Leaf className="h-5 w-5" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                    {(analytics.carbon_g ?? 0).toFixed(1)}
                  </span>
                  <span className="text-sm font-semibold text-teal-400">g CO₂</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Calculated from total consumed energy</p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-800/80 pt-3 text-xs">
                  <span className="text-slate-400">Efficiency Rating:</span>
                  <span className="font-bold text-teal-300">Grade A (Eco-Friendly)</span>
                </div>
              </div>
            </section>

            {/* 3. Friendly Office Appliance Cards (Plain English) */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    Office Appliances
                  </h3>
                  <p className="text-xs text-slate-400">
                    See what equipment is currently running and what is switched off
                  </p>
                </div>
                <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300">
                  {activeCount} of {applianceKeys.length} Running
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {Object.entries(appliances).map(([name, detail]) => {
                  const meta = getApplianceMeta(name);
                  const IconComponent = meta.icon;
                  const isActive = detail.state === "ON";

                  return (
                    <div
                      key={`office-${name}`}
                      className={`relative overflow-hidden rounded-2xl border p-5 shadow-md backdrop-blur-md transition-all duration-300 ${
                        isActive
                          ? "border-slate-700 bg-slate-900/90 ring-1"
                          : "border-slate-800/70 bg-slate-900/40 opacity-70"
                      }`}
                      style={{
                        borderColor: isActive ? `${meta.color}70` : undefined,
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{
                              backgroundColor: `${meta.color}20`,
                              color: meta.color,
                            }}
                          >
                            <IconComponent
                              className={`h-6 w-6 ${isActive && meta.spinOnActive ? "animate-spin" : ""}`}
                              style={{ animationDuration: "3s" }}
                            />
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base">{name}</h4>
                            <p className="text-xs text-slate-400">
                              {name === "Electric Iron"
                                ? "Heavy Thermal Heating"
                                : name === "Ceiling Fan"
                                ? "Office Room Cooling"
                                : "Laptop / Phone Charger"}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            isActive
                              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {isActive ? "IN USE" : "TURNED OFF"}
                        </span>
                      </div>

                      <div className="mt-5 flex items-baseline justify-between border-t border-slate-800/80 pt-3">
                        <div>
                          <span className="text-[11px] uppercase tracking-wider text-slate-400">Power Draw</span>
                          <div className="font-mono text-xl font-bold text-white">
                            {isActive ? `${(detail.power_w ?? 0).toFixed(0)} Watts` : "0 Watts"}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] uppercase tracking-wider text-slate-400">Cost Rate</span>
                          <div className="font-mono text-xs font-bold" style={{ color: meta.color }}>
                            {isActive ? `~₹${(((detail.power_w ?? 0) / 1000) * 7.5).toFixed(2)}/hr` : "₹0.00"}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 4. Switch to Engineering View Callout Banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-400">
                  <Cpu className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Facility Engineer or Lab Evaluator?</h4>
                  <p className="text-xs text-slate-400">
                    Switch to Engineering View for live waveforms, 3-axis accelerometer vectors, microsecond latency benchmarks, and CSV audit downloads.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewMode("engineering")}
                className="flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-purple-500 active:scale-95 shrink-0"
              >
                <span>Switch to Engineering View</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : (
          /* ================================================================= */
          /* ADVANCED ENGINEERING VIEW: Full Waveforms, IMU, CSV & TinyML Bench*/
          /* ================================================================= */
          <div className="space-y-6">
            {/* Live Metric KPI Cards */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total RMS Current */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Total RMS Current
              </span>
              <div className="rounded-lg bg-indigo-500/10 p-2 text-indigo-400">
                <Zap className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {totalCurrent.toFixed(2)}
              </span>
              <span className="text-sm font-semibold text-indigo-400">A</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Instantaneous mains load</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-500"
                style={{ width: `${Math.min((totalCurrent / 15.0) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Active Total Power */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Active Total Power
              </span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Activity className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {totalPower >= 1000 ? (totalPower / 1000).toFixed(2) : totalPower.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-emerald-400">
                {totalPower >= 1000 ? "kW" : "W"}
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Real power (V_rms × I_rms)</p>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-500"
                style={{ width: `${Math.min((totalPower / 3500.0) * 100, 100)}%` }}
              />
            </div>
          </div>

          {/* Mains Voltage */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Mains Voltage
              </span>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400">
                <Gauge className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {voltage.toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-blue-400">V (RMS)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Nominal 50/60 Hz AC grid</p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>Updated:</span>
              <span className="font-mono text-slate-200">{lastUpdated || "--:--:--"}</span>
            </div>
          </div>

          {/* Active Disaggregated Loads */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Active Loads
              </span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Power className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {activeCount}
              </span>
              <span className="text-sm font-medium text-slate-400">
                / {applianceKeys.length} Monitored
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Disaggregated state status</p>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-indigo-400">
              <Server className="h-3.5 w-3.5" />
              <span>Edge Node Streaming</span>
            </div>
          </div>
        </section>

        {/* Advanced AIoT Analytics, Cost, Carbon & Edge Latency Section */}
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Real-Time Billing & Energy Consumption */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Energy & Live Cost
              </span>
              <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400">
                <Coins className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                ₹{(analytics.cost_inr ?? 0).toFixed(2)}
              </span>
              <span className="text-xs font-semibold text-amber-400 font-mono">
                ({(analytics.energy_kwh ?? 0).toFixed(4)} kWh)
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Slab Tariff: ₹{analytics.tariff_rate_inr ?? 7.50} / kWh</p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5">
              <span>Projected Monthly:</span>
              <span className="font-mono font-bold text-amber-300">
                ₹{(analytics.projected_monthly_inr ?? 0).toFixed(0)} / mo
              </span>
            </div>
          </div>

          {/* Carbon Footprint / Eco Impact */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Carbon Footprint
              </span>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400">
                <Leaf className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {(analytics.carbon_g ?? 0).toFixed(1)}
              </span>
              <span className="text-sm font-semibold text-emerald-400">g CO₂</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Grid factor: 0.82 kg CO₂/kWh</p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-400 border-t border-slate-800/80 pt-2.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Active Carbon Audit Stream</span>
            </div>
          </div>

          {/* Edge TinyML Latency Benchmark */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Edge TinyML Latency
              </span>
              <div className="rounded-lg bg-purple-500/10 p-2 text-purple-400">
                <Timer className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {benchmark.inference_latency_us ?? 14}
              </span>
              <span className="text-sm font-semibold text-purple-400">µs</span>
              <span className="text-[10px] text-slate-500">(0.014 ms)</span>
            </div>
            <p className="mt-1 text-xs text-slate-400">Xtensa Dual-Core 240MHz (ESP32)</p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-purple-300 border-t border-slate-800/80 pt-2.5">
              <span>Zero Cloud Dependency:</span>
              <span className="font-semibold text-purple-400">100% On-Chip</span>
            </div>
          </div>

          {/* Predictive Maintenance & Anomaly Detection */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-lg backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                Predictive Health
              </span>
              <div className={`rounded-lg p-2 ${maintenance.bearing_fault ? "bg-rose-500/10 text-rose-400" : "bg-cyan-500/10 text-cyan-400"}`}>
                {maintenance.bearing_fault ? <AlertTriangle className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold tracking-tight text-white">
                {maintenance.health_score ?? 100}
              </span>
              <span className="text-sm font-semibold text-cyan-400">%</span>
            </div>
            <p className="mt-1 text-xs text-slate-400 truncate" title={maintenance.anomaly_status}>
              {maintenance.anomaly_status ?? "Optimal Operation"}
            </p>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] border-t border-slate-800/80 pt-2.5">
              <span className={`inline-block h-2 w-2 rounded-full ${maintenance.bearing_fault ? "bg-rose-400 animate-ping" : "bg-cyan-400"}`} />
              <span className={maintenance.bearing_fault ? "text-rose-300 font-semibold" : "text-cyan-300"}>
                {maintenance.bearing_fault ? "Mechanical Bearing Alert" : "Sensor Fusion: Verified"}
              </span>
            </div>
          </div>
        </section>

        {/* Dynamic Disaggregated Appliance UI Cards */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Disaggregated Appliance Telemetry
              </h2>
              <p className="text-xs text-slate-400">
                Real-time states and individual draws received from edge node
              </p>
            </div>
            <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-mono text-slate-300">
              {applianceKeys.length} Channels
            </span>
          </div>

          {applianceKeys.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-center text-slate-500">
              <Activity className="mx-auto mb-2 h-6 w-6 animate-pulse text-slate-600" />
              <p className="text-sm">Waiting for appliance telemetry stream from backend...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(appliances).map(([name, detail]) => {
                const meta = getApplianceMeta(name);
                const IconComponent = meta.icon;
                const isActive = detail.state === "ON";

                return (
                  <div
                    key={name}
                    className={`relative overflow-hidden rounded-2xl border p-5 shadow-lg backdrop-blur-md transition-all duration-300 ${
                      isActive
                        ? "border-slate-700/80 bg-slate-900/85 ring-1"
                        : "border-slate-800/80 bg-slate-900/40 opacity-75"
                    }`}
                    style={{
                      borderColor: isActive ? `${meta.color}60` : undefined,
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-xl transition-all"
                          style={{
                            backgroundColor: `${meta.color}20`,
                            color: meta.color,
                          }}
                        >
                          <IconComponent
                            className={`h-6 w-6 ${
                              isActive && meta.spinOnActive ? "animate-spin" : ""
                            }`}
                            style={{ animationDuration: "3s" }}
                          />
                        </div>
                        <div>
                          <h3 className="font-semibold text-white">{name}</h3>
                          <p className="text-[11px] text-slate-400">{meta.type}</p>
                        </div>
                      </div>

                      {/* State Badge */}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          detail.state === "ON"
                            ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
                            : detail.state === "IDLE"
                            ? "bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/40"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {detail.state}
                      </span>
                    </div>

                    {/* Current & Power Readouts */}
                    <div className="mt-5 flex items-baseline justify-between border-t border-slate-800/80 pt-4">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider text-slate-400">Current</span>
                        <div className="flex items-baseline gap-1">
                          <span className="font-mono text-2xl font-bold text-white">
                            {(detail.current_rms_a ?? 0).toFixed(2)}
                          </span>
                          <span className="text-xs font-medium" style={{ color: meta.color }}>
                            A
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400">Power</span>
                        <div className="flex items-baseline justify-end gap-1">
                          <span className="font-mono text-2xl font-bold text-white">
                            {(detail.power_w ?? 0).toFixed(0)}
                          </span>
                          <span className="text-xs font-medium" style={{ color: meta.color }}>
                            W
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* MPU-6050 Accelerometer & Multi-Sensor Fusion Section */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md sm:p-6">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/30">
                <Waves className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    MPU-6050 Multi-Sensor Fusion & Vibration Telemetry
                  </h2>
                  <span className="rounded-md bg-cyan-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan-300 ring-1 ring-cyan-500/30">
                    I2C Node (0x68)
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Fuses Electrical Current (ΔI) with Mechanical Vibration (a_xyz, ω_xyz) for on-chip TinyML classification
                </p>
              </div>
            </div>

            {/* TinyML Edge Inference Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs">
              <Cpu className="h-4 w-4 text-indigo-400" />
              <div className="flex flex-col">
                <span className="text-[10px] uppercase text-slate-400">Active Inference</span>
                <span className="font-semibold text-indigo-300">
                  {mlInference.predicted_appliance ?? "Standby"} ({((mlInference.confidence ?? 1.0) * 100).toFixed(0)}%)
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 3-Axis Accelerometer */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Compass className="h-4 w-4 text-blue-400" />
                  3-Axis Accelerometer
                </span>
                <span className="text-[11px] font-mono text-slate-500">Unit: g (9.81 m/s²)</span>
              </div>
              <div className="space-y-2.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>X-Axis (ax):</span>
                    <span className="font-bold text-white">{(imu.accel_x_g ?? 0).toFixed(3)} g</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(((imu.accel_x_g ?? 0) + 2) / 4, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Y-Axis (ay):</span>
                    <span className="font-bold text-white">{(imu.accel_y_g ?? 0).toFixed(3)} g</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(((imu.accel_y_g ?? 0) + 2) / 4, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Z-Axis (az):</span>
                    <span className="font-bold text-white">{(imu.accel_z_g ?? 1.0).toFixed(3)} g</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(((imu.accel_z_g ?? 1.0) + 2) / 4, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3-Axis Gyroscope */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Activity className="h-4 w-4 text-emerald-400" />
                  3-Axis Gyroscope
                </span>
                <span className="text-[11px] font-mono text-slate-500">Unit: °/s (dps)</span>
              </div>
              <div className="space-y-2.5 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Gyro X (gx):</span>
                    <span className="font-bold text-white">{(imu.gyro_x_dps ?? 0).toFixed(2)} °/s</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(((imu.gyro_x_dps ?? 0) + 250) / 500, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      Gyro Y (gy):
                      <span className="text-[10px] text-amber-400 font-sans" title="Ceiling Fan Trigger Threshold (<= -0.58 °/s)">
                        ★ Fan Trigger
                      </span>
                    </span>
                    <span className={`font-bold ${(imu.gyro_y_dps ?? 0) <= -0.58 ? "text-amber-400" : "text-white"}`}>
                      {(imu.gyro_y_dps ?? 0).toFixed(2)} °/s
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className={`h-full transition-all duration-300 ${(imu.gyro_y_dps ?? 0) <= -0.58 ? "bg-amber-400" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(Math.max(((imu.gyro_y_dps ?? 0) + 250) / 500, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400">
                    <span>Gyro Z (gz):</span>
                    <span className="font-bold text-white">{(imu.gyro_z_dps ?? 0).toFixed(2)} °/s</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${Math.min(Math.max(((imu.gyro_z_dps ?? 0) + 250) / 500, 0), 1) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Resultant Vibration & Motor Status */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-950/50 p-4">
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Waves className="h-4 w-4 text-purple-400" />
                    Vibration Magnitude
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">|a| = √(ax²+ay²+az²)</span>
                </div>

                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-3xl font-extrabold text-white">
                    {(imu.vibration_magnitude_g ?? 1.0).toFixed(3)}
                  </span>
                  <span className="text-sm font-semibold text-purple-400">g</span>
                </div>

                <div className="mt-3">
                  <div className="text-[11px] text-slate-400 mb-1">Mechanical Oscillation State:</div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
                      (imu.gyro_y_dps ?? 0) <= -0.58 || Math.abs((imu.vibration_magnitude_g ?? 1.0) - 1.0) > 0.08
                        ? "bg-amber-500/20 text-amber-300 ring-amber-500/40"
                        : "bg-slate-800/80 text-slate-300 ring-slate-700"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        (imu.gyro_y_dps ?? 0) <= -0.58 || Math.abs((imu.vibration_magnitude_g ?? 1.0) - 1.0) > 0.08
                          ? "animate-ping bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                    />
                    {(imu.gyro_y_dps ?? 0) <= -0.58
                      ? "Ceiling Fan Motor Oscillation"
                      : Math.abs((imu.vibration_magnitude_g ?? 1.0) - 1.0) > 0.08
                      ? "High Mechanical Vibration"
                      : "Low Noise / Static Platform"}
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-slate-800/80 pt-3 text-[11px] text-slate-400">
                <span className="text-slate-300 font-medium">Why IMU fusion matters:</span> Allows TinyML to distinguish between inductive motorized loads (Ceiling Fan) and purely electronic loads (Fast Charger) at matching current draws.
              </div>
            </div>
          </div>
        </section>

        {/* Live Recharts Line Graph Section */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Real-Time Current Draw (RMS Telemetry)
                </h2>
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[11px] font-mono text-indigo-300">
                  {chartData.length} live pts
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live stream visualizer of overall current and estimated individual appliance draws
              </p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Window Selector */}
              <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 p-1 text-xs">
                <span className="px-2 text-slate-400">Window:</span>
                {[15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setBufferSeconds(sec)}
                    className={`rounded px-2 py-1 font-medium transition-colors ${
                      bufferSeconds === sec
                        ? "bg-indigo-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Clear History Button */}
              <button
                onClick={handleClearChart}
                className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1.5 text-xs text-slate-400 transition-colors hover:border-red-500/40 hover:text-red-400"
                title="Clear chart buffer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>
          </div>

          {/* Trace Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
            <span className="text-xs font-semibold text-slate-400">Traces:</span>

            {/* Total Line Toggle */}
            <button
              onClick={() => toggleLineVisibility("total")}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                !hiddenLines["total"]
                  ? "bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/50"
                  : "bg-slate-800/60 text-slate-500 line-through"
              }`}
            >
              {!hiddenLines["total"] ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Total Current
            </button>

            {/* Individual Appliance Line Toggles */}
            {applianceKeys.map((name) => {
              const meta = getApplianceMeta(name);
              const isHidden = hiddenLines[name];

              return (
                <button
                  key={`toggle-${name}`}
                  onClick={() => toggleLineVisibility(name)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    !isHidden
                      ? "ring-1"
                      : "bg-slate-800/60 text-slate-500 line-through"
                  }`}
                  style={{
                    backgroundColor: !isHidden ? `${meta.color}20` : undefined,
                    color: !isHidden ? meta.color : undefined,
                    borderColor: !isHidden ? `${meta.color}60` : undefined,
                  }}
                >
                  {!isHidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  {name}
                </button>
              );
            })}
          </div>

          {/* The Recharts Line Graph */}
          <div className="h-72 w-full sm:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  unit="A"
                  domain={[0, "auto"]}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  content={(props: any) => (
                    <CustomTooltip active={props.active} payload={props.payload} label={props.label} />
                  )}
                />
                <Legend
                  verticalAlign="top"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
                />

                {/* Total Current Line */}
                {!hiddenLines["total"] && (
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Current (RMS)"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#818cf8" }}
                    isAnimationActive={false}
                  />
                )}

                {/* Individual Appliance Lines */}
                {applianceKeys.map((name) => {
                  if (hiddenLines[name]) return null;
                  const meta = getApplianceMeta(name);

                  return (
                    <Line
                      key={`line-${name}`}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={meta.color}
                      strokeWidth={1.75}
                      dot={false}
                      strokeDasharray={name.toLowerCase().includes("fan") || name.toLowerCase().includes("fridge") ? "4 2" : undefined}
                      activeDot={{ r: 4, fill: meta.color }}
                      isAnimationActive={false}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Interactive Event Audit History Table & CSV Export */}
        <section className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-5 shadow-xl backdrop-blur-md sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                    Chronological Event Audit Trail
                  </h2>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300">
                    {events.length} logged events
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Real-time edge event log capturing Delta-I transitions, TinyML inference latency, and diagnostics
                </p>
              </div>
            </div>

            {/* Export CSV Button */}
            <button
              onClick={handleExportCSV}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg transition-all hover:bg-emerald-500 active:scale-95"
            >
              <Download className="h-4 w-4" />
              <span>Export Audit CSV</span>
            </button>
          </div>

          {events.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-800 py-8 text-center text-slate-500">
              <p className="text-xs">No state transition events logged yet. Move the dial in Wokwi to generate events.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-950/50">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-slate-800/80 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Timestamp (UTC)</th>
                    <th className="px-4 py-3">Detected Appliance</th>
                    <th className="px-4 py-3">ΔI Jump</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Power</th>
                    <th className="px-4 py-3">Vibration</th>
                    <th className="px-4 py-3">Edge Latency</th>
                    <th className="px-4 py-3">Diagnostic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {events.slice().reverse().map((ev) => (
                    <tr key={`ev-${ev.id}`} className="transition-colors hover:bg-slate-900/50">
                      <td className="px-4 py-2.5 text-slate-500">{ev.id}</td>
                      <td className="px-4 py-2.5 text-slate-400">
                        {new Date(ev.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-2.5 font-sans font-bold text-white">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          ev.appliance === "Electric Iron"
                            ? "bg-rose-500/20 text-rose-300"
                            : ev.appliance === "Ceiling Fan"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : ev.appliance === "Fast Charger"
                            ? "bg-sky-500/20 text-sky-300"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {ev.appliance}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-indigo-300">{ev.delta_i_a > 0 ? `+${ev.delta_i_a.toFixed(2)}` : ev.delta_i_a.toFixed(2)} A</td>
                      <td className="px-4 py-2.5 text-white">{ev.current_a.toFixed(2)} A</td>
                      <td className="px-4 py-2.5 text-slate-300">{ev.power_w.toFixed(0)} W</td>
                      <td className="px-4 py-2.5 text-purple-300">{ev.vibration_g.toFixed(3)} g</td>
                      <td className="px-4 py-2.5 text-amber-300">{ev.latency_us} µs</td>
                      <td className="px-4 py-2.5 font-sans">
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          ev.health_status.includes("Alert") || ev.health_status.includes("Abnormal")
                            ? "bg-rose-500/15 text-rose-300"
                            : "bg-emerald-500/10 text-emerald-300"
                        }`}>
                          {ev.health_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )}
  </main>
    </div>
  );
}
