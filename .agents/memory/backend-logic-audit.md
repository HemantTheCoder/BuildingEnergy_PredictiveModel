---
name: Backend physics & logic audit
description: Known simplifications, fixes applied, and remaining caveats
---
## Fixed issues
- PMV `calculate_pmv()`: status order bug fixed (Hot checked before Warm); `is_proxy: True` added; ISO 7730 disclaimer in response
- `get_ecbc_compliance()`: now uses 5-zone BEE ECBC 2017 Tables 5.3–5.5 (Hot-Dry, Warm-Humid, Composite, Temperate, Cold); returns `climate_zone` and `source` in response
- Sensitivity analysis docstring corrected from "±20%" to "±50%" (code always used 0.5×–1.5× range)
- Prediction interval comment clarified: it is MAE×1.96 heuristic, NOT a calibrated 95% CI

## Known remaining simplifications (not bugs, by design)
- PMV is envelope-only proxy (no air velocity, clo, met); Fanger ISO 7730 not fully implemented — requires occupant data not available
- Orientation factors (N=0.65, S=1.0, E=0.9, W=1.15) are climate-averaged, not site-specific
- Baseline EUI of 180 kWh/m²·yr is a generic Indian commercial fallback
- MLOps retrain trigger uses same training data (no real IoT ground truth)
- Solrad ML sensitivity can produce unrealistically large values (~±2000 kWh/m²·yr) — physics override only triggers when ML impact < 1.0; pre-existing model calibration issue
