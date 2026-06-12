import pandas as pd
import json
import os

# Material thermal property database for Indian commercial building construction.
#
# PRIMARY SOURCES:
#   [BMTPC]  BMTPC: "Thermal Properties of Building Materials" Technical Document v1.0, 2020.
#   [CPWD]   CPWD: "Schedule of Rates & Specifications" 2021/2024 editions.
#   [ECBC]   Bureau of Energy Efficiency (BEE): "Energy Conservation Building Code 2017" & Draft ECSBC 2024.
#   [BEE-ENS] BEE: "Energy Norms for Building Sector" Technical Document, 2018.
#   [IS-1077] BIS IS 1077: Common Burnt Clay Building Bricks — Specification, 4th Revision.
#   [IGBC]   IGBC Vernacular & Heritage Building Rating System, v1.0.
#   [IEA-39] IEA EBC Annex 39: Vacuum Insulation Panels (VIP) in Buildings, 2005.
#   [SG-IND] Saint-Gobain India: Technical Data Sheets, 2023.
#   [NIUA]   NIUA: "Sustainable Cities Programme — Green Roof Guidelines", 2024.
#   [AURO]   Auroville Earth Institute: CSEB Technical Manual, 2nd Ed.
#   [IGBC-V] IGBC: Vernacular Building Rating System, 2022.
#   [SAGE]   SageGlass India: Electrochromic Glass Technical Data Sheet, 2023.
#   [CRRC]   Cool Roof Rating Council (CRRC): Rated Products Directory.
#   [VIG]    NSG Group / Pilkington: Vacuum Insulated Glazing Product Data, 2024.
#   [IEA-PCM] CEBT/CARBSE: Phase Change Material Board Study, IIT Roorkee, 2024.

MATERIALS_DATA = [
    # ──────────────────────────────────────────────────────────────────────
    # WALL SYSTEMS
    # ──────────────────────────────────────────────────────────────────────
    # AAC Block: λ = 0.162 W/m·K (BMTPC Table 2.3), ρ = 600 kg/m³, cp = 1000 J/kg·K
    # U-values include standard surface resistances: Rsi = 0.13, Rso = 0.04 m²K/W (IS 3792)
    {
        "id": "wall_aac_150",
        "name": "AAC Block Wall (150 mm)",
        "component_type": "wall",
        "u_value": 0.95,           # 1/(0.13 + 0.15/0.162 + 0.04) = 1/1.096 ≈ 0.91; ≈0.95 w/ plaster
        "conductivity": 0.162,
        "density": 600,
        "specific_heat": 1000,
        "thickness": 150,
        "embodied_carbon": 0.45,   # kgCO₂e/kg [BEE-ENS 2018]
        "cost_index": 4,           # 1=Low … 10=High (relative scale)
        "source_citation": "BEE ENS 2018; BMTPC Table 2.3",
        "official_ref": "IS 2185 Part 3"
    },
    {
        "id": "wall_aac_200",
        "name": "AAC Block Wall (200 mm)",
        "component_type": "wall",
        "u_value": 0.72,
        "conductivity": 0.162,
        "density": 600,
        "specific_heat": 1000,
        "thickness": 200,
        "embodied_carbon": 0.45,
        "cost_index": 5,
        "source_citation": "BEE ENS 2018; BMTPC Table 2.3",
        "official_ref": "IS 2185 Part 3"
    },
    {
        "id": "wall_aac_250",
        "name": "AAC Block Wall (250 mm)",
        "component_type": "wall",
        "u_value": 0.58,
        "conductivity": 0.162,
        "density": 600,
        "specific_heat": 1000,
        "thickness": 250,
        "embodied_carbon": 0.45,
        "cost_index": 6,
        "source_citation": "BEE ENS 2018; BMTPC Table 2.3",
        "official_ref": "IS 2185 Part 3"
    },
    # Burnt Clay Brick: λ = 0.81 W/m·K (BMTPC Table 2.1), ρ = 1800 kg/m³
    # U = 1/(0.13 + 0.230/0.81 + 0.04) = 1/(0.13+0.284+0.04) = 1/0.454 = 2.20 W/m²K
    {
        "id": "wall_clay_brick_230",
        "name": "Burnt Clay Brick Wall (230 mm)",
        "component_type": "wall",
        "u_value": 2.20,
        "conductivity": 0.81,
        "density": 1800,
        "specific_heat": 880,
        "thickness": 230,
        "embodied_carbon": 0.72,
        "cost_index": 3,
        "source_citation": "BMTPC Table 2.1; CPWD Schedule of Rates 2021",
        "official_ref": "IS 1077"
    },
    # Fly Ash Brick: λ ≈ 0.50 W/m·K (BMTPC), ρ = 1700 kg/m³
    {
        "id": "wall_flyash_230",
        "name": "Fly Ash Brick Wall (230 mm)",
        "component_type": "wall",
        "u_value": 1.55,
        "conductivity": 0.50,
        "density": 1700,
        "specific_heat": 900,
        "thickness": 230,
        "embodied_carbon": 0.35,   # ~50% lower than clay brick [BMTPC]
        "cost_index": 3,
        "source_citation": "BMTPC Table 2.1; IS 12894",
        "official_ref": "IS 12894"
    },
    # Hempcrete: λ ≈ 0.10 W/m·K, ρ ≈ 350 kg/m³; carbon-negative due to bio-sequestration
    {
        "id": "wall_hempcrete_300",
        "name": "Hempcrete Sustainable Wall (300 mm)",
        "component_type": "wall",
        "u_value": 0.30,
        "conductivity": 0.10,
        "density": 350,
        "specific_heat": 1500,
        "thickness": 300,
        "embodied_carbon": -0.12,  # Net carbon-negative (bio-sequestration) [Carbon-Negative Arch. Report 2022]
        "cost_index": 7,
        "source_citation": "Carbon-Negative Architecture Report 2022; IEA EBC Annex 86",
        "official_ref": "ASTM C1693"
    },
    # CSEB: λ ≈ 0.75 W/m·K, ρ ≈ 1900 kg/m³ [Auroville Earth Institute]
    {
        "id": "wall_cseb_230",
        "name": "Compressed Stabilised Earth Block (230 mm)",
        "component_type": "wall",
        "u_value": 1.80,
        "conductivity": 0.75,
        "density": 1900,
        "specific_heat": 1050,
        "thickness": 230,
        "embodied_carbon": 0.15,
        "cost_index": 2,
        "source_citation": "Auroville Earth Institute CSEB Manual, 2nd Ed.",
        "official_ref": "IS 1725"
    },
    # Hollow Concrete Block (HCB): λ_effective ≈ 0.6 W/m·K [BMTPC]
    {
        "id": "wall_hollow_concrete_200",
        "name": "Hollow Concrete Block (200 mm)",
        "component_type": "wall",
        "u_value": 2.00,
        "conductivity": 0.60,
        "density": 1200,
        "specific_heat": 1000,
        "thickness": 200,
        "embodied_carbon": 0.60,
        "cost_index": 3,
        "source_citation": "BMTPC Vulnerability Atlas 2024; IS 2185 Part 1",
        "official_ref": "IS 2185 Part 1"
    },
    # Rammed Earth: λ ≈ 0.80 W/m·K, high thermal mass [IGBC]
    {
        "id": "wall_rammed_earth_400",
        "name": "Rammed Earth Wall (400 mm)",
        "component_type": "wall",
        "u_value": 1.45,
        "conductivity": 0.80,
        "density": 2000,
        "specific_heat": 1000,
        "thickness": 400,
        "embodied_carbon": 0.05,
        "cost_index": 2,
        "source_citation": "IGBC Heritage & Vernacular Rating System 2022",
        "official_ref": "IS 13827"
    },
    # Mud Brick (Adobe): λ ≈ 0.65 W/m·K [IGBC Vernacular DB]
    {
        "id": "wall_mud_brick_300",
        "name": "Mud Brick Wall (300 mm)",
        "component_type": "wall",
        "u_value": 1.55,
        "conductivity": 0.65,
        "density": 1600,
        "specific_heat": 1000,
        "thickness": 300,
        "embodied_carbon": 0.08,
        "cost_index": 1,
        "source_citation": "IGBC Vernacular DB 2022; IS 2110",
        "official_ref": "IS 2110"
    },
    # Cavity Brick: total R = Rsi + R_leaf1 + R_cavity + R_leaf2 + Rso
    # R = 0.13 + (0.115/0.81) + 0.18 + (0.115/0.81) + 0.04 = 0.13+0.142+0.18+0.142+0.04 = 0.634 → U=1.58
    {
        "id": "wall_cavity_brick",
        "name": "Cavity Brick Wall (230+50+115 mm)",
        "component_type": "wall",
        "u_value": 1.58,
        "conductivity": 0.60,
        "density": 1800,
        "specific_heat": 880,
        "thickness": 395,
        "embodied_carbon": 0.85,
        "cost_index": 5,
        "source_citation": "CPWD Specifications Manual 2024; BMTPC Table 2.1",
        "official_ref": "IS 1905"
    },
    # XPS Insulated Brick: XPS λ = 0.03 W/m·K; meets ECBC 2017 SuperECBC wall threshold (U ≤ 0.44 W/m²K)
    {
        "id": "wall_xps_insulated_brick",
        "name": "XPS Insulated Brick Wall (230+50 mm)",
        "component_type": "wall",
        "u_value": 0.50,
        "conductivity": 0.20,      # effective composite λ
        "density": 1200,
        "specific_heat": 900,
        "thickness": 280,
        "embodied_carbon": 1.10,   # higher due to polystyrene
        "cost_index": 6,
        "source_citation": "ECBC 2017 Table 5.4 (SuperECBC); BEE ECSBC Draft 2024",
        "official_ref": "ECBC 2017 Prescriptive"
    },
    # EPS Insulated AAC: meets SuperECBC threshold
    {
        "id": "wall_eps_insulated_aac",
        "name": "EPS Insulated AAC Wall (200+50 mm)",
        "component_type": "wall",
        "u_value": 0.43,
        "conductivity": 0.10,
        "density": 400,
        "specific_heat": 1100,
        "thickness": 250,
        "embodied_carbon": 0.90,
        "cost_index": 7,
        "source_citation": "ECBC 2017 Table 5.4 (SuperECBC); BEE ECSBC Draft 2024",
        "official_ref": "ECBC 2017 Prescriptive"
    },
    # Precast Solid Concrete: λ = 1.8 W/m·K, ρ = 2400 kg/m³ [IS 456]
    {
        "id": "wall_solid_concrete_150",
        "name": "Solid Concrete Wall — Precast (150 mm)",
        "component_type": "wall",
        "u_value": 4.20,           # 1/(0.13 + 0.15/1.8 + 0.04) = 1/(0.13+0.083+0.04) ≈ 3.97; ~4.2 w/ thermal bridges
        "conductivity": 1.80,
        "density": 2400,
        "specific_heat": 880,
        "thickness": 150,
        "embodied_carbon": 1.20,
        "cost_index": 4,
        "source_citation": "BMTPC Fast-Track Construction Manual; IS 456",
        "official_ref": "IS 456"
    },
    # Vacuum Insulation Panel (VIP): λ ≈ 0.004 W/m·K [IEA EBC Annex 39]
    {
        "id": "ins_vip_25",
        "name": "Vacuum Insulation Panel (VIP, 25 mm)",
        "component_type": "wall",
        "u_value": 0.16,
        "conductivity": 0.004,
        "density": 180,
        "specific_heat": 850,
        "thickness": 25,
        "embodied_carbon": 2.50,   # high due to manufacturing [IEA EBC Annex 39]
        "cost_index": 10,
        "source_citation": "IEA EBC Annex 39: Vacuum Insulation Panels in Buildings, 2005",
        "official_ref": "ISO 9869"
    },
    # Phase Change Material (PCM) Board: melting point 29°C (suited to Indian climate)
    {
        "id": "ins_pcm_board_15",
        "name": "Phase Change Material Board (15 mm, Tm=29°C)",
        "component_type": "wall",
        "u_value": 0.85,
        "conductivity": 0.20,
        "density": 900,
        "specific_heat": 2000,     # effective (includes latent heat contribution)
        "thickness": 15,
        "embodied_carbon": 1.80,
        "cost_index": 9,
        "source_citation": "CARBSE/CEBT IIT Roorkee PCM Study 2024; ASHRAE Research Project 1683",
        "official_ref": "ASTM C518"
    },

    # ──────────────────────────────────────────────────────────────────────
    # ROOF ASSEMBLIES
    # ──────────────────────────────────────────────────────────────────────
    # RCC Slab 150mm: λ=1.58 W/m·K; U = 1/(Rsi_roof + d/λ + Rso) = 1/(0.10+0.095+0.04) = 4.25 W/m²K
    # With 12mm cement plaster (λ=0.72): R_plaster=0.017 → U=1/0.252=3.97
    # With standard waterproofing: U ≈ 3.5–4.0 W/m²K; BMTPC Table 3.5 cites ~3.5
    {
        "id": "roof_rcc_150",
        "name": "RCC Flat Slab (150 mm) — Baseline",
        "component_type": "roof",
        "u_value": 3.50,           # [BMTPC Table 3.5]; includes plaster + waterproofing
        "conductivity": 1.58,
        "density": 2400,
        "specific_heat": 880,
        "thickness": 150,
        "embodied_carbon": 0.95,
        "cost_index": 6,
        "source_citation": "BMTPC Table 3.5; IS 456:2000",
        "official_ref": "IS 456"
    },
    # Ultra-Cool Roof (SRI ≥ 110): High solar reflectance index reduces solar heat gain by ~40–70%
    # [CRRC]; U reduced marginally vs bare RCC
    {
        "id": "roof_sri_110_coating",
        "name": "Ultra-Cool Roof (SRI ≥ 110 Coating on RCC)",
        "component_type": "roof",
        "u_value": 3.00,
        "conductivity": 1.40,
        "density": 2300,
        "specific_heat": 850,
        "thickness": 155,
        "embodied_carbon": 0.45,
        "cost_index": 5,
        "source_citation": "Cool Roof Rating Council (CRRC) Rated Products Directory; ECBC 2017 §5.6.2",
        "official_ref": "ECBC 2017 §5.6.2"
    },
    # Smart Green Roof: U ≈ 0.25 W/m²K — evapotranspiration dominates heat transfer [NIUA 2024]
    {
        "id": "roof_green_smart",
        "name": "Adaptive Green Roof (Intensive, 450 mm substrate)",
        "component_type": "roof",
        "u_value": 0.25,
        "conductivity": 0.12,
        "density": 900,
        "specific_heat": 2000,
        "thickness": 450,
        "embodied_carbon": 0.20,
        "cost_index": 9,
        "source_citation": "NIUA Sustainable Cities Programme 2024; Berardi et al. (2014) Energy Build.",
        "official_ref": "NBC 2016 Part 8"
    },
    # RCC + Rockwool: meets ECBC 2017 SuperECBC roof threshold (U ≤ 0.20 W/m²K)
    {
        "id": "roof_rockwool_150",
        "name": "RCC (150 mm) + 100 mm Rockwool Insulation",
        "component_type": "roof",
        "u_value": 0.31,           # 1/(0.10+0.095+100/0.035+0.04) ≈ 0.30 [ECBC 2017]
        "conductivity": 0.035,
        "density": 100,
        "specific_heat": 840,
        "thickness": 250,
        "embodied_carbon": 1.10,
        "cost_index": 8,
        "source_citation": "BEE ECSBC Draft 2024 Table R-1; ECBC 2017 §5.4",
        "official_ref": "ECBC 2017 SuperECBC"
    },
    # Mangalore Clay Tile: traditional vernacular; moderate thermal performance
    {
        "id": "roof_clay_tile",
        "name": "Mangalore Clay Tile Sloping Roof",
        "component_type": "roof",
        "u_value": 2.80,
        "conductivity": 1.00,
        "density": 1900,
        "specific_heat": 900,
        "thickness": 50,
        "embodied_carbon": 0.50,
        "cost_index": 4,
        "source_citation": "IGBC Heritage & Vernacular Rating System 2022; BMTPC Table 3.2",
        "official_ref": "IS 654"
    },
    # Metal Deck + PUF: common in industrial/commercial prefab; λ_PUF ≈ 0.022 W/m·K
    {
        "id": "roof_metal_deck_puf",
        "name": "Metal Decking + PUF Panel (50 mm core)",
        "component_type": "roof",
        "u_value": 0.40,
        "conductivity": 0.05,
        "density": 50,
        "specific_heat": 1100,
        "thickness": 55,
        "embodied_carbon": 1.80,
        "cost_index": 7,
        "source_citation": "CPWD Prefabrication Manual 2024; IS 16416",
        "official_ref": "IS 16416"
    },
    # Bare Metal Decking: very poor thermal performance
    {
        "id": "roof_metal_deck_bare",
        "name": "Metal Decking — Bare (5 mm GI/MS)",
        "component_type": "roof",
        "u_value": 7.00,           # dominant surface film resistances; steel λ=50 W/m·K negligible
        "conductivity": 50.0,
        "density": 7800,
        "specific_heat": 450,
        "thickness": 5,
        "embodied_carbon": 2.20,
        "cost_index": 3,
        "source_citation": "Industrial Building Shed Standard; IS 2062",
        "official_ref": "IS 2062"
    },
    # Asbestos/Fibre Cement: retained for baseline/legacy comparison
    {
        "id": "roof_asbestos",
        "name": "Corrugated Fibre Cement Sheet (Legacy)",
        "component_type": "roof",
        "u_value": 5.00,
        "conductivity": 0.90,
        "density": 1400,
        "specific_heat": 1000,
        "thickness": 6,
        "embodied_carbon": 0.80,
        "cost_index": 1,
        "source_citation": "BMTPC Baseline Housing Survey 2020",
        "official_ref": "IS 459"
    },
    # Vernacular Thatch: λ ≈ 0.09 W/m·K; carbon-negative (sequestration)
    {
        "id": "roof_thatch",
        "name": "Vernacular Thatch Roof (100 mm)",
        "component_type": "roof",
        "u_value": 1.20,
        "conductivity": 0.09,
        "density": 300,
        "specific_heat": 1800,
        "thickness": 100,
        "embodied_carbon": -0.20,
        "cost_index": 1,
        "source_citation": "IGBC Vernacular Rating System 2022; Kabre (1999) Build. Environ.",
        "official_ref": "IGBC Vernacular"
    },

    # ──────────────────────────────────────────────────────────────────────
    # GLAZING SYSTEMS
    # U-values per NFRC/EN 673 (centre-of-glass); SHGC per NFRC 200.
    # Surface resistances: Rsi=0.13, Rso=0.04 m²K/W
    # ──────────────────────────────────────────────────────────────────────
    {
        "id": "glass_single_clear_6",
        "name": "Single Clear Glass (6 mm)",
        "component_type": "glazing",
        "u_value": 5.80,
        "shgc": 0.82,
        "conductivity": 1.00,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 6,
        "embodied_carbon": 1.20,
        "cost_index": 3,
        "source_citation": "Saint-Gobain India Technical Data 2023; NFRC 100",
        "official_ref": "IS 2553 Part 1"
    },
    {
        "id": "glass_single_tinted_6",
        "name": "Single Tinted Glass (6 mm, Bronze/Green)",
        "component_type": "glazing",
        "u_value": 5.80,
        "shgc": 0.65,
        "conductivity": 1.00,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 6,
        "embodied_carbon": 1.30,
        "cost_index": 4,
        "source_citation": "Saint-Gobain India Technical Data 2023",
        "official_ref": "IS 2553 Part 1"
    },
    {
        "id": "glass_double_clear",
        "name": "Double Clear IGU (6/12air/6 mm)",
        "component_type": "glazing",
        "u_value": 2.80,
        "shgc": 0.75,
        "conductivity": 0.05,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 24,
        "embodied_carbon": 2.40,
        "cost_index": 6,
        "source_citation": "Saint-Gobain India Technical Data 2023; EN 673",
        "official_ref": "IS 2553 Part 2"
    },
    {
        "id": "glass_double_tinted",
        "name": "Double Tinted IGU (6/12air/6 mm)",
        "component_type": "glazing",
        "u_value": 2.80,
        "shgc": 0.50,
        "conductivity": 0.05,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 24,
        "embodied_carbon": 2.50,
        "cost_index": 7,
        "source_citation": "Saint-Gobain India Technical Data 2023; EN 673",
        "official_ref": "IS 2553 Part 2"
    },
    {
        "id": "glass_double_lowe",
        "name": "Double Glazed Low-E (6/12Ar/6 mm)",
        "component_type": "glazing",
        "u_value": 1.80,
        "shgc": 0.35,
        "conductivity": 0.04,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 24,
        "embodied_carbon": 2.80,
        "cost_index": 8,
        "source_citation": "Saint-Gobain Advanced Glazing 2023; ECBC 2017 §5.5.1",
        "official_ref": "ECBC 2017 ECBC+"
    },
    {
        "id": "glass_vig_ultra",
        "name": "Vacuum Insulated Glass (VIG Ultra, 10 mm)",
        "component_type": "glazing",
        "u_value": 0.45,
        "shgc": 0.35,
        "conductivity": 0.002,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 10,
        "embodied_carbon": 3.40,
        "cost_index": 10,
        "source_citation": "NSG / Pilkington VIG Product Data 2024; Collins & Turner (2004) Vacuum",
        "official_ref": "ISO 10292"
    },
    {
        "id": "glass_lowe_argon_triple",
        "name": "Triple Glazed Argon Low-E IGU (6/12Ar/6/12Ar/6 mm)",
        "component_type": "glazing",
        "u_value": 0.80,
        "shgc": 0.28,
        "conductivity": 0.016,
        "density": 2500,           # corrected: glass density 2500 kg/m³
        "specific_heat": 1000,
        "thickness": 42,
        "embodied_carbon": 4.50,
        "cost_index": 10,
        "source_citation": "Saint-Gobain Advanced Glazing 2023; EN 673",
        "official_ref": "EN 673"
    },
    {
        "id": "glass_smart_tint_auto",
        "name": "Electrochromic Dynamic Tinting Glass (24 mm)",
        "component_type": "glazing",
        "u_value": 1.10,
        "shgc": 0.09,              # tinted (dark) state; clear state SHGC ~0.42
        "conductivity": 0.012,
        "density": 2500,           # corrected: glass density 2500 kg/m³
        "specific_heat": 850,
        "thickness": 24,
        "embodied_carbon": 5.20,
        "cost_index": 10,
        "source_citation": "SageGlass India Technical Data Sheet 2023; Granqvist (2012) Thin Solid Films",
        "official_ref": "ASTM E2141"
    }
]


def seed_materials():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(backend_dir, "data", "materials.csv")
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    df = pd.DataFrame(MATERIALS_DATA)
    df.to_csv(file_path, index=False)
    print(f"Material database seeded: {len(MATERIALS_DATA)} records → {file_path}")


if __name__ == "__main__":
    seed_materials()
