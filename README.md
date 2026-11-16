# NILM Edge-to-Cloud Real-Time Web Dashboard

[![Live Production](https://img.shields.io/badge/Production-Live%20on%20Vercel-black.svg)](https://nilm-frontend.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15%2B-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Backend Service](https://img.shields.io/badge/Backend-FastAPI-teal?logo=fastapi)](https://github.com/pushkalgolla-svg/nilm-backend)

A real-time, industrial-grade monitoring interface for an Edge-to-Cloud **Non-Intrusive Load Monitoring (NILM)** system. Fuses high-frequency AC current sensing with edge vibration telemetry to monitor power draw, diagnose active appliances, and visualize TinyML load classifications in real time.

---

## 🌐 Live Deployments & Associated Services

* **Production Dashboard:** [https://nilm-frontend.vercel.app](https://nilm-frontend.vercel.app)
* **Backend API & Health Status:** [https://nilm-backend.onrender.com/health](https://nilm-backend.onrender.com/health)
* **Cloud & Firmware Repositories:**
  * Backend API & TinyML Service: [pushkalgolla-svg/nilm-backend](https://github.com/pushkalgolla-svg/nilm-backend)

---

## 🚀 Key Capabilities

* **Real-Time Telemetry Streaming:** Ingests live RMS electrical current and vibration telemetry from the edge pipeline.
* **Multi-Sensor Appliance Disambiguation:** Displays disambiguated state classifications across multiple household and industrial loads (e.g., distinguishing between an inductive ~60W motor and a ~65W switching power supply).
* **Power Quality & Active Draw Metrics:** Real-time metrics including active wattage, peak current, estimated power costs, and operational duty cycles.
* **Responsive Dark-Themed SCADA Interface:** Built using modern Next.js App Router and Tailwind CSS with sub-second reactive updates.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Function |
| :--- | :--- | :--- |
| **Framework** | Next.js (App Router) | High-performance server and client rendering |
| **Language** | TypeScript | Strong typing across data models and telemetry streams |
| **Styling** | Tailwind CSS & Lucide Icons | Responsive UI design |
| **Integration** | REST & WebSocket | Asynchronous connection to the FastAPI backend |
| **Deployment** | Vercel | Global edge CDN delivery |

---

## 💻 Local Development Setup

### 1. Prerequisites
* Node.js 18.x or later
* npm / pnpm / yarn

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/pushkalgolla-svg/nilm-frontend.git
cd nilm-frontend

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the project root:
```env
NEXT_PUBLIC_API_URL=https://nilm-backend.onrender.com
# For local backend testing:
# NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Production Build
```bash
npm run build
npm run start
```

---

## 👤 Author
**Pushkal Golla** — [GitHub](https://github.com/pushkalgolla-svg) • [LinkedIn](https://www.linkedin.com/in/pushkal-golla/)
