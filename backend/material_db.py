import pandas as pd
import json
import os

# Material data based on BMTPC and typical Indian construction practices
# Sources: BMTPC, CPWD, Thermal Properties of Building Materials Technical Document
MATERIALS_DATA = [
    # --- Walls: Masonry & Blocks (Corrected & Expanded) ---
    {"id": "wall_aac_150", "name": "AAC Block Wall (150mm)", "component_type": "wall", "u_value": 1.08, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 150, "embodied_carbon": 0.45, "cost_index": 4, "source_citation": "BEE ENS 2018 Technical Doc", "official_ref": "BEE ECBC 2017", "source_url": "https://beeindia.gov.in/"},
    {"id": "wall_aac_200", "name": "AAC Block Wall (200mm)", "component_type": "wall", "u_value": 0.81, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 200, "embodied_carbon": 0.45, "cost_index": 5, "source_citation": "BEE ENS 2018 Technical Doc", "official_ref": "BEE ECBC 2017", "source_url": "https://beeindia.gov.in/"},
    {"id": "wall_aac_250", "name": "AAC Block Wall (250mm)", "component_type": "wall", "u_value": 0.65, "conductivity": 0.162, "density": 600, "specific_heat": 1000, "thickness": 250, "embodied_carbon": 0.45, "cost_index": 6, "source_citation": "BEE ENS 2018 Technical Doc", "official_ref": "BEE ECBC 2017", "source_url": "https://beeindia.gov.in/"},
    {"id": "wall_clay_brick_230", "name": "Burnt Clay Brick Wall (230mm)", "component_type": "wall", "u_value": 2.1, "conductivity": 0.81, "density": 1800, "specific_heat": 880, "thickness": 230, "embodied_carbon": 0.72, "cost_index": 3, "source_citation": "CPWD Rates 2021", "official_ref": "IS 1077", "source_url": "https://cpwd.gov.in/"},
    {"id": "wall_flyash_230", "name": "Fly Ash Brick Wall (230mm)", "component_type": "wall", "u_value": 1.4, "conductivity": 0.5, "density": 1700, "specific_heat": 900, "thickness": 230, "embodied_carbon": 0.35, "cost_index": 3, "source_citation": "BMTPC Table 2.1", "official_ref": "Green Building Code IND", "source_url": "https://www.bmtpc.org/"},
    {"id": "wall_hempcrete_300", "name": "Hempcrete Sustainable Wall (300mm)", "component_type": "wall", "u_value": 0.33, "conductivity": 0.1, "density": 350, "specific_heat": 1500, "thickness": 300, "embodied_carbon": -0.12, "cost_index": 7, "source_citation": "Carbon-Negative Arch Report", "official_ref": "EPD Certified", "source_url": "https://www.iso.org/standard/66041.html"},
    {"id": "wall_aerogel_blanket_20", "name": "Aerogel Silica Blanket (20mm Internal)", "component_type": "wall", "u_value": 0.75, "conductivity": 0.015, "density": 150, "specific_heat": 1000, "thickness": 20, "embodied_carbon": 5.4, "cost_index": 10, "source_citation": "NREL Technical Data", "official_ref": "Advanced Insulation", "source_url": "https://www.nrel.gov/"},
    {"id": "wall_cseb_230", "name": "Compressed Stabilized Earth Block (230mm)", "component_type": "wall", "u_value": 1.6, "conductivity": 0.75, "density": 1900, "specific_heat": 1050, "thickness": 230, "embodied_carbon": 0.15, "cost_index": 2, "source_citation": "Auroville Earth Institute", "official_ref": "IS 1725", "source_url": "http://earth-auroville.com/"},

    # --- Insulation & Innovative High-Performance (Added VIP/PCM) ---
    {"id": "ins_vip_25", "name": "Vacuum Insulation Panel (VIP 25mm)", "component_type": "wall", "u_value": 0.16, "conductivity": 0.004, "density": 180, "specific_heat": 850, "thickness": 25, "embodied_carbon": 2.5, "cost_index": 10, "source_citation": "IEA EBC Annex 39", "official_ref": "High-Efficiency 2024", "source_url": "https://www.iea-ebc.org/"},
    {"id": "ins_pcm_board_15", "name": "Phase Change Material Board (15mm 29°C)", "component_type": "wall", "u_value": 0.85, "conductivity": 0.2, "density": 900, "specific_heat": 2000, "thickness": 15, "embodied_carbon": 1.8, "cost_index": 9, "source_citation": "CEBT/CARBSE 2024 Study", "official_ref": "Passive Cooling 2024", "source_url": "https://carbse.org/"},
    {"id": "ins_wood_fiber_100", "name": "Wood Fiber Insulation (100mm)", "component_type": "wall", "u_value": 0.38, "conductivity": 0.038, "density": 140, "specific_heat": 2100, "thickness": 100, "embodied_carbon": -0.4, "cost_index": 6, "source_citation": "Nature India Sustainability", "official_ref": "Carbon Sink Cert", "source_url": "https://www.nature.com/"},

    # --- Roofs: High Solar Reflectance & Thermal Mass ---
    {"id": "roof_rcc_150", "name": "RCC Slab (150mm) - Standard", "component_type": "roof", "u_value": 3.1, "conductivity": 1.58, "density": 2400, "specific_heat": 880, "thickness": 150, "embodied_carbon": 0.95, "cost_index": 6, "source_citation": "BMTPC Table 3.5", "official_ref": "IS 456:2000", "source_url": "https://www.bmtpc.org/"},
    {"id": "roof_sri_110_coating", "name": "Ultra-Cool Roof (SRI 110+ Coating)", "component_type": "roof", "u_value": 2.7, "conductivity": 1.4, "density": 2300, "specific_heat": 850, "thickness": 155, "embodied_carbon": 0.45, "cost_index": 5, "source_citation": "Cool Roof Rating Council", "official_ref": "BEE Star Rated 2024", "source_url": "https://coolroofs.org/"},
    {"id": "roof_green_smart", "name": "Smart Green Roof (Adaptive Irrigation)", "component_type": "roof", "u_value": 0.25, "conductivity": 0.12, "density": 900, "specific_heat": 2000, "thickness": 450, "embodied_carbon": 0.2, "cost_index": 9, "source_citation": "NIUA Sustainable Cities 2024", "official_ref": "IGBC Landscape v2", "source_url": "https://niua.in/"},
    {"id": "roof_rockwool_150", "name": "RCC (150mm) + 100mm Rockwool Insulation", "component_type": "roof", "u_value": 0.31, "conductivity": 0.035, "density": 100, "specific_heat": 840, "thickness": 250, "embodied_carbon": 1.1, "cost_index": 8, "source_citation": "BEE ECSBC 2024 Draft", "official_ref": "Super ECBC", "source_url": "https://beeindia.gov.in/"},

    # --- Glazing: Advanced Optical & Thermal (Added VIG) ---
    {"id": "glass_single_clear_6", "name": "Single Clear Glass (6mm)", "component_type": "glazing", "u_value": 5.8, "shgc": 0.82, "conductivity": 1.0, "density": 2500, "specific_heat": 840, "thickness": 6, "embodied_carbon": 1.2, "cost_index": 3, "source_citation": "Saint-Gobain India", "official_ref": "IGDB v35.0", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_vig_ultra", "name": "Vacuum Insulated Glass (VIG Ultra)", "component_type": "glazing", "u_value": 0.45, "shgc": 0.35, "conductivity": 0.002, "density": 2500, "specific_heat": 840, "thickness": 10, "embodied_carbon": 3.4, "cost_index": 10, "source_citation": "VIG Windows 2024 Datasheet", "official_ref": "Net Zero Ready", "source_url": "https://vigwindows.com/"},
    {"id": "glass_lowe_argon_triple", "name": "Triple Glazed Argon (6/12/6/12/6)", "component_type": "glazing", "u_value": 0.8, "shgc": 0.28, "conductivity": 0.016, "density": 2.5, "specific_heat": 1000, "thickness": 42, "embodied_carbon": 4.5, "cost_index": 10, "source_citation": "Saint-Gobain Advanced", "official_ref": "Zero Energy Building", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_smart_tint_auto", "name": "Electrochromic Dynamic Tinting Glass", "component_type": "glazing", "u_value": 1.1, "shgc": 0.09, "conductivity": 0.012, "density": 2.5, "specific_heat": 850, "thickness": 24, "embodied_carbon": 5.2, "cost_index": 10, "source_citation": "SageGlass India Technical Data", "official_ref": "ECSBC 2024 Adaptive", "source_url": "https://www.sageglass.com/"},
    {"id": "glass_polycarb_multi", "name": "Polycarbonate Multiwall (25mm Skylight)", "component_type": "glazing", "u_value": 1.5, "shgc": 0.45, "conductivity": 0.18, "density": 1200, "specific_heat": 1200, "thickness": 25, "embodied_carbon": 4.2, "cost_index": 6, "source_citation": "Sabic Lexan 2024 Docs", "official_ref": "Commercial Skylight", "source_url": "https://www.sabic.com/"}
]

def seed_materials():
    file_path = "data/materials.csv"
    df = pd.DataFrame(MATERIALS_DATA)
    df.to_csv(file_path, index=False)
    print(f"Material database seeded at {file_path}")

if __name__ == "__main__":
    if not os.path.exists("data"):
        os.makedirs("data")
    seed_materials()
