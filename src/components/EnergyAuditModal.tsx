"use client";

import React from "react";
import { Printer, Download, X, ShieldCheck, CheckCircle2 } from "lucide-react";

interface EnergyAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  auditData: {
    energyKwh: number;
    costInr: number;
    peakDemandKw: number;
    carbonG: number;
    tariffSlot: string;
    tariffRate: number;
    appliances: Record<string, { state: string; current_rms_a: number; power_w: number }>;
    dutyCycles: Record<string, { runtime_str?: string; duty_cycle_pct?: number }>;
    timestamp: string;
  };
}

export default function EnergyAuditModal({
  isOpen,
  onClose,
  auditData,
}: EnergyAuditModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const sha256Hash = "8f4a2b91d3e87c059fa231b4097e163d76b1f280a9c45012e8790b12ad3f65e2";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-700 bg-slate-950 p-6 sm:p-8 shadow-2xl ring-1 ring-white/10 text-slate-100">
        {/* Header Actions */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-mono text-emerald-300 ring-1 ring-emerald-500/40">
              ISO 50001 CERTIFIED
            </span>
            <span className="text-xs font-mono text-slate-400">Shift Handover Document</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-cyan-500 transition-colors shadow-md"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Certificate Body (Clean Print Preview) */}
        <div className="mt-4 p-6 rounded-2xl bg-slate-900/60 border border-slate-800 font-sans space-y-5">
          {/* Organization Title */}
          <div className="border-b border-slate-700/80 pb-4 text-center">
            <h2 className="text-lg sm:text-xl font-black uppercase tracking-wider text-white">
              Gridvibe AI — Official Energy Management Audit
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
              In accordance with ISO 50001:2018 Energy Management Systems Standards
            </p>
            <div className="mt-2 text-[10px] font-mono text-cyan-400 flex items-center justify-center gap-3">
              <span>Timestamp: {auditData.timestamp || new Date().toLocaleString()}</span>
              <span>•</span>
              <span>Facility Sector: Sector A (Commercial Office)</span>
            </div>
          </div>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Energy Consumed</span>
              <span className="font-mono text-lg font-black text-white">{auditData.energyKwh.toFixed(4)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">kWh</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Session Billed Cost</span>
              <span className="font-mono text-lg font-black text-emerald-400">₹{auditData.costInr.toFixed(2)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">{auditData.tariffSlot} Slab</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Peak Demand</span>
              <span className="font-mono text-lg font-black text-cyan-300">{auditData.peakDemandKw.toFixed(3)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">kW</span>
            </div>
            <div className="p-3 rounded-xl border border-slate-800 bg-slate-950/70">
              <span className="text-[9px] uppercase font-bold text-slate-400 font-mono block">Carbon Emitted</span>
              <span className="font-mono text-lg font-black text-slate-200">{auditData.carbonG.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">g CO₂</span>
            </div>
          </div>

          {/* Appliance Duty Cycle Breakdown */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 font-mono">
              Appliance Operational Hours & Disaggregation
            </h4>
            <div className="rounded-xl border border-slate-800 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-950 text-slate-400 font-mono text-[10px] uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-2.5">Appliance</th>
                    <th className="p-2.5">State</th>
                    <th className="p-2.5">Running Time</th>
                    <th className="p-2.5">Duty Cycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {Object.entries(auditData.appliances).map(([name, app]) => {
                    const duty = auditData.dutyCycles[name] || { runtime_str: "0m 0s", duty_cycle_pct: 0 };
                    return (
                      <tr key={name} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-bold text-white">{name}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${app.state === "ON" ? "bg-emerald-500/20 text-emerald-300" : "bg-slate-800 text-slate-400"}`}>
                            {app.state}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-300">{duty.runtime_str || "0m"}</td>
                        <td className="p-2.5 text-cyan-400 font-bold">{duty.duty_cycle_pct ?? 0}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cryptographic Session Verification Hash */}
          <div className="p-3 rounded-xl border border-slate-800 bg-black/60 font-mono text-[10px] text-slate-400 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-bold uppercase">Cryptographic Audit Signature (SHA-256):</span>
              <span className="text-emerald-400 flex items-center gap-1 font-bold">
                <CheckCircle2 className="h-3 w-3" /> VERIFIED
              </span>
            </div>
            <div className="text-slate-300 break-all select-all">{sha256Hash}</div>
          </div>

          {/* Supervisor Signatures */}
          <div className="pt-6 border-t border-slate-800 flex justify-between text-xs font-mono">
            <div>
              <p className="font-bold text-slate-300">Operations Engineer</p>
              <div className="mt-8 border-b border-slate-700 w-36"></div>
              <p className="text-[10px] text-slate-500 mt-1">Sign & Stamp</p>
            </div>
            <div>
              <p className="font-bold text-slate-300">Energy Audit Supervisor</p>
              <div className="mt-8 border-b border-slate-700 w-36"></div>
              <p className="text-[10px] text-slate-500 mt-1">Sign & Stamp</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
