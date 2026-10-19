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
} from "lucide-react";

// Permanent Render Cloud Backend Endpoint
const API_URL = "https://nilm-backend.onrender.com/api/status";

// Response interface from the NILM backend
interface ApplianceDetail {
  state: "ON" | "IDLE" | "OFF" | string;
  current_rms_a: number;
  power_w: number;
}

interface BackendStatus {
  timestamp?: string;
  simulation_mode?: boolean;
  mode?: string;
  voltage_v?: number;
  total_current_a?: number;
  total_power_w?: number;
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
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [statusMode, setStatusMode] = useState<string>("Connecting...");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Live Metrics
  const [voltage, setVoltage] = useState(230.0);
  const [totalCurrent, setTotalCurrent] = useState(0.0);
  const [totalPower, setTotalPower] = useState(0.0);
  const [appliances, setAppliances] = useState<Record<string, ApplianceDetail>>({});

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
          ? Date.now() - new Date(rawTimestamp).getTime() < 25000
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

          {/* Connection Status Badge */}
          <div className="flex items-center gap-3">
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
      </main>
    </div>
  );
}
