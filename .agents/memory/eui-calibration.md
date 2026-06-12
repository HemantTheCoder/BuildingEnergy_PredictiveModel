---
name: EUI physics formula calibration constants
description: The calibrated constants in generate_real_data.py and why they were chosen.
---

# Constants (generate_real_data.py)
- `base_internal_eui = 90.0` kWh/m²·yr — lighting + equipment + ventilation + ancillaries
- `solar_fraction = 0.22` — fraction of horizontal GHI reaching vertical facades (ASHRAE 90.1 App G; Datta 2001)
- `utilization_factor = 0.55` — thermal mass attenuation + intermittent schedule (ISO 13790:2008 §7.2)
- `noise = N(0, 10)` kWh/m²·yr — management, occupancy, model error
- `wall_area_ratio = min(1.5, max(0.25, 30/√floor_area))` — S/V correction (Steadman 2014)

**Calibration target:** BEE (2014) Table 3.1 — fully-AC office, Mumbai/Delhi: 179-182 kWh/m²·yr
At typical Indian baseline (u_wall=2.1, wwr=0.4, u_roof=3.1, shgc=0.82, COP=2.8, area=2000m²):
  transmission ≈ 66, solar ≈ 26, base_internal = 90 → total = 182 ✓

**Model performance after calibration:**
  XGBoost: R²=0.763, MAE=10.6 kWh/m²·yr
  RandomForest: R²=0.713, MAE=11.5 kWh/m²·yr
  RidgeRegression: R²=0.722, MAE=11.9 kWh/m²·yr

**File:** `backend/generate_real_data.py`, `backend/data/bee_benchmarks.csv` (2215 rows)
