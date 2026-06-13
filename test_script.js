
        const API_BASE = "";
        let activeView = "status";

        function safeCreateIcons() {
            try { if (typeof lucide !== 'undefined') lucide.createIcons(); } catch(e) {}
        }

        window.addEventListener('DOMContentLoaded', () => {
            fetchMetrics();
            checkUrlPath();
            safeCreateIcons();
            // Re-run after a short delay in case the CDN script was still loading
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
                    document.getElementById("dataset-count-lbl").innerText = "2215 samples";
                    return;
                }

                document.getElementById("dataset-count-lbl").innerText = (2215 + data.length) + " samples";

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
                const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "climabuild_telemetry_logs.csv"; a.click();
                URL.revokeObjectURL(url);
            } catch (err) {
                alert("Failed to export logs: " + err);
            }
        }
    