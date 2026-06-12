---
name: ML training data design
description: Why synthetic training data must use a single building archetype, and how the ML predicts EUI.
---

# Rule
Always train with a single archetype (Office) in the synthetic dataset. The published benchmark anchors (15 rows) may include multi-archetype buildings — they're < 1% of data.

**Why:** Archetype internal loads span ~55–132 kWh/m²·yr but archetype is NOT a feature in the ML model (`features = ["u_wall","u_roof","u_glass","shgc","cdd","hvac_cop","floor_area","wwr","hdd","solrad"]`). Training with multiple archetypes creates ~65 kWh/m²·yr of unexplained variance, dropping R² from 0.77 to 0.34. Archetype-specific effects belong in main.py business logic (occ_metabolic_eui, plug_eui, archetype_baseline_eui).

**How to apply:** If more archetypes are needed in training, add `archetype` as a one-hot feature in both ml_engine.py AND main.py input_data. Do not mix multi-archetype training data with a feature set that omits archetype.
