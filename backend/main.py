from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn
import os
import json
import pandas as pd
from data_fetcher import ClimateFetcher
from ml_engine import MLEngine

app = FastAPI(title="Climate-aware Material Recommendation & EUI Predictor")
fetcher = ClimateFetcher()
engine = MLEngine()

# Ensure model is trained on startup
if not os.path.exists("data/model.joblib"):
    engine.train()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    city: str
    archetype: str
    floor_area_m2: float
    wwr: float
    hvac_type: str
    material_overrides: Optional[Dict[str, str]] = None
    property_overrides: Optional[Dict[str, float]] = None
    climate_overrides: Optional[Dict[str, float]] = None

@app.get("/")
async def root():
    return {"message": "Welcome to the Building Energy Predictor API"}

@app.get("/materials")
async def get_materials():
    if not os.path.exists("data/materials.csv"):
        from material_db import seed_materials
        seed_materials()
    
    df = pd.read_csv("data/materials.csv")
    records = df.to_dict(orient="records")
    # Robustly replace NaN with None for JSON compliance
    return [{k: (None if pd.isna(v) else v) for k, v in r.items()} for r in records]

@app.get("/cities")
async def get_cities():
    # A curated list of major Indian cities for the MVP
    cities = [
        "Mumbai, India", "Delhi, India", "Bangalore, India", "Hyderabad, India", 
        "Ahmedabad, India", "Chennai, India", "Kolkata, India", "Surat, India", 
        "Pune, India", "Jaipur, India", "Lucknow, India", "Kanpur, India", 
        "Nagpur, India", "Indore, India", "Thane, India", "Bhopal, India", 
        "Visakhapatnam, India", "Pimpri-Chinchwad, India", "Patna, India", "Vadodara, India"
    ]
    return cities

@app.get("/fetch_climate")
async def get_climate(city: str):
    lat, lon = fetcher.get_lat_lon(city)
    if not lat:
        raise HTTPException(status_code=404, detail="City not found")
    data = fetcher.fetch_climate_data(lat, lon)
    if not data:
        raise HTTPException(status_code=500, detail="Error fetching climate data")
    return {"lat": lat, "lon": lon, **data}

@app.post("/predict")
async def predict(request: PredictRequest):
    # 1. Resolve Climate
    if request.climate_overrides and all(k in request.climate_overrides for k in ['cdd', 'hdd', 'annual_solrad']):
        climate = request.climate_overrides
    else:
        lat, lon = fetcher.get_lat_lon(request.city)
        if not lat:
            raise HTTPException(status_code=404, detail="City not found")
        climate = fetcher.fetch_climate_data(lat, lon)
    
    # 2. Get Materials
    if not os.path.exists("data/materials.csv"):
         from material_db import seed_materials
         seed_materials()
    materials_df = pd.read_csv("data/materials.csv")
    
    # 3. Prepare Base Features
    # Note: Simplified HVAC COP mapping
    cop_map = {"VAV": 3.0, "Split AC": 2.8, "Variable Refrigerant Flow (VRF)": 3.8}
    hvac_cop = cop_map.get(request.hvac_type, 3.0)
    
    # Find material properties (default or overrides)
    def get_material_data(comp_type, name_override=None):
        if name_override:
            match = materials_df[materials_df['name'] == name_override]
            if not match.empty:
                return match.iloc[0].to_dict()
        
        # Default fallback
        defaults = {"wall": "Burnt Clay Brick Wall (230mm)", "roof": "RCC Slab (150mm)", "glazing": "Single Clear Glass (6mm)"}
        match = materials_df[materials_df['name'] == defaults[comp_type]]
        return match.iloc[0].to_dict()

    wall_data = get_material_data("wall", request.material_overrides.get("wall") if request.material_overrides else None)
    roof_data = get_material_data("roof", request.material_overrides.get("roof") if request.material_overrides else None)
    glazing_data = get_material_data("glazing", request.material_overrides.get("glazing") if request.material_overrides else None)

    # Apply direct property overrides if provided (Custom Inputs)
    u_wall = request.property_overrides.get("u_wall") if request.property_overrides and "u_wall" in request.property_overrides else wall_data['u_value']
    u_roof = request.property_overrides.get("u_roof") if request.property_overrides and "u_roof" in request.property_overrides else roof_data['u_value']
    u_glass = request.property_overrides.get("u_glass") if request.property_overrides and "u_glass" in request.property_overrides else glazing_data['u_value']
    shgc = request.property_overrides.get("shgc") if request.property_overrides and "shgc" in request.property_overrides else glazing_data.get('shgc', 0.82)

    input_data = {
        "floor_area": request.floor_area_m2,
        "wwr": request.wwr,
        "u_wall": u_wall,
        "u_roof": u_roof,
        "u_glass": u_glass,
        "shgc": shgc,
        "cdd": climate['cdd'],
        "hdd": climate['hdd'],
        "solrad": climate['annual_solrad'],
        "hvac_cop": hvac_cop
    }
    
    # 4. Predict
    prediction = engine.predict(input_data)
    
    # 5. Recommend
    recommendations = engine.recommend_materials(input_data, materials_df)
    
    return {
        "predicted_eui": prediction['predicted_eui'],
        "shap_values": prediction['shap_values'],
        "top_material_recommendations": recommendations,
        "climate_summary": climate,
        "material_sources": {
            "wall": {"name": wall_data['name'], "citation": wall_data.get('source_citation'), "ref": wall_data.get('official_ref'), "url": wall_data.get('source_url')},
            "roof": {"name": roof_data['name'], "citation": roof_data.get('source_citation'), "ref": roof_data.get('official_ref'), "url": roof_data.get('source_url')},
            "glazing": {"name": glazing_data['name'], "citation": glazing_data.get('source_citation'), "ref": glazing_data.get('official_ref'), "url": glazing_data.get('source_url')}
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
