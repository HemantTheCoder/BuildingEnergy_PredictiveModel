from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, List, Optional
import uvicorn
import os
import json
import pandas as pd
import traceback
from data_fetcher import ClimateFetcher
from ml_engine import MLEngine

app = FastAPI(title="Climate-aware Material Recommendation & EUI Predictor")
fetcher = ClimateFetcher()
engine = MLEngine()

@app.on_event("startup")
async def startup_event():
    print("Starting up Energy Prediction Engine...")
    try:
        engine.load_models()
        if not any(engine.models.values()):
            print("No pre-trained models found. Training now (may take a moment)...")
            engine.train_all()
        print("Startup complete. Models ready.")
    except Exception as e:
        print(f"CRITICAL STARTUP ERROR: {e}")
        traceback.print_exc()

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
    occupancy_density: Optional[float] = 0.1 # ppl/m2
    equipment_load: Optional[float] = 10.0 # W/m2
    orientation: Optional[str] = "South"
    material_overrides: Optional[Dict[str, str]] = None
    property_overrides: Optional[Dict[str, float]] = None
    climate_overrides: Optional[Dict[str, float]] = None
    model_type: Optional[str] = "XGBoost"

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
    # expanded list of 100+ major and tier-2 Indian cities
    cities = [
        "Mumbai, India", "Delhi, India", "Bangalore, India", "Hyderabad, India", "Ahmedabad, India", 
        "Chennai, India", "Kolkata, India", "Surat, India", "Pune, India", "Jaipur, India", 
        "Lucknow, India", "Kanpur, India", "Nagpur, India", "Indore, India", "Thane, India", 
        "Bhopal, India", "Visakhapatnam, India", "Pimpri-Chinchwad, India", "Patna, India", "Vadodara, India",
        "Ghaziabad, India", "Ludhiana, India", "Coimbatore, India", "Agra, India", "Madurai, India", 
        "Nashik, India", "Faridabad, India", "Meerut, India", "Rajkot, India", "Kalyan-Dombivli, India", 
        "Vasai-Virar, India", "Varanasi, India", "Srinagar, India", "Aurangabad, India", "Dhanbad, India", 
        "Amritsar, India", "Navi Mumbai, India", "Allahabad, India", "Ranchi, India", "Howrah, India", 
        "Jabalpur, India", "Gwalior, India", "Vijayawada, India", "Jodhpur, India", "Raipur, India", 
        "Kota, India", "Guwahati, India", "Chandigarh, India", "Solapur, India", "Hubli-Dharwad, India", 
        "Bareilly, India", "Moradabad, India", "Mysore, India", "Gurgaon, India", "Aligarh, India", 
        "Jalandhar, India", "Tiruchirappalli, India", "Bhubaneswar, India", "Salem, India", "Warangal, India", 
        "Mira-Bhayandar, India", "Thiruvananthapuram, India", "Bhiwandi, India", "Saharanpur, India", "Guntur, India", 
        "Amravati, India", "Bikaner, India", "Noida, India", "Jamshedpur, India", "Bhilai, India", 
        "Cuttack, India", "Firozabad, India", "Kochi, India", "Nellore, India", "Bhavnagar, India", 
        "Dehradun, India", "Durgapur, India", "Asansol, India", "Rourkela, India", "Nanded, India", 
        "Kolhapur, India", "Ajmer, India", "Akola, India", "Gulbarga, India", "Jamnagar, India", 
        "Ujjain, India", "Loni, India", "Siliguri, India", "Jhansi, India", "Ulhasnagar, India", 
        "Gangtok, India", "Itanagar, India", "Kohima, India", "Imphal, India", "Aizawl, India"
    ]
    return sorted(cities)

@app.get("/models")
async def get_models():
    return {
        "available_models": list(engine.models.keys()),
        "metrics": engine.metrics
    }

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
        if not climate:
             # Fallback to a generic climate if API fails
             climate = {
                 "cdd": 2500,
                 "hdd": 100,
                 "annual_solrad": 5.5,
                 "source": "Fallback (API Timeout)"
             }
    
    # 2. Get Materials
    if not os.path.exists("data/materials.csv"):
         from material_db import seed_materials
         seed_materials()
    materials_df = pd.read_csv("data/materials.csv")
    
    # Updated HVAC COP mapping for Indian Context
    cop_map = {
        "Split/Window AC": 2.8,  # Typical DX systems
        "Central Chiller (VAV)": 3.2, # Large commercial installations
        "Variable Refrigerant Flow (VRF)": 3.8, # High efficiency multizone
        "Evaporative Cooler": 8.0  # High 'apparent' COP but constrained by humidity
    }
    hvac_cop = cop_map.get(request.hvac_type, 3.0)
    
    # Internal Gains Adjustment
    # EUI impact scale based on benchmarks: 10% increase per ppl/m2 and 5% per 10W load 
    internal_gain_factor = 1.0 + (request.occupancy_density * 0.5) + (request.equipment_load / 100.0)

    # Find material properties (default or overrides)
    def get_material_data(comp_type, name_override=None, climate_data=None):
        if name_override:
            if name_override.startswith("Custom:"):
                return {
                    "name": name_override,
                    "u_value": 0.0,
                    "shgc": 0.0,
                    "embodied_carbon": 0.0,
                    "cost_index": 5
                }
            match = materials_df[materials_df['name'] == name_override]
            if not match.empty:
                return match.iloc[0].to_dict()
        
        # Adaptive Default Fallback
        is_cold = climate_data and climate_data.get('hdd', 0) > 1000
        defaults = {
            "wall": "AAC Block Wall (200mm)" if not is_cold else "Insulated Brick Wall (230mm + 50mm EPS)",
            "roof": "RCC Slab (150mm)" if not is_cold else "Insulated RCC Slab (150mm + 75mm XPS)", 
            "glazing": "Single Clear Glass (6mm)" if not is_cold else "Double Glazed Low-E (6/12/6)"
        }
        match = materials_df[materials_df['name'] == defaults[comp_type]]
        return match.iloc[0].to_dict()

    wall_data = get_material_data("wall", request.material_overrides.get("wall") if request.material_overrides else None, climate)
    roof_data = get_material_data("roof", request.material_overrides.get("roof") if request.material_overrides else None, climate)
    glazing_data = get_material_data("glazing", request.material_overrides.get("glazing") if request.material_overrides else None, climate)

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
    prediction = engine.predict(input_data, orientation=request.orientation, model_type=request.model_type)
    predicted_eui = prediction['predicted_eui'] * internal_gain_factor
    
    # 5. Recommend
    recommendations = engine.recommend_materials(input_data, materials_df, orientation=request.orientation, model_type=request.model_type)
    
    # 6. Sensitivity
    sensitivity = engine.get_sensitivity_analysis(input_data, orientation=request.orientation, model_type=request.model_type)

    # 7. Thermal Comfort (PMV)
    comfort = engine.calculate_pmv(u_wall, u_roof, u_glass, climate['annual_solrad'], climate['cdd'])

    # 8. ECBC Compliance
    compliance = engine.get_ecbc_compliance(u_wall, u_roof, u_glass, shgc)

    return {
        "predicted_eui": float(predicted_eui),
        "shap_values": prediction['shap_values'],
        "adjusted_solrad": prediction.get('adjusted_solrad'),
        "model_metrics": prediction.get('model_metrics', {}),
        "sensitivity_analysis": sensitivity,
        "thermal_comfort": comfort,
        "ecbc_compliance": compliance,
        "top_material_recommendations": recommendations,
        "climate_summary": climate,
        "material_sources": {
            "wall": {"name": wall_data['name'], "citation": wall_data.get('source_citation'), "ref": wall_data.get('official_ref'), "url": wall_data.get('source_url'), "carbon": float(wall_data.get('embodied_carbon', 0))},
            "roof": {"name": roof_data['name'], "citation": roof_data.get('source_citation'), "ref": roof_data.get('official_ref'), "url": roof_data.get('source_url'), "carbon": float(roof_data.get('embodied_carbon', 0))},
            "glazing": {"name": glazing_data['name'], "citation": glazing_data.get('source_citation'), "ref": glazing_data.get('official_ref'), "url": glazing_data.get('source_url'), "carbon": float(glazing_data.get('embodied_carbon', 0))}
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
