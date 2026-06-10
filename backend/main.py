from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
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

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    trace = traceback.format_exc()
    print(f"GLOBAL ERROR: {exc}\n{trace}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "traceback": trace,
            "message": "Internal Server Error - Detailed Traceback attached"
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
    occupancy_density: Optional[float] = 0.1 # ppl/m2
    equipment_load: Optional[float] = 10.0 # W/m2
    orientation: Optional[str] = "South"
    material_overrides: Optional[Dict[str, str]] = None
    property_overrides: Optional[Dict[str, float]] = None
    climate_overrides: Optional[Dict[str, float]] = None
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
async def admin_login(payload: LoginRequest):
    if payload.password == "banhae":
        return {"status": "success", "token": "admin_session_active"}
    raise HTTPException(status_code=401, detail="Unauthorized - Invalid Password")

@app.get("/admin/logs")
async def get_admin_logs():
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
async def clear_admin_logs():
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
async def force_retrain():
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
        
        <div id="status-view" class="space-y-8 block">
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
                            <span class="text-xs font-semibold text-slate-600">/predict, /fetch_climate, /materials</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="glass-panel p-8 rounded-2xl space-y-6">
                <div>
                    <h3 class="text-xl font-bold tracking-tight text-slate-800">Active Model Validation Metrics</h3>
                    <p class="text-xs text-slate-500 mt-1">Metrics compiled automatically using our 80/20 train/test evaluation split.</p>
                </div>
                
                <div id="metrics-grid" class="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                    <div class="flex justify-center py-6 text-slate-400 italic">Loading performance stats...</div>
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
                        <button onclick="clearTelemetryLogs()" class="h-12 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-6 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm">
                            <i data-lucide="trash-2" class="w-4 h-4"></i> Clear Logs
                        </button>
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
                            <span class="text-md font-bold text-slate-800" id="dataset-count-lbl">1504 samples</span>
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

    <script>
        const API_BASE = "";
        let activeView = "status";

        window.addEventListener('DOMContentLoaded', () => {
            lucide.createIcons();
            fetchMetrics();
            checkUrlPath();
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

        async function fetchMetrics() {
            try {
                const res = await fetch(API_BASE + "/models");
                const data = await res.json();
                
                const grid = document.getElementById("metrics-grid");
                grid.innerHTML = "";

                if (data.metrics) {
                    Object.entries(data.metrics).forEach(([modelName, metrics]) => {
                        const card = document.createElement("div");
                        card.className = "bg-white p-6 rounded-xl flex flex-col justify-between border border-slate-200 border-t-2 shadow-sm " + 
                            (modelName === "XGBoost" ? "border-t-primary" : modelName === "RandomForest" ? "border-t-secondary" : "border-t-accent");
                        
                        card.innerHTML = `
                            <div class="flex justify-between items-baseline mb-4">
                                <span class="font-bold text-sm text-slate-800">${modelName}</span>
                                <span class="text-[9px] uppercase font-black text-slate-400 tracking-wider">Predictor</span>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Accuracy R²</span>
                                    <span class="text-2xl font-extrabold italic text-slate-900">${metrics.r2.toFixed(4)}</span>
                                </div>
                                <div>
                                    <span class="text-[10px] text-slate-400 uppercase tracking-widest font-black block">Variance MAE</span>
                                    <span class="text-2xl font-extrabold italic text-slate-900">${metrics.mae.toFixed(2)}</span>
                                </div>
                            </div>
                        `;
                        grid.appendChild(card);
                    });
                }
            } catch (err) {
                console.error("Error loading metrics:", err);
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
                    document.getElementById("dataset-count-lbl").innerText = "1504 samples";
                    return;
                }

                document.getElementById("dataset-count-lbl").innerText = (1504 + data.length) + " samples";

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
                    alert("MLOps CT Process Succeeded! Models retrained and hot-deployed.");
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
    </script>
</body>
</html>"""

@app.get("/", response_class=HTMLResponse)
async def root():
    return HTMLResponse(content=DASHBOARD_HTML)

@app.get("/admin", response_class=HTMLResponse)
async def admin_portal():
    return HTMLResponse(content=DASHBOARD_HTML)

@app.get("/materials")
async def get_materials():
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
async def get_cities():
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
async def get_models():
    return {
        "available_models": list(engine.models.keys()),
        "metrics": engine.metrics
    }

@app.get("/fetch_climate")
async def get_climate(city: str):
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
async def predict(request: PredictRequest):
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
    
    # Updated HVAC COP mapping for Indian Context
    cop_map = {
        "Split/Window AC": 2.8,  # Typical DX systems
        "Central Chiller (VAV)": 3.2, # Large commercial installations
        "Variable Refrigerant Flow (VRF)": 3.8, # High efficiency multizone
        "Evaporative Cooler": 8.0  # High 'apparent' COP but constrained by humidity
    }
    hvac_cop = cop_map.get(request.hvac_type, 3.0)
    
    # Internal Gains Adjustment
    # EUI impact scale based on benchmarks: 10% increase per ppl/m2 and 5% per 10W load 
    internal_gain_factor = 1.0 + (request.occupancy_density * 0.5) + (request.equipment_load / 100.0)

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
        
        # Adaptive Default Fallback
        is_cold = climate_data and climate_data.get('hdd', 0) > 1000
        defaults = {
            "wall": "AAC Block Wall (200mm)" if not is_cold else "Burnt Clay Brick Wall (230mm)",
            "roof": "RCC Slab (150mm) - Standard" if not is_cold else "RCC (150mm) + 100mm Rockwool Insulation", 
            "glazing": "Single Clear Glass (6mm)" if not is_cold else "Double Glazed Low-E (6/12/6)"
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
        
    predicted_eui = prediction['predicted_eui'] * internal_gain_factor
    interval = prediction.get('prediction_interval', [prediction['predicted_eui'], prediction['predicted_eui']])
    adjusted_interval = [round(i * internal_gain_factor, 2) for i in interval]
    
    # 5. Recommend
    recommendations = engine.recommend_materials(input_data, materials_df, orientation=request.orientation, model_type=request.model_type)
    
    # 6. Sensitivity
    sensitivity = engine.get_sensitivity_analysis(input_data, orientation=request.orientation, model_type=request.model_type)

    # 7. Thermal Comfort (PMV)
    comfort = engine.calculate_pmv(u_wall, u_roof, u_glass, climate['annual_solrad'], climate['cdd'])

    # 8. ECBC Compliance
    compliance = engine.get_ecbc_compliance(u_wall, u_roof, u_glass, shgc)

    # 9. Evidence Panel Construction
    evidence_panel = {
        "prediction_interval": adjusted_interval,
        "shap_drivers": prediction.get('shap_values'),
        "climate_source_metadata": climate.get('metadata', {}),
        "physics_anomalies_detected": prediction.get('low_confidence', False),
        "overall_confidence": 0.3 if prediction.get('low_confidence') else climate.get('metadata', {}).get('confidence_score', 0.8)
    }
    
    # 10. Dynamic Financials
    # In a fully fleshed system, baseline_eui comes from a benchmark database for the given city/archetype.
    baseline_eui = 180.0 
    annual_savings_inr = max(0, (baseline_eui - predicted_eui)) * request.floor_area_m2 * 9.0 # Assuming INR 9/kWh

    response = {
        "predicted_eui": float(predicted_eui),
        "baseline_eui": float(baseline_eui),
        "annual_savings_inr": float(annual_savings_inr),
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
