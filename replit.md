# ClimaBuild AI

**Conference-grade building energy simulation for India**  
Presented at IGEC (International Green Energy Conference), Abu Dhabi · 2025

---

## What is ClimaBuild AI?

ClimaBuild AI is a physics-informed machine learning surrogate for commercial building energy simulation in India. It predicts a building's **Energy Use Intensity (EUI)** — the total energy consumed per square metre per year — and recommends the optimal material envelope to minimise energy demand, carbon emissions, and cost.

It is grounded in four authoritative Indian and international standards:
- **BEE ECBC 2017** — Energy Conservation Building Code (Bureau of Energy Efficiency, India)
- **ASHRAE 90.1-2019 / 55-2023** — North American envelope and thermal comfort standards
- **BMTPC Schedule of Rates 2024** — Indian building material costs and carbon factors
- **NASA POWER Surface Meteorology API** — 22-year climate normals (0.5° grid)

---

## Features

### Simulation Engine
| Feature | Detail |
|---|---|
| **EUI Prediction** | Gradient Boosted ensemble (XGBoost + Random Forest) trained on 15,000+ synthetic building records |
| **Physics Hybrid** | Deterministic schedule scaling and plug-load overlay on top of the ML baseline |
| **Sensitivity Analysis** | ±50% ceteris-paribus tornado chart — identifies highest-leverage design parameters |
| **SHAP Explainability** | Per-input Shapley values showing how each parameter pushed EUI up or down |
| **ECBC Compliance** | Automatic pass/fail against BEE ECBC 2017 climate-zone thresholds |

### Material Recommendations
- Three ranked material scenarios: **Optimum Efficiency**, **Balanced Cost**, and **Sustainability Leader**
- Multi-criteria radar chart comparing Energy Efficiency, Embodied Carbon, Cost, and ECBC Compliance
- Per-recommendation cost score (CPWD 2024 rates) and embodied carbon (BMTPC lifecycle data)

### Climate Integration
- **NASA POWER API** (auto): pulls 22-year monthly averages for any Indian city by coordinates
- **EPW File Upload**: import EnergyPlus Weather files from ISHRAE / DOE climate data sets
- **Monthly CDD/HDD chart**: Cooling and Heating Degree-Days (base 18.3 °C) per month, showing peak load periods

### Carbon & Cost Analysis
- Operational CO₂ intensity: `EUI × 0.82 kg/kWh` (CEA Grid Emission Factor 2022)
- Total annual CO₂ in tonnes for the building's floor area
- Annual cost savings vs. BEE baseline (INR)
- Thermal stress proxy on the ISO 7730 PMV scale

### Export
- **Export PDF** button triggers a structured A4 print report with KPI grid, material table, climate data, and citations

---

## Input Modes

### Simple Mode
- City (autocomplete from Indian city database)
- Building archetype: Small Office / Medium Office / Retail / Healthcare
- Floor area (m²)
- Window-to-Wall Ratio (WWR) slider (10–80%)
- Climate auto-fetched from NASA POWER

### Advanced Editor
Exposes all physics parameters:
- HVAC system type (15 options with actual COP values)
- Wall / Roof / Glazing material selection (from curated Indian material library)
- Occupancy density (people/m²), operating hours per week, equipment load (W/m²)
- Climate overrides (solar radiation, peak summer temp, humidity, wind speed)

---

## Architecture

```
ClimaBuild AI
├── backend/                  # Python · FastAPI
│   ├── main.py               # /predict endpoint, physics engine, CO₂ + cost scoring
│   ├── model_trainer.py      # XGBoost + RF ensemble, SHAP computation
│   ├── data_fetcher.py       # NASA POWER API client — monthly CDD/HDD/solrad
│   ├── epw_parser.py         # EnergyPlus Weather file parser — monthly CDD/HDD/solrad
│   └── materials_db.py       # Indian material library (BMTPC rates, thermal properties)
│
└── frontend/src/             # TypeScript · React 19 · Vite · Tailwind CSS v4
    ├── App.tsx                # App shell, nav, tab routing
    ├── components/
    │   ├── InputForm.tsx      # Simple + Advanced input form
    │   ├── ResultsDashboard.tsx  # All results tabs: Analytics, Scenarios, Simulator, Methodology
    │   ├── MaterialLibrary.tsx   # Searchable material database browser
    │   ├── ModelIntelligence.tsx # ML model performance metrics
    │   ├── ResearchContext.tsx   # Research landing page (pre-results)
    │   └── SplashScreen.tsx      # Animated loading screen
    └── index.css              # Tailwind theme, premium-card, print CSS (@media print)
```

**Backend port**: 8000 (FastAPI + Uvicorn)  
**Frontend port**: env `PORT` (Vite dev server)

---

## Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/predict` | Main simulation — returns EUI, materials, SHAP, climate, CO₂, cost |
| `GET` | `/materials` | Full material library with thermal/cost/carbon properties |
| `GET` | `/cities` | Indian city list with lat/lon |
| `GET` | `/fetch_climate` | Fetch NASA POWER climate data for a city |
| `POST` | `/upload_epw` | Parse and extract climate data from EPW file |
| `GET` | `/models` | Model metadata, R², MAE, training info |

---

## Research Context

This tool was built as a research contribution comparing the energy performance of commercial buildings across two Indian cities with contrasting climates (Hot-Dry and Hot-Humid). The simulation framework integrates:

- **Hybrid physics + ML approach**: ML provides the envelope-dependent baseline; deterministic thermodynamics handles schedule, occupancy, and plug loads
- **Indian material library**: 20+ wall, roof, and glazing assemblies with BMTPC-verified properties
- **ECBC 2017 compliance engine**: Automatic climate zone classification and threshold comparison
- **SHAP explainability**: Makes the AI decision transparent for peer-reviewed publication

### Design Philosophy
- Every number has a citation (BEE, ASHRAE, ISO, CEA, BMTPC, NASA)
- Physics guardrails prevent the ML model from producing non-physical results
- The tool is meant to be used by architects, energy auditors, and researchers — not a black box

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend framework | FastAPI 0.115 + Uvicorn |
| ML | XGBoost 2.x, scikit-learn, SHAP |
| Climate data | NASA POWER REST API (ALLSKY_SFC_SW_DWN, T2M, RH2M) |
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4 |
| Charts | Recharts (bar, radar, reference line) |
| Animation | Framer Motion |
| Package manager | pnpm (monorepo workspace) |

---

## Standards & References

| Standard | Use in ClimaBuild AI |
|---|---|
| BEE ECBC 2017 | Climate zone classification, EUI thresholds, Star Rating bands |
| ASHRAE 90.1-2019 | Envelope performance requirements, U-value limits |
| ASHRAE 55-2023 | Thermal comfort — PMV/PPD proxy (ISO 7730) |
| ISO 7730:2005 | Thermal stress index mapping |
| NASA POWER v8 | 22-year climate normals (solar, temp, humidity, wind) |
| CEA Grid Emission Factor 2022 | 0.82 kg CO₂/kWh — India grid carbon intensity |
| BMTPC Schedule of Rates 2024 | Material embodied carbon and unit costs |
| CPWD DSR 2024 | Construction cost benchmarks |
| IS 3792:1978 | Thermal insulation — building envelope (India) |

---

## User Preferences

- Research-grade citations on every metric
- Conference presentation quality (IGEC Abu Dhabi 2025)
- Color theme: Deep Blue `#042642`, Teal `#0C7277`, Sage `#7EB281`, Accent Orange `#ea580c`
- No placeholder data — every output is computed from real inputs
- Inline error handling; no silent fallbacks
