---
name: Material DB schema
description: Column names, fixed density values, and citation format
---
## Columns (33 records in backend/data/materials.csv)
id, name, component_type (wall/roof/glazing), u_value, conductivity, density, specific_heat,
thickness, embodied_carbon (kgCO₂e/kg), cost_index (1–10), source_citation, official_ref,
shgc (glazing only)

## Key fixes applied
- Triple glazed argon density: was 2.5, now 2500 kg/m³
- Electrochromic glass density: was 2.5, now 2500 kg/m³
- All materials now have embodied_carbon, cost_index, source_citation, official_ref

## U-value conventions
- Wall/roof: include standard surface resistances Rsi=0.13, Rso=0.04 m²K/W (IS 3792/ISO 6946)
- Glazing: centre-of-glass per NFRC 100 / EN 673
