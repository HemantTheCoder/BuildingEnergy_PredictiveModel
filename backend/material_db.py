import pandas as pd
import json
import os

# Material data based on BMTPC and typical Indian construction practices
# Sources: BMTPC, CPWD, Thermal Properties of Building Materials Technical Document
MATERIALS_DATA = [
    # --- Walls ---
    {
        "id": "wall_aac_block",
        "name": "AAC Block Wall (200mm)",
        "component_type": "wall",
        "u_value": 0.81,
        "conductivity": 0.16,
        "density": 600,
        "specific_heat": 1000,
        "thickness": 200,
        "source_citation": "BMTPC Thermal Properties Guide v1.0, Table 4.2",
        "official_ref": "BEE ECBC 2017 Appendix A",
        "source_url": "https://www.bmtpc.org/DataFiles/CMS/file/PDF_Files/ThermalProperitiesOfBldg_Material_Tech_v1.pdf",
        "shgc": None
    },
    {
        "id": "wall_burnt_clay_brick",
        "name": "Burnt Clay Brick Wall (230mm)",
        "component_type": "wall",
        "u_value": 2.1,
        "conductivity": 0.81,
        "density": 1800,
        "specific_heat": 880,
        "thickness": 230,
        "source_citation": "BMTPC Thermal Properties Guide v1.0, Table 1.1",
        "official_ref": "CPWD Analysis of Rates 2021",
        "source_url": "https://www.bmtpc.org/DataFiles/CMS/file/PDF_Files/ThermalProperitiesOfBldg_Material_Tech_v1.pdf",
        "shgc": None
    },
    {
        "id": "wall_insulated_brick",
        "name": "Insulated Brick Wall (230mm + 50mm EPS)",
        "component_type": "wall",
        "u_value": 0.45,
        "conductivity": 0.035,
        "density": 25,
        "specific_heat": 1200,
        "thickness": 280,
        "source_citation": "BEE Design Guide for Energy Efficient Buildings",
        "official_ref": "ECBC+ Compliance Standard",
        "source_url": "https://beeindia.gov.in/en/programmes/energy-conservation-building-code-ecbc",
        "shgc": None
    },
    # --- Roofs ---
    {
        "id": "roof_rcc_slab",
        "name": "RCC Slab (150mm)",
        "component_type": "roof",
        "u_value": 3.1,
        "conductivity": 1.58,
        "density": 2400,
        "specific_heat": 880,
        "thickness": 150,
        "source_citation": "BMTPC Thermal Properties Guide v1.0, Table 3.5",
        "official_ref": "IS 456:2000 Plain and Reinforced Concrete",
        "source_url": "https://www.bmtpc.org/DataFiles/CMS/file/PDF_Files/ThermalProperitiesOfBldg_Material_Tech_v1.pdf",
        "shgc": None
    },
    {
        "id": "roof_insulated_rcc",
        "name": "Insulated RCC Slab (150mm + 75mm XPS)",
        "component_type": "roof",
        "u_value": 0.35,
        "conductivity": 0.03,
        "density": 35,
        "specific_heat": 1400,
        "thickness": 225,
        "source_citation": "BEE User Guide for ECBC 2017",
        "official_ref": "Super ECBC Compliance Standard",
        "source_url": "https://beeindia.gov.in/en/programmes/energy-conservation-building-code-ecbc",
        "shgc": None
    },
    # --- Glazing ---
    {
        "id": "glass_single_clear",
        "name": "Single Clear Glass (6mm)",
        "component_type": "glazing",
        "u_value": 5.8,
        "shgc": 0.82,
        "conductivity": 1.0,
        "density": 2500,
        "specific_heat": 840,
        "thickness": 6,
        "source_citation": "Saint-Gobain India Product Catalog 2023",
        "official_ref": "IGDB v35.0 Standard",
        "source_url": "https://in.saint-gobain-glass.com/",
    },
    {
        "id": "glass_double_lowe",
        "name": "Double Glazed Low-E (6/12/6)",
        "component_type": "glazing",
        "u_value": 1.8,
        "shgc": 0.4,
        "conductivity": 0.024,
        "density": 1.2,
        "specific_heat": 1000,
        "thickness": 24,
        "source_citation": "Saint-Gobain India Product Catalog 2023",
        "official_ref": "IGDB v35.0 Standard",
        "source_url": "https://in.saint-gobain-glass.com/",
    }
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
