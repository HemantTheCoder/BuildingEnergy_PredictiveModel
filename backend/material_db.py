import pandas as pd
import json
import os

# Material data based on BMTPC and typical Indian construction practices
# Sources: BMTPC, CPWD, Thermal Properties of Building Materials Technical Document
MATERIALS_DATA = [
    # --- Walls (Comprehensive) ---
    {"id": "wall_aac_block", "name": "AAC Block Wall (200mm)", "component_type": "wall", "u_value": 0.81, "conductivity": 0.16, "density": 600, "specific_heat": 1000, "thickness": 200, "source_citation": "BMTPC Thermal Properties Guide v1.0", "official_ref": "BEE ECBC 2017 App A", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "wall_burnt_clay_brick", "name": "Burnt Clay Brick Wall (230mm)", "component_type": "wall", "u_value": 2.1, "conductivity": 0.81, "density": 1800, "specific_heat": 880, "thickness": 230, "source_citation": "BMTPC Thermal Properties Guide v1.0", "official_ref": "CPWD Rates 2021", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "wall_insulated_brick", "name": "Insulated Brick Wall (230mm + 50mm EPS)", "component_type": "wall", "u_value": 0.45, "conductivity": 0.035, "density": 25, "specific_heat": 1200, "thickness": 280, "source_citation": "BEE Design Guide", "official_ref": "ECBC+ Standard", "source_url": "https://beeindia.gov.in/", "shgc": None},
    {"id": "wall_fly_ash_brick", "name": "Fly Ash Brick Wall (230mm)", "component_type": "wall", "u_value": 1.4, "conductivity": 0.5, "density": 1700, "specific_heat": 900, "thickness": 230, "source_citation": "BMTPC Table 2.1", "official_ref": "Green Building Code IND", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "wall_laterite_stone", "name": "Laterite Stone Masonry (300mm)", "component_type": "wall", "u_value": 1.8, "conductivity": 0.7, "density": 1600, "specific_heat": 850, "thickness": 300, "source_citation": "BMTPC Traditional Materials v1.0", "official_ref": "Vernacular Building Standards", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "wall_granite_cladding", "name": "RCC + Granite Cladding (150mm + 30mm)", "component_type": "wall", "u_value": 2.8, "conductivity": 2.5, "density": 2600, "specific_heat": 800, "thickness": 180, "source_citation": "IS 1123:1998", "official_ref": "CPWD Specs 2019", "source_url": "https://cpwd.gov.in/", "shgc": None},
    {"id": "wall_earth_rammed", "name": "Rammed Earth Wall (450mm)", "component_type": "wall", "u_value": 1.0, "conductivity": 0.6, "density": 1900, "specific_heat": 1100, "thickness": 450, "source_citation": "UNESCO Chair Earth Architecture", "official_ref": "IGBC Green Homes", "source_url": "http://earth-auroville.com/", "shgc": None},
    {"id": "wall_clc_block", "name": "Cellular Light Concrete (CLC) (200mm)", "component_type": "wall", "u_value": 0.6, "conductivity": 0.12, "density": 800, "specific_heat": 1000, "thickness": 200, "source_citation": "BMTPC Table 4.3", "official_ref": "BEE ECBC 2017", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "wall_timber_stud", "name": "Timber Stud Wall (150mm + Fiber Insulation)", "component_type": "wall", "u_value": 0.35, "conductivity": 0.04, "density": 500, "specific_heat": 1400, "thickness": 150, "source_citation": "IS 3629:1986 Structural Timber", "official_ref": "ECBC User Guide", "source_url": "https://bis.gov.in/", "shgc": None},
    {"id": "wall_ferro_cement", "name": "Ferro-Cement Panel (50mm)", "component_type": "wall", "u_value": 3.2, "conductivity": 1.0, "density": 2400, "specific_heat": 880, "thickness": 50, "source_citation": "HUDCO Prefab Systems", "official_ref": "CPWD Low Cost Housing", "source_url": "https://hudco.org/", "shgc": None},

    # --- Roofs (Comprehensive) ---
    {"id": "roof_rcc_slab", "name": "RCC Slab (150mm)", "component_type": "roof", "u_value": 3.1, "conductivity": 1.58, "density": 2400, "specific_heat": 880, "thickness": 150, "source_citation": "BMTPC Table 3.5", "official_ref": "IS 456:2000", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "roof_insulated_rcc", "name": "Insulated RCC Slab (150mm + 75mm XPS)", "component_type": "roof", "u_value": 0.35, "conductivity": 0.03, "density": 35, "specific_heat": 1400, "thickness": 225, "source_citation": "BEE Guide ECBC 2017", "official_ref": "Super ECBC Standard", "source_url": "https://beeindia.gov.in/", "shgc": None},
    {"id": "roof_micro_tile", "name": "Micro Concrete Roofing (MCR) Tiles", "component_type": "roof", "u_value": 2.8, "conductivity": 1.1, "density": 2000, "specific_heat": 900, "thickness": 20, "source_citation": "TARU Leading Edge Research", "official_ref": "BMTPC Approved Formwork", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "roof_metal_deck", "name": "Metal Deck Roof (100mm + PUF)", "component_type": "roof", "u_value": 0.22, "conductivity": 0.022, "density": 40, "specific_heat": 1500, "thickness": 100, "source_citation": "Tata BlueScope Product Catalog", "official_ref": "BEE Performance Rating", "source_url": "https://tatabluescopesteel.com/", "shgc": None},
    {"id": "roof_inverted_pots", "name": "Inverted Earthen Pots (Kullad) Insulation", "component_type": "roof", "u_value": 1.2, "conductivity": 0.6, "density": 1400, "specific_heat": 1200, "thickness": 250, "source_citation": "NIUA Sustainable Cities Guide", "official_ref": "Vernacular Passive Cooling", "source_url": "https://niua.in/", "shgc": None},
    {"id": "roof_mangalore_tile", "name": "Mangalore Tiles with Timber Deck", "component_type": "roof", "u_value": 2.4, "conductivity": 0.8, "density": 1800, "specific_heat": 800, "thickness": 40, "source_citation": "BMTPC Table 3.1", "official_ref": "South India Trad Specs", "source_url": "https://www.bmtpc.org/", "shgc": None},
    {"id": "roof_white_reflective", "name": "Cool Roof (White Reflective Coating)", "component_type": "roof", "u_value": 2.8, "conductivity": 1.4, "density": 2300, "specific_heat": 850, "thickness": 155, "source_citation": "CRRC Approved Coatings", "official_ref": "TS Cool Roof Policy", "source_url": "https://coolroofs.org/", "shgc": None},

    # --- Glazing (Comprehensive) ---
    {"id": "glass_single_clear", "name": "Single Clear Glass (6mm)", "component_type": "glazing", "u_value": 5.8, "shgc": 0.82, "conductivity": 1.0, "density": 2500, "specific_heat": 840, "thickness": 6, "source_citation": "Saint-Gobain India 2023", "official_ref": "IGDB v35.0", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_double_lowe", "name": "Double Glazed Low-E (6/12/6)", "component_type": "glazing", "u_value": 1.8, "shgc": 0.4, "conductivity": 0.024, "density": 1.2, "specific_heat": 1000, "thickness": 24, "source_citation": "Saint-Gobain India 2023", "official_ref": "IGDB v35.0", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_double_tinted", "name": "Double Glazed Tinted (Green/Bronze)", "component_type": "glazing", "u_value": 2.8, "shgc": 0.35, "conductivity": 0.03, "density": 2500, "specific_heat": 840, "thickness": 24, "source_citation": "Saint-Gobain India 2023", "official_ref": "BEE ECBC Standard", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_reflective", "name": "Reflective High Performance (ST 167)", "component_type": "glazing", "u_value": 1.6, "shgc": 0.22, "conductivity": 0.02, "density": 2500, "specific_heat": 840, "thickness": 24, "source_citation": "Saint-Gobain SGG Cool-Lite", "official_ref": "Super ECBC Compliant", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_triple_argon", "name": "Triple Glazed Argon Filled (6/12/6/12/6)", "component_type": "glazing", "u_value": 0.8, "shgc": 0.3, "conductivity": 0.016, "density": 2.5, "specific_heat": 1000, "thickness": 42, "source_citation": "Saint-Gobain Advanced Optics", "official_ref": "Zero Energy Building IND", "source_url": "https://in.saint-gobain-glass.com/"},
    {"id": "glass_polycarb", "name": "Multiwall Polycarbonate Sheet (16mm)", "component_type": "glazing", "u_value": 2.1, "shgc": 0.6, "conductivity": 0.2, "density": 1200, "specific_heat": 1200, "thickness": 16, "source_citation": "Lexan Product Datasheet", "official_ref": "CPWD Skylight Specs", "source_url": "https://www.sabic.com/", "shgc": 0.6}
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
