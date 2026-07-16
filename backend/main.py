from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
import uvicorn
import os
import json
import pandas as pd
import traceback
import math
from data_fetcher import ClimateFetcher
from ml_engine import MLEngine
from epw_parser import EPWParser

app = FastAPI(title="ClimaBuild AI")
fetcher = ClimateFetcher()
engine = MLEngine()

def sanitize_for_json(obj):
    """Recursive helper to make everything JSON compliant (replaces NaN/Inf with None)."""
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(v) for v in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
    return obj

@app.on_event("startup")
async def startup_event():
    print("Starting up Energy Prediction Engine...")
    try:
        engine.load_models()
        if not any(engine.models.values()):
            print("No pre-trained models found. Training now (may take a moment)...")
            engine.train_all()
        print("Startup complete. Models ready.")
    except Exception as e:
        print(f"CRITICAL STARTUP ERROR: {e}")
        traceback.print_exc()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Conflict with origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "models_loaded": any(engine.models.values()),
    }

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    trace = traceback.format_exc()
    print(f"GLOBAL ERROR: {exc}\n{trace}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": "Redacted in production for security",
            "message": "Internal Server Error"
        },
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*"
        }
    )

class PredictRequest(BaseModel):
    city: str
    archetype: str
    floor_area_m2: float
    wwr: float
    hvac_type: str
    operating_hours: Optional[float] = 50.0 # hrs/week
    occupancy_density: Optional[float] = 0.1 # ppl/m2
    equipment_load: Optional[float] = 10.0 # W/m2
    orientation: Optional[str] = "South"
    material_overrides: Optional[Dict[str, str]] = None
    property_overrides: Optional[Dict[str, float]] = None
    climate_overrides: Optional[Dict[str, Any]] = None
    model_type: Optional[str] = "XGBoost"

class TelemetryPayload(BaseModel):
    building_id: str
    timestamp: str
    hvac_power_kw: float
    occupancy_count: int
    indoor_temp_c: float
    setpoint_c: float
    window_status: str

@app.post("/telemetry/bms")
async def ingest_bms_telemetry(payload: TelemetryPayload):
    """IoT/BMS Sink mimicking live streaming data sets (e.g. NEST dataset) for MLOps ground truth integration."""
    print(f"TELEMETRY RECEIVED: [{payload.building_id}] Temp: {payload.indoor_temp_c}C, HVAC: {payload.hvac_power_kw}kW")
    # Stub: Save to an offline sink or feature store
    return {"status": "ingested", "processed_at": pd.Timestamp.now().isoformat()}

class LoginRequest(BaseModel):
    password: str

@app.post("/admin/login")
def admin_login(payload: LoginRequest):
    _admin_pass = os.environ.get("ADMIN_PASSWORD", "secure_admin_123")
    if payload.password == _admin_pass:
        return {"status": "success", "token": "admin_session_active"}
    raise HTTPException(status_code=401, detail="Unauthorized - Invalid Password")

@app.get("/admin/logs")
def get_admin_logs():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(backend_dir, "data", "models", "prediction_logs.jsonl")
    if not os.path.exists(log_path):
        return []
    
    logs = []
    try:
        with open(log_path, 'r') as f:
            for line in f.readlines():
                if line.strip():
                    logs.append(json.loads(line.strip()))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read logs: {e}")
    
    return list(reversed(logs))[:50]

@app.post("/admin/logs/clear")
def clear_admin_logs():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    log_path = os.path.join(backend_dir, "data", "models", "prediction_logs.jsonl")
    try:
        if os.path.exists(log_path):
            with open(log_path, 'w') as f:
                f.write("")
        return {"status": "cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear logs: {e}")

@app.post("/admin/retrain")
def force_retrain():
    try:
        engine.train_all()
        return {"status": "success", "metrics": engine.metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {e}")

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ClimaBuild AI - Developer Portal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        sans: ['Inter', 'sans-serif'],
                    },
                    colors: {
                        primary: '#1d4ed8',
                        secondary: '#0d9488',
                        accent: '#ea580c',
                    }
                }
            }
        }
    </script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body {
            background-color: #f8fafc;
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
        .glowing-dot {
            box-shadow: 0 0 10px rgba(13, 148, 136, 0.4);
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(0.9); }
        }
    </style>
</head>
<body class="text-slate-800 font-sans min-h-screen flex flex-col justify-between">
    <nav class="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div class="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                    <i data-lucide="cpu" class="w-4 h-4 text-primary"></i>
                </div>
                <span class="font-bold text-sm tracking-wide text-slate-800">ClimaBuild <span class="text-slate-400">AI</span></span>
            </div>
            
            <div class="flex items-center gap-6">
                <div class="flex items-center gap-2 px-3 py-1 rounded bg-[#0d9488]/10 border border-[#0d9488]/20 text-xs font-bold text-secondary">
                    <span class="w-2 h-2 rounded-full bg-secondary glowing-dot"></span>
                    ONLINE
                </div>
                <button onclick="toggleAdminPanel()" id="nav-admin-btn" class="text-xs font-semibold px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 hover:text-primary transition-all text-slate-600">
                    Admin Portal
                </button>
            </div>
        </div>
    </nav>

    <main class="max-w-[1200px] mx-auto px-6 py-10 w-full flex-grow flex flex-col gap-8">
        
        <div id="status-view" class="space-y-8">
            <div class="space-y-2">
                <h1 class="text-4xl font-extrabold tracking-tight text-slate-900">API Inference Dashboard</h1>
                <p class="text-slate-500 text-sm">Real-time diagnostics and model telemetry endpoints for ClimaBuild AI.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">System State</span>
                        <i data-lucide="activity" class="w-4.5 h-4.5 text-secondary"></i>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Hosting Mode</span>
                            <span class="text-lg font-bold text-slate-800">Local Dev Server</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Active Address</span>
                            <span class="text-sm font-semibold text-primary">http://127.0.0.1:8000</span>
                        </div>
                    </div>
                </div>

                <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Status</span>
                        <i data-lucide="database" class="w-4.5 h-4.5 text-primary"></i>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Pre-trained Models</span>
                            <span class="text-lg font-bold text-slate-800">XGBoost, RF, Ridge</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Continuous Retraining (CT)</span>
                            <span class="text-xs font-semibold text-secondary flex items-center gap-1.5">
                                <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span> Enabled (Active Logs Monitor)
                            </span>
                        </div>
                    </div>
                </div>

                <div class="glass-panel p-6 rounded-2xl flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-4">
                        <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">API Health</span>
                        <i data-lucide="shield-check" class="w-4.5 h-4.5 text-secondary"></i>
                    </div>
                    <div class="space-y-4">
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">FastAPI Lifespan</span>
                            <span class="text-lg font-bold text-slate-800">Operational</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Active Endpoints</span>
                            <span class="text-xs font-semibold text-slate-600">/predict, /fetch_climate, /materials, /health, /upload_epw</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="glass-panel p-8 rounded-2xl space-y-6">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-bold tracking-tight text-slate-800">Active Model Validation Metrics</h3>
                        <p class="text-xs text-slate-500 mt-1">80/20 train/test split — 19-feature physics-informed engineering (v4). Target: R² ≥ 0.80.</p>
                    </div>
                    <button onclick="fetchMetrics()" class="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all shadow-sm" title="Refresh metrics">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                </div>
                <div id="metrics-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div class="flex justify-center py-6 text-slate-400 italic">Loading performance stats...</div>
                </div>
            </div>

            <!-- Live Predict API Tester -->
            <div class="glass-panel p-8 rounded-2xl space-y-6">
                <div>
                    <h3 class="text-xl font-bold tracking-tight text-slate-800">Live Predict API Tester</h3>
                    <p class="text-xs text-slate-500 mt-1">Send a real prediction request to <code class="bg-slate-100 px-1 rounded">/predict</code> and inspect the raw JSON response.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">City</label>
                        <input id="test-city" value="Mumbai, India" class="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-primary text-slate-800">
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Archetype</label>
                        <select id="test-arch" class="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-primary text-slate-800">
                            <option value="office_small">Small Office</option>
                            <option value="office_medium">Medium Office</option>
                            <option value="retail">Retail</option>
                            <option value="healthcare">Healthcare</option>
                        </select>
                    </div>
                    <div class="space-y-1">
                        <label class="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Model</label>
                        <select id="test-model" class="w-full h-9 bg-white border border-slate-200 rounded-lg px-3 text-sm focus:outline-none focus:border-primary text-slate-800">
                            <option value="XGBoost">XGBoost</option>
                            <option value="RandomForest">RandomForest</option>
                            <option value="RidgeRegression">RidgeRegression</option>
                        </select>
                    </div>
                </div>
                <button onclick="runTestPredict()" id="test-predict-btn" class="h-10 bg-primary text-white font-bold text-sm rounded-xl px-6 hover:bg-primary/90 transition-all flex items-center gap-2 shadow-sm">
                    <i data-lucide="zap" class="w-4 h-4"></i> <span id="test-predict-text">Run Test Prediction</span>
                </button>
                <div id="test-predict-result" class="hidden">
                    <div class="flex justify-between items-center mb-2">
                        <span class="text-xs font-bold text-slate-500 uppercase">Response JSON</span>
                        <span id="test-predict-badge" class="text-[10px] font-black px-2 py-0.5 rounded-full bg-secondary/10 text-secondary"></span>
                    </div>
                    <pre id="test-predict-json" class="bg-slate-900 text-green-400 text-xs p-4 rounded-xl overflow-x-auto max-h-64 font-mono leading-relaxed"></pre>
                </div>
            </div>
        </div>

        <div id="admin-login-view" class="max-w-md mx-auto w-full glass-panel p-8 rounded-3xl space-y-6 my-auto hidden">
            <div class="text-center space-y-2">
                <div class="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                    <i data-lucide="lock" class="w-6 h-6 text-primary"></i>
                </div>
                <h2 class="text-2xl font-bold text-slate-900">Admin Portal Authorization</h2>
                <p class="text-xs text-slate-500 leading-relaxed">Please authenticate with your passcode to access MLOps retraining tools and telemetry logs.</p>
            </div>
            
            <div class="space-y-4">
                <div class="space-y-2">
                    <label class="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Admin Passcode</label>
                    <input type="password" id="admin-pass-input" class="w-full h-11 bg-white border border-slate-300 rounded-xl px-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all text-center tracking-[0.2em]" placeholder="••••••••">
                </div>
                <div id="login-error-msg" class="text-xs font-bold text-accent text-center hidden">Invalid credentials, access denied.</div>
                <button onclick="submitLogin()" class="w-full h-11 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm">
                    <i data-lucide="key-round" class="w-4 h-4"></i> Sign In
                </button>
            </div>
        </div>

        <div id="admin-panel-view" class="space-y-10 hidden">
            <div class="flex justify-between items-end">
                <div class="space-y-2">
                    <div class="text-xs font-black text-primary uppercase tracking-[0.3em]">MLOps Center</div>
                    <h2 class="text-4xl font-extrabold tracking-tight text-slate-900">Admin & Continuous Training</h2>
                </div>
                <button onclick="logOut()" class="text-xs font-semibold px-4 py-2 rounded-xl bg-white hover:bg-slate-50 hover:text-accent border border-slate-200 text-slate-600 transition-all flex items-center gap-2 shadow-sm">
                    <i data-lucide="log-out" class="w-3.5 h-3.5"></i> Sign Out
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div class="glass-panel p-8 rounded-3xl space-y-6">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Manual Pipeline Control</h3>
                        <p class="text-xs text-slate-500 mt-1">Force immediate model retraining on current prediction features to deploy weights.</p>
                    </div>
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button onclick="triggerManualRetrain()" id="retrain-btn" class="flex-1 h-12 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm">
                            <i data-lucide="refresh-cw" id="retrain-icon" class="w-4 h-4"></i> 
                            <span id="retrain-text">Force Retrain Pipeline</span>
                        </button>
                        <button onclick="downloadLogsCSV()" class="h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                            <i data-lucide="download" class="w-4 h-4"></i> Export CSV
                        </button>
                        <button onclick="clearTelemetryLogs()" class="h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Clear
                        </button>
                    </div>
                    <div id="last-retrain-info" class="text-xs text-slate-400 font-medium hidden">
                        <i data-lucide="clock" class="w-3 h-3 inline mr-1"></i>
                        Last retrain: <span id="last-retrain-time">—</span>
                    </div>
                </div>

                <div class="glass-panel p-8 rounded-3xl flex flex-col justify-between">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Operational Context</h3>
                        <p class="text-xs text-slate-500 mt-1">Overview of parameters currently used for modeling continuous retraining drift.</p>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-200">
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Retraining Threshold</span>
                            <span class="text-md font-bold text-slate-800">10 Simulated Predictions</span>
                        </div>
                        <div>
                            <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Source Database</span>
                            <span class="text-md font-bold text-slate-800" id="dataset-count-lbl">25015 samples</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="glass-panel p-8 rounded-3xl space-y-6">
                <div class="flex justify-between items-center">
                    <div>
                        <h3 class="text-xl font-bold text-slate-800">Simulation Telemetry Logs</h3>
                        <p class="text-xs text-slate-500 mt-1">Latest simulation prediction runs registered by local users (stored in prediction_logs.jsonl).</p>
                    </div>
                    <button onclick="fetchLogs()" class="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition-all shadow-sm">
                        <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                    </button>
                </div>

                <div class="overflow-x-auto w-full">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                                <th class="py-3 px-4">Timestamp</th>
                                <th class="py-3 px-4">City</th>
                                <th class="py-3 px-4">Archetype</th>
                                <th class="py-3 px-4">WWR</th>
                                <th class="py-3 px-4">HVAC COP</th>
                                <th class="py-3 px-4">Predicted EUI</th>
                            </tr>
                        </thead>
                        <tbody id="logs-table-body" class="divide-y divide-slate-100 text-slate-600 font-medium">
                            <tr>
                                <td colspan="6" class="py-8 text-center text-slate-400 italic">No telemetry logs found. Run simulator to populate.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>

    <footer class="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-400 font-medium mt-auto">
        <div class="max-w-[1400px] mx-auto px-6 flex justify-between items-center">
            <span>© 2026 Climate-aware EUI Prediction System</span>
            <span class="flex items-center gap-1"><i data-lucide="code" class="w-3.5 h-3.5"></i> with <i data-lucide="heart" class="w-3.5 h-3.5 text-accent fill-accent"></i> in India</span>
        </div>
    </footer>
    <script src="/dashboard.js"></script>
</body>
</html>"""

DASHBOARD_JS = """
        const API_BASE = "";
        let activeView = "status";

        function safeCreateIcons() {
            try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
        }

        window.addEventListener('DOMContentLoaded', () => {
            fetchMetrics();
            checkUrlPath();
            safeCreateIcons();
            setTimeout(safeCreateIcons, 800);
        });

        function checkUrlPath() {
            if (window.location.pathname === "/admin") {
                if (localStorage.getItem("admin_session") === "active") {
                    setView("admin");
                } else {
                    setView("login");
                }
            } else {
                setView("status");
            }
        }

        function toggleAdminPanel() {
            if (activeView === "admin" || activeView === "login") {
                setView("status");
                window.history.pushState({}, "", "/");
            } else {
                if (localStorage.getItem("admin_session") === "active") {
                    setView("admin");
                    window.history.pushState({}, "", "/admin");
                } else {
                    setView("login");
                    window.history.pushState({}, "", "/admin");
                }
            }
        }

        function setView(viewName) {
            activeView = viewName;
            document.getElementById("status-view").classList.add("hidden");
            document.getElementById("admin-login-view").classList.add("hidden");
            document.getElementById("admin-panel-view").classList.add("hidden");
            
            const adminBtn = document.getElementById("nav-admin-btn");

            if (viewName === "status") {
                document.getElementById("status-view").classList.remove("hidden");
                adminBtn.innerText = "Admin Portal";
            } else if (viewName === "login") {
                document.getElementById("admin-login-view").classList.remove("hidden");
                adminBtn.innerText = "Simulator Dashboard";
                document.getElementById("admin-pass-input").focus();
            } else if (viewName === "admin") {
                document.getElementById("admin-panel-view").classList.remove("hidden");
                adminBtn.innerText = "Simulator Dashboard";
                fetchLogs();
            }
        }

        function r2Color(r2) {
            if (r2 >= 0.90) return { bar: 'bg-emerald-500', text: 'text-emerald-600', label: 'Excellent' };
            if (r2 >= 0.80) return { bar: 'bg-primary', text: 'text-primary', label: 'Good' };
            if (r2 >= 0.70) return { bar: 'bg-amber-500', text: 'text-amber-600', label: 'Fair' };
            return { bar: 'bg-accent', text: 'text-accent', label: 'Poor' };
        }

        async function fetchMetrics() {
            try {
                const res = await fetch(API_BASE + "/models");
                const data = await res.json();
                
                const grid = document.getElementById("metrics-grid");
                grid.innerHTML = "";

                if (data.metrics) {
                    const accentMap = { XGBoost: 'border-t-primary', RandomForest: 'border-t-secondary', RidgeRegression: 'border-t-accent' };
                    Object.entries(data.metrics).forEach(([modelName, metrics]) => {
                        const r2 = metrics.r2 ?? 0;
                        const c = r2Color(r2);
                        const pct = Math.max(0, Math.min(100, r2 * 100)).toFixed(1);
                        const card = document.createElement("div");
                        card.className = "bg-white p-6 rounded-xl flex flex-col gap-4 border border-slate-200 border-t-2 shadow-sm " + (accentMap[modelName] || 'border-t-slate-400');
                        card.innerHTML = `
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-sm text-slate-800">${modelName}</span>
                                <span class="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">${c.label}</span>
                            </div>
                            <div>
                                <div class="flex justify-between items-baseline mb-1">
                                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black">R² Accuracy</span>
                                    <span class="text-lg font-extrabold ${c.text}">${r2.toFixed(4)}</span>
                                </div>
                                <div class="w-full h-2 rounded-full bg-slate-100">
                                    <div class="h-2 rounded-full ${c.bar} transition-all duration-700" style="width:${pct}%"></div>
                                </div>
                            </div>
                            <div class="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                                <div>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">MAE (kWh/m²)</span>
                                    <span class="text-base font-extrabold text-slate-800">${metrics.mae.toFixed(2)}</span>
                                </div>
                                <div>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Coverage</span>
                                    <span class="text-base font-extrabold text-slate-800">${pct}%</span>
                                </div>
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                }
            } catch (err) {
                document.getElementById("metrics-grid").innerHTML = '<div class="col-span-3 text-center py-6 text-slate-400 text-sm italic">Failed to load metrics — backend may be retraining.</div>';
                console.error("Error loading metrics:", err);
            }
        }

        async function runTestPredict() {
            const btn = document.getElementById("test-predict-btn");
            const textEl = document.getElementById("test-predict-text");
            const resultEl = document.getElementById("test-predict-result");
            const jsonEl = document.getElementById("test-predict-json");
            const badge = document.getElementById("test-predict-badge");

            btn.disabled = true;
            textEl.innerText = "Running…";

            const city = document.getElementById("test-city").value || "Mumbai, India";
            const archetype = document.getElementById("test-arch").value || "office_small";
            const modelType = document.getElementById("test-model").value || "XGBoost";

            const t0 = performance.now();
            try {
                const res = await fetch(API_BASE + "/predict", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        city,
                        archetype,
                        floor_area_m2: 1200,
                        wwr: 0.40,
                        hvac_type: "split_ac",
                        operating_hours: 50.0,
                        occupancy_density: 0.1,
                        equipment_load: 10.0,
                        orientation: "South",
                        model_type: modelType
                    })
                });
                const data = await res.json();
                const ms = (performance.now() - t0).toFixed(0);

                badge.innerText = `${res.status} OK · ${ms} ms`;
                jsonEl.innerText = JSON.stringify(data, null, 2);
                resultEl.classList.remove("hidden");
                safeCreateIcons();
            } catch (err) {
                badge.innerText = "Network Error";
                jsonEl.innerText = String(err);
                resultEl.classList.remove("hidden");
            } finally {
                btn.disabled = false;
                textEl.innerText = "Run Test Prediction";
            }
        }

        async function submitLogin() {
            const passInput = document.getElementById("admin-pass-input");
            const errorMsg = document.getElementById("login-error-msg");
            
            try {
                const res = await fetch(API_BASE + "/admin/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: passInput.value })
                });

                if (res.ok) {
                    localStorage.setItem("admin_session", "active");
                    setView("admin");
                    errorMsg.classList.add("hidden");
                    passInput.value = "";
                } else {
                    errorMsg.classList.remove("hidden");
                }
            } catch (err) {
                console.error("Login connection failed:", err);
                errorMsg.innerText = "API Server unavailable.";
                errorMsg.classList.remove("hidden");
            }
        }

        document.getElementById("admin-pass-input")?.addEventListener("keydown", (e) => {
            if (e.key === "Enter") submitLogin();
        });

        function logOut() {
            localStorage.removeItem("admin_session");
            setView("status");
            window.history.pushState({}, "", "/");
        }

        async function fetchLogs() {
            const tbody = document.getElementById("logs-table-body");
            try {
                const res = await fetch(API_BASE + "/admin/logs");
                const data = await res.json();
                
                tbody.innerHTML = "";

                if (data.length === 0) {
                    tbody.innerHTML = `
                        <tr>
                            <td colspan="6" class="py-8 text-center text-slate-400 italic">No telemetry logs found. Run simulator to populate.</td>
                        </tr>
                    `;
                    document.getElementById("dataset-count-lbl").innerText = "25015 samples";
                    return;
                }

                document.getElementById("dataset-count-lbl").innerText = (25015 + data.length) + " samples";

                data.forEach((log) => {
                    const row = document.createElement("tr");
                    row.className = "hover:bg-slate-50 transition-colors border-b border-slate-100";
                    
                    const dateStr = log.timestamp ? new Date(log.timestamp).toLocaleString("en-IN", { hour12: false }) : "N/A";
                    const copVal = log.hvac_cop !== undefined ? log.hvac_cop.toFixed(2) : "N/A";
                    
                    row.innerHTML = `
                        <td class="py-3 px-4 font-mono text-[10px] text-slate-400">${dateStr}</td>
                        <td class="py-3 px-4 text-slate-800 font-semibold">${log.city || 'Mumbai, India'}</td>
                        <td class="py-3 px-4 uppercase text-[10px] font-black text-primary">${(log.archetype || 'Office').replace('_', ' ')}</td>
                        <td class="py-3 px-4 font-mono font-bold text-slate-600">${log.wwr !== undefined ? (log.wwr * 100).toFixed(0) + '%' : 'N/A'}</td>
                        <td class="py-3 px-4 font-mono text-slate-500">${copVal}</td>
                        <td class="py-3 px-4 font-mono text-secondary font-black">${log.predicted_eui !== undefined ? log.predicted_eui.toFixed(2) : 'N/A'} kWh/m²</td>
                    `;
                    tbody.appendChild(row);
                });
            } catch (err) {
                console.error("Error loading logs:", err);
            }
        }

        async function triggerManualRetrain() {
            const btn = document.getElementById("retrain-btn");
            const icon = document.getElementById("retrain-icon");
            const text = document.getElementById("retrain-text");

            btn.disabled = true;
            btn.classList.add("opacity-50");
            icon.classList.add("animate-spin");
            text.innerText = "Running Retrain Pipeline...";

            try {
                const res = await fetch(API_BASE + "/admin/retrain", { method: "POST" });
                const data = await res.json();
                
                if (res.ok) {
                    const now = new Date().toLocaleString("en-IN", { hour12: false });
                    const infoEl = document.getElementById("last-retrain-info");
                    const timeEl = document.getElementById("last-retrain-time");
                    timeEl.innerText = now;
                    infoEl.classList.remove("hidden");
                    safeCreateIcons();
                    alert("MLOps CT Process Succeeded! Models retrained with 19-feature physics engineering.");
                    fetchMetrics();
                } else {
                    alert("MLOps Retrain error: " + (data.detail || "Retrain pipeline aborted."));
                }
            } catch (err) {
                alert("Server Connection Error: Retrain failed.");
            } finally {
                btn.disabled = false;
                btn.classList.remove("opacity-50");
                icon.classList.remove("animate-spin");
                text.innerText = "Force Retrain Pipeline";
            }
        }

        async function clearTelemetryLogs() {
            if (!confirm("Are you sure you want to clear all operational prediction logs?")) return;
            try {
                const res = await fetch(API_BASE + "/admin/logs/clear", { method: "POST" });
                if (res.ok) {
                    alert("Telemetry logs successfully cleared.");
                    fetchLogs();
                } else {
                    alert("Failed to clear logs.");
                }
            } catch (err) {
                alert("Network error: Clear logs failed.");
            }
        }

        async function downloadLogsCSV() {
            try {
                const res = await fetch(API_BASE + "/admin/logs");
                const data = await res.json();
                if (!data || data.length === 0) { alert("No telemetry logs to export."); return; }
                const keys = Object.keys(data[0]);
                const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "climabuild_telemetry_logs.csv"; a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                alert("Failed to export logs: " + err);
            }
        }
"""

@app.get("/dashboard.js", response_class=HTMLResponse)
async def serve_dashboard_js():
    return HTMLResponse(content=DASHBOARD_JS, media_type="application/javascript")

@app.get("/", response_class=HTMLResponse)
async def root():
    return HTMLResponse(content=DASHBOARD_HTML)

@app.get("/admin", response_class=HTMLResponse)
async def admin_portal():
    return HTMLResponse(content=DASHBOARD_HTML)

@app.get("/materials")
def get_materials():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    materials_path = os.path.join(backend_dir, "data", "materials.csv")
    if not os.path.exists(materials_path):
        from material_db import seed_materials
        seed_materials()
    
    df = pd.read_csv(materials_path)
    records = df.to_dict(orient="records")
    # Robustly replace NaN with None for JSON compliance
    return [{k: (None if pd.isna(v) else v) for k, v in r.items()} for r in records]

@app.get("/cities")
def get_cities():
    # expanded list of 100+ major and tier-2 Indian cities
    cities = [
        "Mumbai, India", "Delhi, India", "Bangalore, India", "Hyderabad, India", "Ahmedabad, India", 
        "Chennai, India", "Kolkata, India", "Surat, India", "Pune, India", "Jaipur, India", 
        "Lucknow, India", "Kanpur, India", "Nagpur, India", "Indore, India", "Thane, India", 
        "Bhopal, India", "Visakhapatnam, India", "Pimpri-Chinchwad, India", "Patna, India", "Vadodara, India",
        "Ghaziabad, India", "Ludhiana, India", "Coimbatore, India", "Agra, India", "Madurai, India", 
        "Nashik, India", "Faridabad, India", "Meerut, India", "Rajkot, India", "Kalyan-Dombivli, India", 
        "Vasai-Virar, India", "Varanasi, India", "Srinagar, India", "Aurangabad, India", "Dhanbad, India", 
        "Amritsar, India", "Navi Mumbai, India", "Allahabad, India", "Ranchi, India", "Howrah, India", 
        "Jabalpur, India", "Gwalior, India", "Vijayawada, India", "Jodhpur, India", "Raipur, India", 
        "Kota, India", "Guwahati, India", "Chandigarh, India", "Solapur, India", "Hubli-Dharwad, India", 
        "Bareilly, India", "Moradabad, India", "Mysore, India", "Gurgaon, India", "Aligarh, India", 
        "Jalandhar, India", "Tiruchirappalli, India", "Bhubaneswar, India", "Salem, India", "Warangal, India", 
        "Mira-Bhayandar, India", "Thiruvananthapuram, India", "Bhiwandi, India", "Saharanpur, India", "Guntur, India", 
        "Amravati, India", "Bikaner, India", "Noida, India", "Jamshedpur, India", "Bhilai, India", 
        "Cuttack, India", "Firozabad, India", "Kochi, India", "Nellore, India", "Bhavnagar, India", 
        "Dehradun, India", "Durgapur, India", "Asansol, India", "Rourkela, India", "Nanded, India", 
        "Kolhapur, India", "Ajmer, India", "Akola, India", "Gulbarga, India", "Jamnagar, India", 
        "Ujjain, India", "Loni, India", "Siliguri, India", "Jhansi, India", "Ulhasnagar, India", 
        "Gangtok, India", "Itanagar, India", "Kohima, India", "Imphal, India", "Aizawl, India"
    ]
    return sanitize_for_json(sorted(cities))

@app.get("/models")
def get_models():
    return {
        "available_models": list(engine.models.keys()),
        "metrics": engine.metrics
    }

@app.get("/fetch_climate")
def get_climate(city: str):
    lat, lon = fetcher.get_lat_lon(city)
    if not lat:
        raise HTTPException(status_code=404, detail="City not found")
    data = fetcher.fetch_climate_data(lat, lon)
    if not data:
        raise HTTPException(status_code=500, detail="Error fetching climate data")
    return sanitize_for_json({"lat": lat, "lon": lon, **data})

@app.post("/upload_epw")
async def upload_epw(file: UploadFile = File(...)):
    if not file.filename.endswith('.epw'):
        raise HTTPException(status_code=400, detail="Invalid file type. Must be an .epw file.")
    try:
        content = (await file.read()).decode('utf-8', errors='replace')
        climate_data = EPWParser.parse_epw_content(content, source_name=file.filename)
        return sanitize_for_json(climate_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse EPW file: {str(e)}")

@app.post("/predict")
def predict(request: PredictRequest):
    # 1. Resolve Climate
    if request.climate_overrides and all(k in request.climate_overrides for k in ['cdd', 'hdd', 'annual_solrad']):
        climate = request.climate_overrides
    else:
        lat, lon = fetcher.get_lat_lon(request.city)
        if not lat:
            raise HTTPException(status_code=404, detail="City not found")
        climate = fetcher.fetch_climate_data(lat, lon)
        if not climate:
             # Fallback to a generic climate if API fails
             climate = {
                 "cdd": 2500,
                 "hdd": 100,
                 "annual_solrad": 5.5,
                 "source": "Fallback (API Timeout)"
             }
    
    # 2. Get Materials
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    materials_path = os.path.join(backend_dir, "data", "materials.csv")
    if not os.path.exists(materials_path):
         from material_db import seed_materials
         seed_materials()
    materials_df = pd.read_csv(materials_path)
    
    # HVAC COP mapping — Indian market literature values
    # Split/Window AC: IS 1391 Part 2 (BEE 3-4★ rated); VRF: ISHRAE Guidelines 2022
    # Central Chiller (VAV): IS 11239 Part 1 — centrifugal/screw chillers, COP 3.5–5.5
    # Evaporative Cooler: apparent COP (fan+pump only); effective in Hot-Dry climates
    cop_map = {
        "Split/Window AC": 2.8,
        "VAV": 4.0,
        "Central Chiller (VAV)": 4.0,
        "Variable Refrigerant Flow (VRF)": 3.8,
        "Evaporative Cooler": 8.0,
    }
    hvac_cop = cop_map.get(request.hvac_type, 3.0)

    # Find material properties (default or overrides)
    def get_material_data(comp_type, name_override=None, climate_data=None):
        if name_override:
            if name_override.startswith("Custom:"):
                return {
                    "name": name_override,
                    "u_value": 0.0,
                    "shgc": 0.0,
                    "embodied_carbon": 0.0,
                    "cost_index": 5
                }
            match = materials_df[materials_df['name'] == name_override]
            if not match.empty:
                return match.iloc[0].to_dict()
        
        # Adaptive Default Fallback — names must exactly match materials.csv
        is_cold = climate_data and climate_data.get('hdd', 0) > 1000
        defaults = {
            "wall":    "XPS Insulated Brick Wall (230+50 mm)" if is_cold else "AAC Block Wall (200 mm)",
            "roof":    "RCC (150 mm) + 100 mm Rockwool Insulation" if is_cold else "RCC Flat Slab (150 mm) \u2014 Baseline",
            "glazing": "Double Glazed Low-E (6/12Ar/6 mm)" if is_cold else "Single Clear Glass (6 mm)",
        }
        match = materials_df[materials_df['name'] == defaults[comp_type]]
        if not match.empty:
            return match.iloc[0].to_dict()
        
        # Hard fallback if even default is missing
        return materials_df[materials_df['component_type'] == comp_type].iloc[0].to_dict()

    wall_data = get_material_data("wall", request.material_overrides.get("wall") if request.material_overrides else None, climate)
    roof_data = get_material_data("roof", request.material_overrides.get("roof") if request.material_overrides else None, climate)
    glazing_data = get_material_data("glazing", request.material_overrides.get("glazing") if request.material_overrides else None, climate)

    u_wall = request.property_overrides.get("u_wall") if request.property_overrides and "u_wall" in request.property_overrides else wall_data['u_value']
    u_roof = request.property_overrides.get("u_roof") if request.property_overrides and "u_roof" in request.property_overrides else roof_data['u_value']
    u_glass = request.property_overrides.get("u_glass") if request.property_overrides and "u_glass" in request.property_overrides else glazing_data['u_value']
    shgc = request.property_overrides.get("shgc") if request.property_overrides and "shgc" in request.property_overrides else glazing_data.get('shgc', 0.82)

    input_data = {
        "floor_area": request.floor_area_m2,
        "wwr": request.wwr,
        "u_wall": u_wall,
        "u_roof": u_roof,
        "u_glass": u_glass,
        "shgc": shgc,
        "cdd": climate['cdd'],
        "hdd": climate['hdd'],
        "solrad": climate['annual_solrad'],
        "hvac_cop": hvac_cop
    }
    
    # 4. Predict
    try:
        prediction = engine.predict(input_data, orientation=request.orientation, model_type=request.model_type)
    except ValueError as ve:
        if "PhysicsBoundError" in str(ve):
            raise HTTPException(status_code=400, detail=str(ve))
        raise ve
        
    # Physics-Informed Hybrid Engine Math
    base_thermal_eui = prediction['predicted_eui']
    
    # 1. Schedule Scaling (Base model trained on ~50 hr/wk office)
    schedule_multiplier = request.operating_hours / 50.0
    scaled_thermal_eui = base_thermal_eui * schedule_multiplier
    
    # 2. Deterministic Plug Loads EUI (kWh/m2/yr)
    # (Watts/m2 * hours/week * 52 weeks) / 1000 = kWh/m2/yr
    plug_eui = (request.equipment_load * request.operating_hours * 52) / 1000.0
    
    # 3. Occupant Metabolic Cooling Load [kWh/m²·yr] — additive, not multiplicative
    #    Metabolic rate for sedentary office/commercial work ≈ 75 W/person (ISO 7730:2005)
    #    kWh/m²·yr = 75 W × density(ppl/m²) × hrs/wk × 52 wks / (1000 W/kW × COP)
    occ_metabolic_eui = (75.0 * request.occupancy_density * request.operating_hours * 52) / (1000.0 * hvac_cop)

    final_eui = scaled_thermal_eui + plug_eui + occ_metabolic_eui
    prediction['predicted_eui'] = final_eui

    # Scale confidence intervals
    interval = prediction.get('prediction_interval', [base_thermal_eui, base_thermal_eui])
    adjusted_interval = [
        round((i * schedule_multiplier) + plug_eui + occ_metabolic_eui, 2)
        for i in interval
    ]
    
    # 5. Recommend
    recommendations = engine.recommend_materials(input_data, materials_df, orientation=request.orientation, model_type=request.model_type)
    for rec in recommendations:
        rec_thermal_eui = rec['predicted_eui']
        rec['predicted_eui'] = round((rec_thermal_eui * schedule_multiplier) + plug_eui + occ_metabolic_eui, 2)
        # Add average cost score from the three materials
        w_cost = materials_df.loc[materials_df['name'] == rec.get('wall', ''), 'cost_index']
        r_cost = materials_df.loc[materials_df['name'] == rec.get('roof', ''), 'cost_index']
        g_cost = materials_df.loc[materials_df['name'] == rec.get('glazing', ''), 'cost_index']
        rec['cost_score'] = round((
            (float(w_cost.iloc[0]) if not w_cost.empty else 5.0) +
            (float(r_cost.iloc[0]) if not r_cost.empty else 5.0) +
            (float(g_cost.iloc[0]) if not g_cost.empty else 5.0)
        ) / 3.0, 1)
    
    # 6. Sensitivity
    raw_sensitivity = engine.get_sensitivity_analysis(input_data, orientation=request.orientation, model_type=request.model_type)
    
    # Scale sensitivity impacts to match the hybrid physics schedule multiplier
    scaling_factor = schedule_multiplier
    sensitivity = {}
    PHYS_CAP = 100.0  # Max credible ±50% single-parameter EUI swing [kWh/m²·yr]
    for param, data in raw_sensitivity.items():
        low_impact  = round(data["low_impact"]  * scaling_factor, 2)
        high_impact = round(data["high_impact"] * scaling_factor, 2)

        if param == "solrad" and (abs(high_impact) < 1.0 or abs(high_impact) > PHYS_CAP):
            # Physics-informed solar sensitivity override
            # ΔEUI_solar = ΔH_solar × WWR × SHGC × 365 × solar_fraction / COP
            # solar_fraction = 0.22 (ASHRAE 90.1 App G; Indian facade orientation correction)
            delta_solrad = input_data['solrad'] * 0.5
            phys_impact  = round(
                (delta_solrad * input_data['wwr'] * input_data['shgc'] * 365.0 * 0.22
                 / input_data.get('hvac_cop', 3.0)) * scaling_factor, 2
            )
            low_impact  = -phys_impact
            high_impact =  phys_impact

        elif param in ("u_wall", "u_roof"):
            # Physics-informed insulation sensitivity override.
            # Tree models cannot reliably learn the interaction u × wall_area_ratio × (cdd+hdd),
            # so we always use the physics formula for U-value sensitivity.
            # ΔEUI_wall  = Δu_wall × (1-WWR) × wall_area_ratio × (CDD+HDD) × 0.024 × 0.55 / COP
            # ΔEUI_roof  = Δu_roof  × (CDD+HDD) × 0.024 × 0.55 / COP
            # Ref: ISO 13790:2008 §7.2; BEE ECBC 2017 Ch. 5
            import math
            _wwr   = input_data.get('wwr', 0.4)
            _cdd   = input_data.get('cdd', 2000)
            _hdd   = input_data.get('hdd', 200)
            _cop   = input_data.get('hvac_cop', 3.0)
            _area  = input_data.get('floor_area', 2000)
            _war   = min(1.5, max(0.25, 30.0 / math.sqrt(float(_area))))
            _delta = input_data[param] * 0.5
            if param == "u_wall":
                phys_impact = round((_delta * (1.0 - _wwr) * _war * (_cdd + _hdd) * 0.024 * 0.55 / _cop) * scaling_factor, 2)
            else:
                phys_impact = round((_delta * (_cdd + _hdd) * 0.024 * 0.55 / _cop) * scaling_factor, 2)
            low_impact  = -phys_impact   # reducing U → less envelope heat gain → lower EUI
            high_impact =  phys_impact   # increasing U → more heat gain → higher EUI

        elif abs(low_impact) > PHYS_CAP or abs(high_impact) > PHYS_CAP:
            # Generic physics cap: ML overfit indicator — scale back proportionally
            scale = PHYS_CAP / max(abs(low_impact), abs(high_impact))
            low_impact  = round(low_impact  * scale, 2)
            high_impact = round(high_impact * scale, 2)

        sensitivity[param] = {
            "low_impact":          low_impact,
            "high_impact":         high_impact,
            "relative_importance": round(abs(high_impact - low_impact), 2)
        }

    # 7. Thermal Comfort (PMV)
    comfort = engine.calculate_pmv(u_wall, u_roof, u_glass, climate['annual_solrad'], climate['cdd'])

    # 8. ECBC Compliance — derive BEE ECBC 2017 zone from NASA POWER climate data
    #    Ref: NBC 2016 Part 8 §3.1; BEE ECBC 2017 Table 1 (climate zone boundaries)
    cdd_val = climate.get('cdd', 2000)
    hdd_val = climate.get('hdd', 200)
    ghi_val = climate.get('annual_solrad', 5.0)
    if hdd_val > 1200:
        ecbc_zone = "Cold"
    elif cdd_val >= 2500 and ghi_val > 5.5:
        ecbc_zone = "Hot-Dry"
    elif cdd_val >= 2500:
        ecbc_zone = "Warm-Humid"
    elif cdd_val <= 1200 and hdd_val <= 1200:
        ecbc_zone = "Temperate"
    else:
        ecbc_zone = "Composite"
    compliance = engine.get_ecbc_compliance(u_wall, u_roof, u_glass, shgc, climate_zone=ecbc_zone)

    # 9. Evidence Panel Construction
    evidence_panel = {
        "prediction_interval": adjusted_interval,
        "shap_drivers": prediction.get('shap_values'),
        "shap_interactions": prediction.get('shap_interactions', []),
        "climate_source_metadata": climate.get('metadata', {}),
        "physics_anomalies_detected": prediction.get('low_confidence', False),
        "overall_confidence": 0.3 if prediction.get('low_confidence') else climate.get('metadata', {}).get('confidence_score', 0.8)
    }
    
    # 10. Dynamic Financials
    # Archetype-specific EUI baselines from BEE Star Rating Programme (2020 Update)
    # Source: BEE (2020). "Energy Performance Standards for Commercial Buildings." MoP, GOI.
    ARCHETYPE_BASELINE_EUI = {
        "office_small":  {"Hot-Dry": 170, "Warm-Humid": 160, "Composite": 155, "Temperate": 110, "Cold": 90},
        "office_medium": {"Hot-Dry": 185, "Warm-Humid": 175, "Composite": 170, "Temperate": 120, "Cold": 100},
        "healthcare":    {"Hot-Dry": 265, "Warm-Humid": 250, "Composite": 245, "Temperate": 180, "Cold": 160},
        "hotel":         {"Hot-Dry": 210, "Warm-Humid": 200, "Composite": 195, "Temperate": 145, "Cold": 130},
        "retail":        {"Hot-Dry": 215, "Warm-Humid": 200, "Composite": 195, "Temperate": 140, "Cold": 120},
    }
    arch_baselines = ARCHETYPE_BASELINE_EUI.get(request.archetype, {})
    baseline_eui = float(arch_baselines.get(ecbc_zone, 180.0))
    annual_savings_inr = max(0, (baseline_eui - final_eui)) * request.floor_area_m2 * 9.0

    # Operational CO₂ — CEA (2022). "CO2 Baseline Database for Indian Power Sector." Version 18.0.
    # National grid emission factor (FY2021-22): 0.82 kgCO2/kWh  (CEA 2022)
    CO2_GRID_FACTOR = 0.82
    co2_intensity_kg_m2_yr = round(final_eui * CO2_GRID_FACTOR, 1)
    co2_total_tonnes_yr   = round(co2_intensity_kg_m2_yr * request.floor_area_m2 / 1000.0, 2)

    current_cost_score = round((
        float(wall_data.get('cost_index', 5)) +
        float(roof_data.get('cost_index', 5)) +
        float(glazing_data.get('cost_index', 5))
    ) / 3.0, 1)

    # Enrich climate_summary with display fields (zone, location, peak temp)
    if climate is not None:
        climate["climate_zone"]     = ecbc_zone
        climate["location"]         = request.city
        climate["peak_summer_temp"] = climate.get("peak_summer_temp", round(max(climate.get("monthly_temps") or [30.0]), 1))
    
    # Add EUI threshold and pass/fail to compliance dict
    # EUI performance-path equivalents — derived from BEE Star Rating Programme (2020)
    # and ECBC 2017 §6 whole-building performance compliance path.
    # These are NOT direct table values from ECBC 2017 prescriptive path; they represent
    # the estimated whole-building EUI consistent with BEE 3-4★ performance for each zone.
    # Sources: BEE (2020) Star Rating for Commercial Buildings; ECBC 2017 §6; BEE (2014) Table 3.1.
    ecbc_eui_thresholds = {
        "office_small":  {"Hot-Dry": 120, "Warm-Humid": 110, "Composite": 105, "Temperate": 85,  "Cold": 75},
        "office_medium": {"Hot-Dry": 130, "Warm-Humid": 120, "Composite": 115, "Temperate": 95,  "Cold": 85},
        "healthcare":    {"Hot-Dry": 200, "Warm-Humid": 190, "Composite": 185, "Temperate": 140, "Cold": 130},
        "hotel":         {"Hot-Dry": 160, "Warm-Humid": 150, "Composite": 145, "Temperate": 110, "Cold": 100},
        "retail":        {"Hot-Dry": 165, "Warm-Humid": 155, "Composite": 150, "Temperate": 110, "Cold": 100},
    }
    eui_threshold = ecbc_eui_thresholds.get(request.archetype, {}).get(ecbc_zone, 130)
    if compliance:
        compliance["threshold"] = eui_threshold
        compliance["eui_pass"]  = bool(final_eui <= eui_threshold)

    # Best-case annual savings: savings from adopting the top recommendation vs current design
    best_rec_eui = recommendations[0].get("predicted_eui", final_eui) if recommendations else final_eui
    best_case_savings = max(0, (baseline_eui - best_rec_eui)) * request.floor_area_m2 * 9.0
    annual_savings_inr = max(annual_savings_inr, best_case_savings)

    response = {
        "predicted_eui": float(final_eui),
        "baseline_eui": float(baseline_eui),
        "annual_savings_inr": float(annual_savings_inr),
        "co2_intensity_kg_m2_yr": co2_intensity_kg_m2_yr,
        "co2_total_tonnes_yr": co2_total_tonnes_yr,
        "current_cost_score": current_cost_score,
        "evidence_panel": evidence_panel,
        "adjusted_solrad": prediction.get('adjusted_solrad'),
        "model_metrics": prediction.get('model_metrics', {}),
        "sensitivity_analysis": sensitivity,
        "thermal_comfort": comfort,
        "ecbc_compliance": compliance,
        "top_material_recommendations": recommendations,
        "climate_summary": climate,
        "material_sources": {
            "wall": {"name": wall_data['name'], "citation": wall_data.get('source_citation'), "ref": wall_data.get('official_ref'), "url": wall_data.get('source_url'), "carbon": float(wall_data.get('embodied_carbon', 0))},
            "roof": {"name": roof_data['name'], "citation": roof_data.get('source_citation'), "ref": roof_data.get('official_ref'), "url": roof_data.get('source_url'), "carbon": float(roof_data.get('embodied_carbon', 0))},
            "glazing": {"name": glazing_data['name'], "citation": glazing_data.get('source_citation'), "ref": glazing_data.get('official_ref'), "url": glazing_data.get('source_url'), "carbon": float(glazing_data.get('embodied_carbon', 0))}
        }
    }
    return sanitize_for_json(response)

@app.post("/optimize")
def optimize_endpoint(request: PredictRequest):
    # 1. Resolve Climate
    if request.climate_overrides and all(k in request.climate_overrides for k in ['cdd', 'hdd', 'annual_solrad']):
        climate = request.climate_overrides
    else:
        lat, lon = fetcher.get_lat_lon(request.city)
        if not lat:
            raise HTTPException(status_code=404, detail="City not found")
        climate = fetcher.fetch_climate_data(lat, lon)
        if not climate:
            climate = { "cdd": 2500, "hdd": 100, "annual_solrad": 5.5, "source": "Fallback" }

    input_data = {
        "floor_area": request.floor_area_m2,
        "operating_hours": request.operating_hours,
        "occupancy_density": request.occupancy_density,
        "equipment_load": request.equipment_load,
        "cdd": climate['cdd'],
        "hdd": climate['hdd'],
        "solrad": climate['annual_solrad'],
        "orientation": request.orientation,
    }

    try:
        results = engine.optimize_design(input_data, n_samples=5000)
        return sanitize_for_json(results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class CompareRequest(BaseModel):
    city_a: str
    city_b: str
    archetype: str
    floor_area_m2: float
    wwr: float
    hvac_type: str
    operating_hours: Optional[float] = 50.0
    occupancy_density: Optional[float] = 0.1
    equipment_load: Optional[float] = 10.0
    orientation: Optional[str] = "South"
    model_type: Optional[str] = "XGBoost"
    climate_overrides_a: Optional[Dict[str, Any]] = None
    climate_overrides_b: Optional[Dict[str, Any]] = None

@app.post("/compare")
def compare_cities(request: CompareRequest):
    """
    Runs two identical building simulations for different cities and returns
    a side-by-side comparison — designed for research paper city-comparison analysis.
    """
    results = {}
    for label, city in [("city_a", request.city_a), ("city_b", request.city_b)]:
        pred_req = PredictRequest(
            city=city,
            archetype=request.archetype,
            floor_area_m2=request.floor_area_m2,
            wwr=request.wwr,
            hvac_type=request.hvac_type,
            operating_hours=request.operating_hours,
            occupancy_density=request.occupancy_density,
            equipment_load=request.equipment_load,
            orientation=request.orientation,
            model_type=request.model_type,
            climate_overrides=request.climate_overrides_a if label == "city_a" else request.climate_overrides_b,
        )
        results[label] = predict(pred_req)
    
    # Compute delta metrics
    eui_a = results["city_a"]["predicted_eui"]
    eui_b = results["city_b"]["predicted_eui"]
    co2_a = results["city_a"]["co2_intensity_kg_m2_yr"]
    co2_b = results["city_b"]["co2_intensity_kg_m2_yr"]
    savings_a = results["city_a"]["annual_savings_inr"]
    savings_b = results["city_b"]["annual_savings_inr"]
    
    delta = {
        "eui_diff": round(eui_a - eui_b, 2),
        "eui_pct_diff": round(((eui_a - eui_b) / max(eui_b, 1)) * 100, 1),
        "co2_diff_kg_m2": round(co2_a - co2_b, 2),
        "savings_diff_inr": round(savings_a - savings_b, 0),
        "higher_eui_city": request.city_a if eui_a >= eui_b else request.city_b,
        "lower_eui_city": request.city_b if eui_a >= eui_b else request.city_a,
        "climate_zone_a": results["city_a"].get("ecbc_compliance", {}).get("climate_zone", "—"),
        "climate_zone_b": results["city_b"].get("ecbc_compliance", {}).get("climate_zone", "—"),
    }
    
    return sanitize_for_json({
        "city_a": {"name": request.city_a, **results["city_a"]},
        "city_b": {"name": request.city_b, **results["city_b"]},
        "delta": delta,
        "building_config": {
            "archetype": request.archetype,
            "floor_area_m2": request.floor_area_m2,
            "wwr": request.wwr,
            "hvac_type": request.hvac_type,
            "operating_hours": request.operating_hours,
            "model_type": request.model_type
        }
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
