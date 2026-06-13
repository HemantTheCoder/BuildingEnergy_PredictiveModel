---
name: ML feature engineering v5 and load_models SHAP bug
description: 19-feature engineering, model versioning via model_version.txt, and critical SHAP early-return fix.
---

## Current feature set (v5, 19 features)
**BASE_FEATURES** (10): u_wall, u_roof, u_glass, shgc, cdd, hvac_cop, floor_area, wwr, hdd, solrad

**Engineered** (9):
- solar_heat_gain = wwr × shgc × solrad (ISO 13790 §11.3.2)
- envelope_ua = u_wall×0.5 + u_roof×0.3 + u_glass×wwr×0.2 (ASHRAE 90.1 §5.5)
- hvac_load_factor = cdd / (hvac_cop + 0.01) (ECBC §4.4)
- log_floor_area = log1p(floor_area)
- climate_severity = cdd + hdd×0.3
- ua_per_area = envelope_ua / log_floor_area (ISO 13790 §9.3)
- wall_cdd = u_wall × cdd (ASHRAE 90.1 App G)
- roof_solar = u_roof × solrad (NBC 2016 §8)
- climate_code = ordinal ECBC zone from CDD/HDD thresholds (0=Cold … 4=Hot-Dry)

## Model versioning
`data/models/model_version.txt` stores `_MODEL_VERSION` string. `load_models()` compares it; mismatch triggers `train_all()`. Bump `_MODEL_VERSION` (v1→v2→...) whenever feature engineering or hyperparams change incompatibly.

## Critical SHAP bug (fixed in current code)
**Bug:** `load_models()` called `self.train_all()` then `return` early, skipping the SHAP explainer initialization block. Result: all SHAP values were empty `{}` after a version-mismatch retrain.

**Fix:** Changed early `return` to an `if/else` block, so SHAP explainer initialization always runs after the `if` branch (retrain path) and the `else` branch (file-load path).

## Hyperparameters (v5)
- **XGBoost**: n=1500, lr=0.02, depth=5, subsample=0.85, colsample_bytree=0.95, reg_alpha=0.05, reg_lambda=2.0, min_child_weight=3
- **RandomForest**: n=600, max_depth=None, min_samples_split=3, min_samples_leaf=2, max_features=0.7
- **Ridge**: Pipeline([StandardScaler, Ridge(alpha=5.0)])

## Why colsample_bytree=0.95 for 19 features
With colsample_bytree=0.85 on 19 features, each tree only sees 16 features. The interaction features are correlated (e.g. solar_heat_gain, wall_cdd, roof_solar all involve climate × envelope products), so 0.85 was too aggressive. 0.95 (≈18 features/tree) gave the best XGBoost R².
