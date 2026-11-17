"use client";

import React, { useState } from "react";
import {
  Sliders,
  Play,
  RotateCcw,
  Zap,
  Fan,
  Flame,
  BatteryCharging,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  CheckCircle2,
  X,
  Radio,
} from "lucide-react";

export interface ScenarioPayload {
  name: string;
  description: string;
  voltage_v: number;
  total_current_a: number;
  delta_i_a: number;
  total_power_w: number;
  appliance_states: Record<string, string>;
  appliances: Record<string, { state: string; current_rms_a: number; power_w: number }>;
  imu: {
    accel_x_g: number;
    accel_y_g: number;
    accel_z_g: number;
    gyro_x_dps: number;
    gyro_y_dps: number;
    gyro_z_dps: number;
    vibration_magnitude_g: number;
  };
  ml_inference: {
    predicted_appliance: string;
    confidence: number;
    model: string;
    last_inference_time: string;
  };
  predictive_maintenance: {
    health_score: number;
    anomaly_status: string;
    bearing_fault: boolean;
    vibration_severity: string;
  };
  breaker_status: "ARMED" | "TRIPPED";
}

export const TEST_SCENARIOS: Record<string, ScenarioPayload> = {
  standby: {
    name: "Quiescent Standby (Zero Load)",
    description: "Baseline electrical grid with all appliances switched off. Sub-threshold quiescent state.",
    voltage_v: 230.2,
    total_current_a: 0.04,
    delta_i_a: 0.00,
    total_power_w: 9.2,
    appliance_states: { "Ceiling Fan": "OFF", "Electric Iron": "OFF", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Electric Iron": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.01,
      accel_y_g: 0.02,
      accel_z_g: 1.00,
      gyro_x_dps: 0.01,
      gyro_y_dps: 0.02,
      gyro_z_dps: 0.01,
      vibration_magnitude_g: 1.00,
    },
    ml_inference: {
      predicted_appliance: "Standby",
      confidence: 0.99,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 100,
      anomaly_status: "Optimal Operation",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone A (Good)",
    },
    breaker_status: "ARMED",
  },
  ceiling_fan: {
    name: "Ceiling Fan (Inductive Motor + Vibration)",
    description: "0.38A current jump paired with rotational angular velocity (ω_y = -0.85 °/s). Triggers Motor Fusion.",
    voltage_v: 229.8,
    total_current_a: 0.42,
    delta_i_a: 0.38,
    total_power_w: 87.4,
    appliance_states: { "Ceiling Fan": "ON", "Electric Iron": "OFF", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "ON", current_rms_a: 0.38, power_w: 87 },
      "Electric Iron": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.06,
      accel_y_g: -0.12,
      accel_z_g: 1.04,
      gyro_x_dps: -0.14,
      gyro_y_dps: -0.85,
      gyro_z_dps: 0.22,
      vibration_magnitude_g: 1.05,
    },
    ml_inference: {
      predicted_appliance: "Ceiling Fan",
      confidence: 0.96,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 98,
      anomaly_status: "Motor Running Smoothly",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone A (Good)",
    },
    breaker_status: "ARMED",
  },
  fast_charger: {
    name: "GaN Fast Charger (Solid-State SMPS)",
    description: "0.24A jump with stationary IMU (ω_y = +0.02 °/s). Disambiguated from fan via multi-sensor fusion.",
    voltage_v: 230.1,
    total_current_a: 0.28,
    delta_i_a: 0.24,
    total_power_w: 55.2,
    appliance_states: { "Ceiling Fan": "OFF", "Electric Iron": "OFF", "Fast Charger": "ON" },
    appliances: {
      "Ceiling Fan": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Electric Iron": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Fast Charger": { state: "ON", current_rms_a: 0.24, power_w: 55 },
    },
    imu: {
      accel_x_g: 0.01,
      accel_y_g: 0.01,
      accel_z_g: 1.00,
      gyro_x_dps: 0.01,
      gyro_y_dps: 0.02,
      gyro_z_dps: 0.01,
      vibration_magnitude_g: 1.00,
    },
    ml_inference: {
      predicted_appliance: "Fast Charger",
      confidence: 0.98,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 100,
      anomaly_status: "Optimal Operation",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone A (Good)",
    },
    breaker_status: "ARMED",
  },
  electric_iron: {
    name: "Electric Iron (Heavy Resistive Heating)",
    description: "5.20A thermal current surge (> 2.75A). Bypasses IMU branch; classified directly via electrical jump.",
    voltage_v: 227.4,
    total_current_a: 5.24,
    delta_i_a: 5.20,
    total_power_w: 1192.5,
    appliance_states: { "Ceiling Fan": "OFF", "Electric Iron": "ON", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Electric Iron": { state: "ON", current_rms_a: 5.20, power_w: 1192 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.02,
      accel_y_g: 0.03,
      accel_z_g: 1.01,
      gyro_x_dps: 0.02,
      gyro_y_dps: 0.03,
      gyro_z_dps: 0.01,
      vibration_magnitude_g: 1.01,
    },
    ml_inference: {
      predicted_appliance: "Electric Iron",
      confidence: 0.99,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 95,
      anomaly_status: "High Thermal Demand Active",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone A (Good)",
    },
    breaker_status: "ARMED",
  },
  fan_and_iron: {
    name: "Dual Load: Iron + Ceiling Fan",
    description: "Concurrent multi-load operation (5.58A total). Simultaneous inductive motor and thermal resistive heating.",
    voltage_v: 226.8,
    total_current_a: 5.62,
    delta_i_a: 5.58,
    total_power_w: 1275.6,
    appliance_states: { "Ceiling Fan": "ON", "Electric Iron": "ON", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "ON", current_rms_a: 0.38, power_w: 87 },
      "Electric Iron": { state: "ON", current_rms_a: 5.20, power_w: 1192 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.08,
      accel_y_g: -0.15,
      accel_z_g: 1.06,
      gyro_x_dps: -0.16,
      gyro_y_dps: -0.82,
      gyro_z_dps: 0.24,
      vibration_magnitude_g: 1.07,
    },
    ml_inference: {
      predicted_appliance: "Electric Iron",
      confidence: 0.97,
      model: "TinyML Multi-Load Disaggregator",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 92,
      anomaly_status: "High Concurrent Load",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone B (Acceptable)",
    },
    breaker_status: "ARMED",
  },
  bearing_fault: {
    name: "Mechanical Bearing Anomaly (|a| > 1.2g)",
    description: "Induces mechanical imbalance on motor shaft. Health score drops to 48%, triggering maintenance alarm.",
    voltage_v: 229.5,
    total_current_a: 0.49,
    delta_i_a: 0.45,
    total_power_w: 112.4,
    appliance_states: { "Ceiling Fan": "ON", "Electric Iron": "OFF", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "ON", current_rms_a: 0.45, power_w: 112 },
      "Electric Iron": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.32,
      accel_y_g: -0.44,
      accel_z_g: 1.28,
      gyro_x_dps: -1.24,
      gyro_y_dps: -1.92,
      gyro_z_dps: 0.88,
      vibration_magnitude_g: 1.39,
    },
    ml_inference: {
      predicted_appliance: "Ceiling Fan",
      confidence: 0.93,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 48,
      anomaly_status: "Bearing Race Degradation Alert",
      bearing_fault: true,
      vibration_severity: "ISO 10816 Zone C (Alert / Unsatisfactory)",
    },
    breaker_status: "ARMED",
  },
  breaker_tripped: {
    name: "15A Surge Overload / Contactor Trip",
    description: "Simulates overcurrent trip latch. Contactor snaps to AIR GAP OPEN (─● / ●─) with 0V downstream.",
    voltage_v: 230.0,
    total_current_a: 0.00,
    delta_i_a: 0.00,
    total_power_w: 0.0,
    appliance_states: { "Ceiling Fan": "OFF", "Electric Iron": "OFF", "Fast Charger": "OFF" },
    appliances: {
      "Ceiling Fan": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Electric Iron": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
      "Fast Charger": { state: "OFF", current_rms_a: 0.0, power_w: 0 },
    },
    imu: {
      accel_x_g: 0.0,
      accel_y_g: 0.0,
      accel_z_g: 1.0,
      gyro_x_dps: 0.0,
      gyro_y_dps: 0.0,
      gyro_z_dps: 0.0,
      vibration_magnitude_g: 1.0,
    },
    ml_inference: {
      predicted_appliance: "Standby",
      confidence: 1.0,
      model: "TinyML Decision Tree",
      last_inference_time: "Just now",
    },
    predictive_maintenance: {
      health_score: 100,
      anomaly_status: "Mains Circuit Cut Off",
      bearing_fault: false,
      vibration_severity: "ISO 10816 Zone A (Good)",
    },
    breaker_status: "TRIPPED",
  },
};

interface ScenarioTestbenchProps {
  isOpen: boolean;
  onClose: () => void;
  activeScenarioKey: string | null;
  onSelectScenario: (key: string | null) => void;
}

export default function ScenarioTestbench({
  isOpen,
  onClose,
  activeScenarioKey,
  onSelectScenario,
}: ScenarioTestbenchProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 p-5 sm:p-7 shadow-[0_0_50px_rgba(6,182,212,0.25)] ring-1 ring-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Hardware Testbench & Scenario Injector</span>
                <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-mono text-cyan-300 ring-1 ring-cyan-500/40">
                  Interactive Demo Mode
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Inject real-world electrical load transients and IMU kinetic vectors into the live SCADA telemetry pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Hardware vs Testbench Mode Toggle */}
        <div className="my-5 p-3 rounded-2xl border border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className={`h-4 w-4 ${activeScenarioKey ? "text-amber-400 animate-pulse" : "text-emerald-400"}`} />
            <div>
              <span className="text-xs font-bold text-white block">
                {activeScenarioKey ? `Scenario Active: ${TEST_SCENARIOS[activeScenarioKey]?.name}` : "Live ESP32 Hardware Stream"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {activeScenarioKey ? "Virtual telemetry overriding live stream for demonstration" : "Listening for real-time 1Hz packets from Render backend"}
              </span>
            </div>
          </div>
          {activeScenarioKey && (
            <button
              onClick={() => onSelectScenario(null)}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/20 transition-all shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset to Live Hardware</span>
            </button>
          )}
        </div>

        {/* Scenario Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {Object.entries(TEST_SCENARIOS).map(([key, sc]) => {
            const isSelected = activeScenarioKey === key;
            return (
              <div
                key={key}
                onClick={() => onSelectScenario(key)}
                className={`cursor-pointer p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
                  isSelected
                    ? "border-cyan-500/80 bg-cyan-950/25 ring-2 ring-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.25)]"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {key === "standby" && <Zap className="h-4 w-4 text-slate-400" />}
                    {key === "ceiling_fan" && <Fan className="h-4 w-4 text-sky-400" />}
                    {key === "fast_charger" && <BatteryCharging className="h-4 w-4 text-slate-300" />}
                    {key === "electric_iron" && <Flame className="h-4 w-4 text-amber-400" />}
                    {key === "fan_and_iron" && <Sparkles className="h-4 w-4 text-cyan-400" />}
                    {key === "bearing_fault" && <AlertTriangle className="h-4 w-4 text-rose-400 animate-bounce" />}
                    {key === "breaker_tripped" && <AlertOctagon className="h-4 w-4 text-rose-500" />}
                    <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                      {sc.name}
                    </h4>
                  </div>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/15 px-2 py-0.5 rounded-full ring-1 ring-cyan-500/30">
                      <CheckCircle2 className="h-3 w-3" />
                      INJECTED
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-slate-400 leading-snug mb-2.5">{sc.description}</p>

                {/* Key Metric Tags */}
                <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
                  <span className="rounded bg-black/60 px-2 py-0.5 border border-slate-800">
                    {sc.total_current_a.toFixed(2)} A
                  </span>
                  <span className="rounded bg-black/60 px-2 py-0.5 border border-slate-800">
                    {sc.total_power_w.toFixed(0)} W
                  </span>
                  <span className="rounded bg-black/60 px-2 py-0.5 border border-slate-800 text-cyan-300">
                    ω_y: {sc.imu.gyro_y_dps.toFixed(2)}°/s
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800 text-xs">
          <span className="text-slate-500 font-mono text-[11px]">
            Ready for viva/presentation live demos
          </span>
          <button
            onClick={onClose}
            className="rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-500 hover:to-blue-500 transition-all"
          >
            Apply & Close View
          </button>
        </div>
      </div>
    </div>
  );
}
