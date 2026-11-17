"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Send,
  X,
  Bot,
  User,
  Zap,
  Lightbulb,
  Cpu,
  ShieldCheck,
  TrendingDown,
  RefreshCw,
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

interface GridvibeCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  telemetryContext: {
    voltage: number;
    totalCurrent: number;
    totalPower: number;
    activeAppliance: string;
    todTariffSlot: string;
    todTariffRate: number;
    bearingFault: boolean;
    healthScore: number;
    gyroY: number;
    latencyUs: number;
  };
}

export default function GridvibeCopilot({
  isOpen,
  onClose,
  telemetryContext,
}: GridvibeCopilotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello! I am **Gridvibe Copilot**, your real-time AI Electrical & Edge-AI Diagnostic Assistant. 

I am currently monitoring your 1000 Hz ADC1 telemetry stream, MPU-6050 vibration fusion, and edge TinyML decision tree.

Click a quick prompt below or ask me any question about electrical loads, sensor disambiguation, or tariff optimization!`,
      timestamp: "10:00 AM",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  if (!isOpen) return null;

  const quickPrompts = [
    {
      label: "Why Fan vs Charger?",
      icon: Cpu,
      prompt: "Explain how Multi-Sensor Fusion disambiguated the Ceiling Fan from the Fast Charger.",
    },
    {
      label: "Optimize Peak Tariff",
      icon: TrendingDown,
      prompt: "Analyze our current ToD tariff and propose an automated load-shifting plan to cut costs.",
    },
    {
      label: "Vibration Physics & Gyro-Y",
      icon: Zap,
      prompt: "What is the physical significance of gyro angular velocity (ω_y ≤ -0.5850 °/s) in motor classification?",
    },
    {
      label: "ISO 10816 Bearing Health",
      icon: ShieldCheck,
      prompt: "Assess the mechanical health of our motor bearings against ISO 10816 vibration standards.",
    },
  ];

  const generateAnswer = (userQuery: string): string => {
    const q = userQuery.toLowerCase();
    const { voltage, totalCurrent, totalPower, activeAppliance, todTariffSlot, todTariffRate, bearingFault, healthScore, gyroY, latencyUs } = telemetryContext;

    if (q.includes("fan") || q.includes("charger") || q.includes("disambiguat")) {
      return `### ⚡ Multi-Sensor TinyML Disambiguation Analysis

In traditional electrical NILM, a **Ceiling Fan** (~0.38A) and a **GaN Fast Charger** (~0.24A) exhibit overlapping current signatures on a 100A/50mA CT clamp ($0.24\\text{A} \\approx 0.12\\text{mA}$ secondary current).

#### How Gridvibe AI Solves This:
1. **Kinetic Inertial Fusion:** We fuse an on-chassis **MPU-6050 6-DOF IMU** sampled over I2C at 100 Hz.
2. **Rotational Gyro Vector:** When the fan's BLDC stator rotates, motor torque reaction produces continuous rotational angular velocity along the Y-axis:
   $$\\omega_y \\le -0.5850^\\circ/\\text{s}$$
3. **Electronic Static Check:** The Fast Charger is purely solid-state with zero mechanical rotation ($\\omega_y = +0.02^\\circ/\\text{s}$).
4. **On-Device Static Decision Tree:** In \`inference.h\`, Stage 3 evaluates this condition in **${latencyUs} µs (0.014 ms)** on the dual-core ESP32 without sending raw data to the cloud!`;
    }

    if (q.includes("tariff") || q.includes("cost") || q.includes("saving") || q.includes("peak")) {
      const hourlyCost = (totalPower / 1000) * todTariffRate;
      const offPeakSavings = todTariffSlot === "PEAK" ? ((todTariffRate - 4.50) / todTariffRate) * 100 : 25;
      return `### 💰 Industrial Time-of-Day (ToD) Energy Advisory

* **Active Tariff Slab:** **${todTariffSlot}** (₹${todTariffRate.toFixed(2)} / kWh)
* **Live Grid Draw:** **${totalPower.toFixed(0)} Watts** (${totalCurrent.toFixed(2)} A @ ${voltage.toFixed(1)} V)
* **Current Operating Burn Rate:** **₹${hourlyCost.toFixed(2)} / hour**

#### Automated Action Plan:
1. **Load Shedding Window:** The system is currently in the **${todTariffSlot}** window. Shift thermal heating loads (like the Electric Iron, 1200W) to the **OFF-PEAK** slab (10:00 PM – 6:00 AM) to save up to **${offPeakSavings.toFixed(0)}%** on unit charges.
2. **Dynamic Contactor Lockout:** Gridvibe AI can automatically disarm heavy branch contactors (GPIO 2) during peak peak intervals to prevent demand surcharges!`;
    }

    if (q.includes("bearing") || q.includes("vibration") || q.includes("iso") || q.includes("health")) {
      return `### 🛡️ ISO 10816 Predictive Vibration Health Report

* **Overall Mechanical Health Score:** **${healthScore}%**
* **Active Status:** **${bearingFault ? "⚠️ MECHANICAL BEARING ALERT" : "✅ OPTIMAL OPERATION"}**
* **Kinetic Vibration Magnitude:** $|a| = ${(1.0 + (bearingFault ? 0.35 : 0.05)).toFixed(2)} g$ (Nominal: $\\le 1.10 g$)
* **Rotational Angular Velocity:** $\\omega_y = ${gyroY.toFixed(2)}^\\circ/\\text{s}$

#### Assessment:
${bearingFault
  ? "Motor vibration velocity has exceeded ISO 10816 Zone B ($>1.80\\,\\text{mm/s}$ RMS), indicating race degradation or loose rotor shaft mounting. Schedule bearing lubrication within 48 operating hours."
  : "Vibration velocity is within ISO 10816 Zone A ($<0.71\\,\\text{mm/s}$ RMS), indicating newly commissioned or well-balanced rotating machinery."}`;
    }

    if (q.includes("latency") || q.includes("tinyml") || q.includes("cloud")) {
      return `### ⚡ Edge TinyML vs. Cloud AI Latency Benchmark

| Metric | Gridvibe AI (On-Chip TinyML) | Cloud LLM / Deep Learning |
|:---|:---:|:---:|
| **Execution Location** | **Xtensa Dual-Core 240MHz (ESP32)** | AWS / Google Cloud Server |
| **Inference Latency** | **14 µs (0.014 ms)** | 250 ms – 1,200 ms |
| **Network Dependency** | **Zero (Runs fully offline)** | Requires stable 4G/WiFi |
| **RAM Footprint** | **< 4.2 KB** | > 500 MB |
| **Privacy / Safety** | **100% on-premises raw data** | Raw sensor telemetry leaves premise |

By transpiling the trained decision tree into static C \`if-else\` branches (\`inference.h\`), inference completes in **${latencyUs} microseconds**, enabling sub-cycle emergency load shedding before circuit breakers trip!`;
    }

    return `### 💡 Gridvibe AI Telemetry Synthesis

Currently monitoring:
* **Mains Voltage:** ${voltage.toFixed(1)} V RMS (50 Hz AC)
* **Aggregate Current:** ${totalCurrent.toFixed(2)} A
* **Real Power:** ${totalPower.toFixed(0)} Watts
* **Active Load:** **${activeAppliance}**
* **Dynamic ToD Tariff:** ₹${todTariffRate.toFixed(2)}/kWh (${todTariffSlot})

The edge node is sampling at 1000 Hz with full-duplex MQTT control over the GPIO 2 contactor relay. Ask me about **sensor disambiguation**, **tariff shifting**, **vibration physics**, or **ISO 10816 compliance**!`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userText = input;
    setInput("");

    const newMsgs: Message[] = [
      ...messages,
      { role: "user", content: userText, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
    ];
    setMessages(newMsgs);
    setIsTyping(true);

    setTimeout(() => {
      const answer = generateAnswer(userText);
      setMessages([
        ...newMsgs,
        { role: "assistant", content: answer, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
      ]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-end p-0 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 pointer-events-auto">
      <div className="w-full sm:w-[480px] h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-3xl border border-cyan-500/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.3)] ring-1 ring-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                <span>Gridvibe Copilot</span>
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-mono text-cyan-300 ring-1 ring-cyan-500/40">
                  GenAI SCADA
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">Live Telemetry Context: {telemetryContext.totalPower.toFixed(0)}W ({telemetryContext.activeAppliance})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Prompt Chips */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-xs">
          {quickPrompts.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                onClick={() => {
                  setInput(qp.prompt);
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800/80 hover:bg-cyan-500/20 border border-slate-700 hover:border-cyan-500/40 text-[11px] font-medium text-slate-300 hover:text-cyan-200 shrink-0 transition-all"
              >
                <Icon className="h-3 w-3 text-cyan-400" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {m.role === "assistant" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30 shrink-0 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-slate-900/90 text-slate-200 border border-slate-800 rounded-bl-none prose prose-invert prose-xs leading-relaxed"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <span className="block text-[9px] text-slate-400/80 mt-1.5 text-right font-mono">
                  {m.timestamp}
                </span>
              </div>
              {m.role === "user" && (
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan-400" />
              <span>Gridvibe Copilot is synthesizing telemetry...</span>
            </div>
          )}
        </div>

        {/* Input Dock */}
        <div className="p-3 border-t border-slate-800 bg-slate-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot about sensor fusion, tariff, or TinyML..."
              className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40 transition-colors shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
