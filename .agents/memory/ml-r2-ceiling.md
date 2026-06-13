---
name: ML R² ceiling for bee_benchmarks.csv
description: The achievable R² for this physics-calibrated surrogate dataset is ~0.78-0.80, not 0.90+; explains why and what was tried.
---

## Rule
Maximum achievable R² with the 10 available base features (and any engineered derivatives) is approximately **0.78–0.80**. Do not promise or target R² ≥ 0.90 for this dataset.

## Why
The training data is labelled "Physics-Calibrated Surrogate (ISO 13790 / ECBC 2017 / ASHRAE 90.1)". The physics model that generated EUI values uses additional latent inputs **not present in the CSV**:
- Occupant schedules (hourly profiles)
- Internal heat gains (lighting W/m², plug loads W/m²)
- Infiltration rates
- Detailed wall/roof area ratios

These latent variables introduce irreducible noise from the ML model's perspective. Even with perfect hyperparameter tuning, the model cannot explain variance caused by variables it never sees.

## Evidence
| Version | XGBoost R² | Ridge R² | RF R² |
|---------|-----------|---------|-------|
| Baseline (10 feat) | 0.763 | 0.722 | 0.713 |
| v5 (19 feat, tuned) | **0.7823** | **0.7785** | **0.7421** |

## What was tried (all capped at ~0.78)
- 5 physics-informed interaction features (solar_heat_gain, envelope_ua, hvac_load_factor, log_floor_area, climate_severity)
- 4 more features (ua_per_area, wall_cdd, roof_solar, climate_code from CDD/HDD thresholds)
- Archetype column: 99.8% Office, unusable
- Climate zone as ordinal: only 56.7% derivation accuracy from CDD/HDD; marginal +0.007 R² at n=300
- XGBoost hyperparameter sweeps: depth=5-8, lr=0.015-0.05, n=300-1500

## How to apply
If someone asks to improve R² further, the correct answer is: **regenerate the training data with all physics-model inputs included in the CSV** (add schedules, internal gains, infiltration). The ML architecture is not the bottleneck.
