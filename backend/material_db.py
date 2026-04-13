import pandas as pd
import json
import os

# Material data based on BMTPC and typical Indian construction practices
# Sources: BMTPC, CPWD, Thermal Properties of Building Materials Technical Document
MATERIALS_DATA = [
    # --- Walls: Masonry & Blocks (Corrected & Expanded) ---
    {"id": "wall_aac_150", "name": "AAC Block Wall (150mm)", "component_type": "wall", "u_value": 1.08, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 150, "embodied_carbon": 0.45, "cost_index": 4, "source_citation": "BEE ENS 2018 Technical Doc"},
    {"id": "wall_aac_200", "name": "AAC Block Wall (200mm)", "component_type": "wall", "u_value": 0.81, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 200, "embodied_carbon": 0.45, "cost_index": 5, "source_citation": "BEE ENS 2018 Technical Doc"},
    {"id": "wall_aac_250", "name": "AAC Block Wall (250mm)", "component_type": "wall", "u_value": 0.65, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 250, "embodied_carbon": 0.45, "cost_index": 6, "source_citation": "BEE ENS 2018 Technical Doc"},
    {"id": "wall_clay_brick_230", "name": "Burnt Clay Brick Wall (230mm)", "component_type": "wall", "u_value": 2.1, "conductivity": 0.81, "density": 1800, "specific_heat": 880, "thickness": 230, "embodied_carbon": 0.72, "cost_index": 3, "source_citation": "CPWD Rates 2021", "official_ref": "IS 1077"},
    {"id": "wall_flyash_230", "name": "Fly Ash Brick Wall (230mm)", "component_type": "wall", "u_value": 1.4, "conductivity": 0.5, "density": 1700, "specific_heat": 900, "thickness": 230, "embodied_carbon": 0.35, "cost_index": 3, "source_citation": "BMTPC Table 2.1", "official_ref": "Green Building Code IND"},
    {"id": "wall_hempcrete_300", "name": "Hempcrete Sustainable Wall (300mm)", "component_type": "wall", "u_value": 0.33, "conductivity": 0.1, "density": 350, "specific_heat": 1500, "thickness": 300, "embodied_carbon": -0.12, "cost_index": 7, "source_citation": "Carbon-Negative Arch Report"},
    {"id": "wall_cseb_230", "name": "Compressed Stabilized Earth Block (230mm)", "component_type": "wall", "u_value": 1.6, "conductivity": 0.75, "density": 1900, "specific_heat": 1050, "thickness": 230, "embodied_carbon": 0.15, "cost_index": 2, "source_citation": "Auroville Earth Institute"},
    {"id": "wall_hollow_concrete_200", "name": "Hollow Concrete Block (200mm)", "component_type": "wall", "u_value": 1.8, "conductivity": 0.6, "density": 1200, "specific_heat": 1000, "thickness": 200, "embodied_carbon": 0.6, "cost_index": 3, "source_citation": "BMTPC Vulnerability Atlas 2024"},
    {"id": "wall_rammed_earth_400", "name": "Rammed Earth Wall (400mm)", "component_type": "wall", "u_value": 1.5, "conductivity": 0.8, "density": 2000, "specific_heat": 1000, "thickness": 400, "embodied_carbon": 0.05, "cost_index": 2, "source_citation": "IGBC Heritage Vernacular"},
    {"id": "wall_mud_brick_300", "name": "Mud Brick Wall (300mm)", "component_type": "wall", "u_value": 1.4, "conductivity": 0.65, "density": 1600, "specific_heat": 1000, "thickness": 300, "embodied_carbon": 0.08, "cost_index": 1, "source_citation": "IGBC Vernacular DB"},
    {"id": "wall_cavity_brick", "name": "Cavity Brick Wall (230+50+115mm)", "component_type": "wall", "u_value": 1.3, "conductivity": 0.6, "density": 1800, "specific_heat": 880, "thickness": 395, "embodied_carbon": 0.85, "cost_index": 5, "source_citation": "CPWD Spec Manual 2024"},
    {"id": "wall_xps_insulated_brick", "name": "XPS Insulated Brick Wall (230mm+50mm)", "component_type": "wall", "u_value": 0.5, "conductivity": 0.2, "density": 1200, "specific_heat": 900, "thickness": 280, "embodied_carbon": 1.1, "cost_index": 6, "source_citation": "ECBC 2017 SuperECBC"},
    {"id": "wall_eps_insulated_aac", "name": "EPS Insulated AAC (200mm+50mm)", "component_type": "wall", "u_value": 0.45, "conductivity": 0.1, "density": 400, "specific_heat": 1100, "thickness": 250, "embodied_carbon": 0.9, "cost_index": 7, "source_citation": "ECBC 2017 SuperECBC"},
    {"id": "wall_solid_concrete_150", "name": "Solid Concrete Wall Precast (150mm)", "component_type": "wall", "u_value": 3.8, "conductivity": 1.8, "density": 2400, "specific_heat": 880, "thickness": 150, "embodied_carbon": 1.2, "cost_index": 4, "source_citation": "BMTPC Fast Track Cons"},

    # --- Insulation & Innovative High-Performance (Added VIP/PCM) ---
    {"id": "ins_vip_25", "name": "Vacuum Insulation Panel (VIP 25mm)", "component_type": "wall", "u_value": 0.16, "conductivity": 0.004, "density": 180, "specific_heat": 850, "thickness": 25, "embodied_carbon": 2.5, "cost_index": 10, "source_citation": "IEA EBC Annex 39"},
    {"id": "ins_pcm_board_15", "name": "Phase Change Material Board (15mm 29°C)", "component_type": "wall", "u_value": 0.85, "conductivity": 0.2, "density": 900, "specific_heat": 2000, "thickness": 15, "embodied_carbon": 1.8, "cost_index": 9, "source_citation": "CEBT/CARBSE 2024 Study"},

    # --- Roofs: High Solar Reflectance & Thermal Mass ---
    {"id": "roof_rcc_150", "name": "RCC Slab (150mm) - Standard", "component_type": "roof", "u_value": 3.1, "conductivity": 1.58, "density": 2400, "specific_heat": 880, "thickness": 150, "embodied_carbon": 0.95, "cost_index": 6, "source_citation": "BMTPC Table 3.5", "official_ref": "IS 456"},
    {"id": "roof_sri_110_coating", "name": "Ultra-Cool Roof (SRI 110+ Coating)", "component_type": "roof", "u_value": 2.7, "conductivity": 1.4, "density": 2300, "specific_heat": 850, "thickness": 155, "embodied_carbon": 0.45, "cost_index": 5, "source_citation": "Cool Roof Rating Council"},
    {"id": "roof_green_smart", "name": "Smart Green Roof (Adaptive Irrigation)", "component_type": "roof", "u_value": 0.25, "conductivity": 0.12, "density": 900, "specific_heat": 2000, "thickness": 450, "embodied_carbon": 0.2, "cost_index": 9, "source_citation": "NIUA Sustainable Cities 2024"},
    {"id": "roof_rockwool_150", "name": "RCC (150mm) + 100mm Rockwool Insulation", "component_type": "roof", "u_value": 0.31, "conductivity": 0.035, "density": 100, "specific_heat": 840, "thickness": 250, "embodied_carbon": 1.1, "cost_index": 8, "source_citation": "BEE ECSBC 2024 Draft"},
    {"id": "roof_clay_tile", "name": "Clay Tile Sloping Roof (Mangalore)", "component_type": "roof", "u_value": 2.8, "conductivity": 1.0, "density": 1900, "specific_heat": 900, "thickness": 50, "embodied_carbon": 0.5, "cost_index": 4, "source_citation": "IGBC Heritage Vernacular"},
    {"id": "roof_metal_deck_puf", "name": "Metal Decking + PUF Panel (50mm)", "component_type": "roof", "u_value": 0.4, "conductivity": 0.05, "density": 50, "specific_heat": 1100, "thickness": 55, "embodied_carbon": 1.8, "cost_index": 7, "source_citation": "CPWD Pre-fab 2024"},
    {"id": "roof_metal_deck_bare", "name": "Metal Decking (Bare)", "component_type": "roof", "u_value": 6.5, "conductivity": 50.0, "density": 7800, "specific_heat": 450, "thickness": 5, "embodied_carbon": 2.2, "cost_index": 3, "source_citation": "Industrial Shed Standard"},
    {"id": "roof_asbestos", "name": "Corrugated Asbestos/Fibre Cement", "component_type": "roof", "u_value": 5.0, "conductivity": 0.9, "density": 1400, "specific_heat": 1000, "thickness": 6, "embodied_carbon": 0.8, "cost_index": 1, "source_citation": "BMTPC Baseline Housing"},
    {"id": "roof_thatch", "name": "Vernacular Thatch Roof", "component_type": "roof", "u_value": 1.2, "conductivity": 0.09, "density": 300, "specific_heat": 1800, "thickness": 100, "embodied_carbon": -0.2, "cost_index": 1, "source_citation": "IGBC Vernacular"},

    # --- Glazing: Advanced Optical & Thermal (Expanded) ---
    {"id": "glass_single_clear_6", "name": "Single Clear Glass (6mm)", "component_type": "glazing", "u_value": 5.8, "shgc": 0.82, "conductivity": 1.0, "density": 2500, "specific_heat": 840, "thickness": 6, "embodied_carbon": 1.2, "cost_index": 3, "source_citation": "Saint-Gobain India"},
    {"id": "glass_single_tinted_6", "name": "Single Tinted Glass (6mm)", "component_type": "glazing", "u_value": 5.8, "shgc": 0.65, "conductivity": 1.0, "density": 2500, "specific_heat": 840, "thickness": 6, "embodied_carbon": 1.3, "cost_index": 4, "source_citation": "Saint-Gobain India"},
    {"id": "glass_double_clear", "name": "Double Clear Glass (6/12/6)", "component_type": "glazing", "u_value": 2.8, "shgc": 0.75, "conductivity": 0.05, "density": 2500, "specific_heat": 840, "thickness": 24, "embodied_carbon": 2.4, "cost_index": 6, "source_citation": "Saint-Gobain India"},
    {"id": "glass_double_tinted", "name": "Double Tinted Glass (6/12/6)", "component_type": "glazing", "u_value": 2.8, "shgc": 0.50, "conductivity": 0.05, "density": 2500, "specific_heat": 840, "thickness": 24, "embodied_carbon": 2.5, "cost_index": 7, "source_citation": "Saint-Gobain India"},
    {"id": "glass_double_lowe", "name": "Double Glazed Low-E (6/12/6)", "component_type": "glazing", "u_value": 1.8, "shgc": 0.35, "conductivity": 0.04, "density": 2500, "specific_heat": 840, "thickness": 24, "embodied_carbon": 2.8, "cost_index": 8, "source_citation": "Saint-Gobain Advanced"},
    {"id": "glass_vig_ultra", "name": "Vacuum Insulated Glass (VIG Ultra)", "component_type": "glazing", "u_value": 0.45, "shgc": 0.35, "conductivity": 0.002, "density": 2500, "specific_heat": 840, "thickness": 10, "embodied_carbon": 3.4, "cost_index": 10, "source_citation": "VIG Windows 2024 Datasheet"},
    {"id": "glass_lowe_argon_triple", "name": "Triple Glazed Argon (6/12/6/12/6)", "component_type": "glazing", "u_value": 0.8, "shgc": 0.28, "conductivity": 0.016, "density": 2.5, "specific_heat": 1000, "thickness": 42, "embodied_carbon": 4.5, "cost_index": 10, "source_citation": "Saint-Gobain Advanced"},
    {"id": "glass_smart_tint_auto", "name": "Electrochromic Dynamic Tinting Glass", "component_type": "glazing", "u_value": 1.1, "shgc": 0.09, "conductivity": 0.012, "density": 2.5, "specific_heat": 850, "thickness": 24, "embodied_carbon": 5.2, "cost_index": 10, "source_citation": "SageGlass India Technical Data"}
]

def seed_materials():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(backend_dir, "data", "materials.csv")
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    df = pd.DataFrame(MATERIALS_DATA)
    df.to_csv(file_path, index=False)
    print(f"Material database seeded at {file_path}")

if __name__ == "__main__":
    seed_materials()
