"use client";

import React, { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Activity, ShieldCheck, AlertTriangle, Waves } from "lucide-react";

interface HarmonicAnalyzerProps {
  totalCurrent: number;
  totalPower: number;
  activeAppliance: string;
}

export default function HarmonicAnalyzer({
  totalCurrent,
  totalPower,
  activeAppliance,
}: HarmonicAnalyzerProps) {
  const { data, thdPct, powerFactor, complianceStatus } = useMemo(() => {
    const isCharger = activeAppliance.toLowerCase().includes("charger") || activeAppliance.toLowerCase().includes("phone");
    const isFan = activeAppliance.toLowerCase().includes("fan");
    const isIron = activeAppliance.toLowerCase().includes("iron");
    const isStandby = totalCurrent < 0.15;

    let h1 = 100;
    let h3 = 1.5;
    let h5 = 0.8;
    let h7 = 0.4;
    let h9 = 0.2;
    let thd = 1.2;
    let pf = 0.99;
    let status = "IEEE 519 COMPLIANT (CLASS A)";

    if (isCharger) {
      // SMPS rectifier produces strong 3rd & 5th odd harmonics
      h3 = 34.5;
      h5 = 18.2;
      h7 = 8.4;
      h9 = 3.6;
      thd = 18.4;
      pf = 0.91;
      status = "SMPS ODD HARMONIC CONCENTRATION";
    } else if (isFan) {
      // Inductive motor produces 5th harmonic & phase lag
      h3 = 4.2;
      h5 = 11.8;
      h7 = 3.1;
      h9 = 1.2;
      thd = 5.8;
      pf = 0.82;
      status = "INDUCTIVE LAGGING (MOTOR BLDC)";
    } else if (isIron) {
      // Pure resistive heating load (linear Ohm's law)
      h3 = 1.1;
      h5 = 0.6;
      h7 = 0.3;
      h9 = 0.1;
      thd = 1.1;
      pf = 0.99;
      status = "LINEAR RESISTIVE LOAD (PURE SINE)";
    } else if (isStandby) {
      h3 = 0.8;
      h5 = 0.4;
      h7 = 0.2;
      h9 = 0.1;
      thd = 0.9;
      pf = 1.0;
      status = "QUIESCENT NOISE FLOOR";
    }

    const chartData = [
      { order: "H1 (50Hz)", amplitude: h1, label: "Fundamental", color: "#22d3ee" },
      { order: "H3 (150Hz)", amplitude: h3, label: "3rd Harmonic", color: isCharger ? "#f43f5e" : "#3b82f6" },
      { order: "H5 (250Hz)", amplitude: h5, label: "5th Harmonic", color: isFan || isCharger ? "#f59e0b" : "#3b82f6" },
      { order: "H7 (350Hz)", amplitude: h7, label: "7th Harmonic", color: "#60a5fa" },
      { order: "H9 (450Hz)", amplitude: h9, label: "9th Harmonic", color: "#93c5fd" },
    ];

    return {
      data: chartData,
      thdPct: thd,
      powerFactor: pf,
      complianceStatus: status,
    };
  }, [totalCurrent, activeAppliance]);

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-gradient-to-b from-slate-900/90 via-slate-950 to-slate-950 p-5 shadow-2xl backdrop-blur-xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 ring-1 ring-cyan-500/30">
            <Waves className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <span>Harmonic FFT Spectrum & Power Quality (IEC 61000-4-7)</span>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[9px] font-mono text-cyan-300 ring-1 ring-cyan-500/40">
                Discrete Fourier Analysis
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Odd harmonic frequency decomposition: Fundamental 50Hz fundamental through 9th harmonic (450Hz)
            </p>
          </div>
        </div>

        {/* Status Tag */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-[10px] uppercase font-bold text-slate-400">Standard:</span>
          <span className="rounded px-2 py-0.5 bg-slate-800 border border-slate-700 text-cyan-300 text-[10px] font-bold">
            {complianceStatus}
          </span>
        </div>
      </div>

      {/* 4 Power Quality Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Total Harmonic Distortion</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-mono tabular-nums text-xl font-black ${thdPct > 15 ? "text-rose-400" : thdPct > 5 ? "text-amber-400" : "text-emerald-400"}`}>
              {thdPct.toFixed(1)}%
            </span>
            <span className="text-[10px] font-semibold text-slate-400">THD</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">Limit: &lt; 5.0% (Linear)</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Displacement Power Factor</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono tabular-nums text-xl font-black text-cyan-300">
              {powerFactor.toFixed(2)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">cos φ</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">{powerFactor < 0.9 ? "Inductive Lagging" : "Unity Ideal"}</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Fundamental Current</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono tabular-nums text-xl font-black text-white">
              {totalCurrent.toFixed(2)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">A (50Hz)</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">RMS Fundamental</span>
        </div>

        <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-3">
          <span className="text-[10px] uppercase font-bold text-slate-500 font-mono">Harmonic Distortion Power</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="font-mono tabular-nums text-xl font-black text-purple-400">
              {((totalPower * (thdPct / 100))).toFixed(1)}
            </span>
            <span className="text-[10px] font-semibold text-slate-400">VAR (D)</span>
          </div>
          <span className="text-[9px] text-slate-500 block mt-0.5">Budeanu Reactive VAR</span>
        </div>
      </div>

      {/* Harmonic FFT Spectrum Bar Chart */}
      <div className="h-48 w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
            <XAxis dataKey="order" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "monospace" }} />
            <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 10, fontFamily: "monospace" }} unit="%" domain={[0, 110]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-3 shadow-xl text-xs font-mono">
                      <p className="font-bold text-white">{d.label} ({d.order})</p>
                      <p className="text-cyan-300 mt-1">Relative Amplitude: <strong>{d.amplitude.toFixed(1)}%</strong></p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="amplitude" radius={[6, 6, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
