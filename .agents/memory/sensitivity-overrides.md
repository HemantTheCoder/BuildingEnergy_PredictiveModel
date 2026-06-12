---
name: Physics sensitivity overrides in main.py
description: Which sensitivity parameters use physics formula overrides and why.
---

# Rule
Three parameters always use physics formula overrides instead of raw ML sensitivity:
- **solrad**: override when |high_impact| < 1.0 or > PHYS_CAP (100)
- **u_wall**: always use physics (`Δu_wall × (1-wwr) × wall_area_ratio × (CDD+HDD) × 0.024 × 0.55 / COP`)
- **u_roof**: always use physics (`Δu_roof × (CDD+HDD) × 0.024 × 0.55 / COP`)

**Why:** Tree models cannot reliably learn multi-factor interaction terms. The u_wall effect is `u_wall × (1-wwr) × (30/√area) × (CDD+HDD)` — a product of four features. Without physics override, ML gives ±0.5 kWh/m²·yr when physics says ±5–15 kWh/m²·yr.

**Sign convention:** low_impact = -phys_impact (reducing U → lower EUI), high_impact = +phys_impact.

**PHYS_CAP = 100** is the generic cap for all other parameters.
