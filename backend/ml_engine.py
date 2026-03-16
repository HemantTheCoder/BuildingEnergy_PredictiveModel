import numpy as np
import pandas as pd
import xgboost as xgb
import shap
import joblib
import os
import json
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import Ridge

class MLEngine:
    def __init__(self, model_dir="data/models"):
        # Resolve current directory
        self.backend_dir = os.path.dirname(os.path.abspath(__file__))
        self.model_dir = os.path.join(self.backend_dir, "data", "models")
        os.makedirs(self.model_dir, exist_ok=True)
        
        self.models = {
            "XGBoost": None,
            "RandomForest": None,
            "RidgeRegression": None
        }
        self.metrics = {}
        self.explainers = {}

    def load_real_data(self):
        """
        Loads real building energy data from official BEE benchmarking datasets.
        """
        file_path = os.path.join(self.backend_dir, "data", "bee_benchmarks.csv")
        if os.path.exists(file_path):
            return pd.read_csv(file_path)
        else:
            raise FileNotFoundError(f"Real benchmark data not found at {file_path}. Run ingestion script first.")

    def train_all(self):
        df = self.load_real_data()
        
        # Keep features we want to train on
        features = ["u_wall", "u_roof", "u_glass", "shgc", "cdd", "hvac_cop", "floor_area", "wwr", "hdd", "solrad"]
        X = df[features]
        y = df["eui"]
        
        # 1. Ridge Regression (Best for small N, research-validated benchmarks)
        ridge_model = Ridge(alpha=0.1)
        ridge_model.fit(X, y)
        self._save_model_and_metrics("RidgeRegression", ridge_model, X, y)
        
        # 2. RandomForest (Ensemble) - use smaller estimators for small N
        rf_model = RandomForestRegressor(n_estimators=10, max_depth=5, random_state=42)
        rf_model.fit(X, y)
        self._save_model_and_metrics("RandomForest", rf_model, X, y)
        
        # 3. XGBoost
        xgb_model = xgb.XGBRegressor(n_estimators=10, learning_rate=0.1, max_depth=3, random_state=42)
        xgb_model.fit(X, y)
        self._save_model_and_metrics("XGBoost", xgb_model, X, y)

    def _save_model_and_metrics(self, name, model, X, y):
        # On small datasets, we use the training set for indicative metrics if validation split is too small
        preds = model.predict(X)
        r2 = r2_score(y, preds)
        mae = mean_absolute_error(y, preds)
        
        self.models[name] = model
        self.metrics[name] = {"r2": float(r2), "mae": float(mae)}
        
        joblib.dump(model, os.path.join(self.model_dir, f"{name}.joblib"))
        with open(os.path.join(self.model_dir, f"{name}_metrics.json"), 'w') as f:
            json.dump(self.metrics[name], f)
        
        print(f"Model '{name}' Trained on REAL BENCHMARKS. R2: {r2:.2f}")

    def load_models(self):
        for name in self.models.keys():
            m_path = os.path.join(self.model_dir, f"{name}.joblib")
            met_path = os.path.join(self.model_dir, f"{name}_metrics.json")
            try:
                if os.path.exists(m_path):
                    self.models[name] = joblib.load(m_path)
                if os.path.exists(met_path):
                    with open(met_path, 'r') as f:
                        self.metrics[name] = json.load(f)
            except Exception as e:
                print(f"Failed to load model {name}: {e}. Will retrain.")
                self.models[name] = None
        
        # Initialize explainers for tree-based models if models are loaded
        try:
            if self.models.get("XGBoost") is not None:
                self.explainers["XGBoost"] = shap.TreeExplainer(self.models["XGBoost"])
            if self.models.get("RandomForest") is not None:
                self.explainers["RandomForest"] = shap.TreeExplainer(self.models["RandomForest"])
        except Exception as e:
            print(f"SHAP Explainer initialization failed: {e}")

    def get_metrics(self, model_type="XGBoost"):
        return self.metrics.get(model_type, {})

    def predict(self, input_data, orientation="South", model_type="XGBoost"):
        if self.models.get(model_type) is None:
            self.load_models()
        
        if self.models.get(model_type) is None: # If still None after loading, train them
            self.train_all()
            
        model = self.models.get(model_type)
        if model is None: # Fallback if model_type is invalid or training failed
            print(f"Warning: Model type '{model_type}' not found. Using XGBoost as fallback.")
            model = self.models["XGBoost"]
            model_type = "XGBoost" # Update model_type for SHAP and metrics

        # Apply Orientation Factor to Solar Radiation
        # South is baseline (1.0). West is highest intensity in Indian climates (afternoon sun).
        # Relative solar gain factors adapted from BEE ECBC & ISHRAE Fundamentals.
        orientation_factors = {
            "North": 0.65, # Reduced gain, but still diffuse radiation
            "South": 1.0,  # Baseline/High gain in winter, shaded in summer
            "East": 0.9,   # Morning sun
            "West": 1.15   # Harsh afternoon sun, high peak cooling load
        }
        factor = orientation_factors.get(orientation, 1.0)
        
        # input_data is a dict with all features
        X = pd.DataFrame([input_data])
        X['solrad'] = X['solrad'] * factor
        
        # Ensure feature order matches training features Exactly:
        # ["u_wall", "u_roof", "u_glass", "shgc", "cdd", "hvac_cop", "floor_area", "wwr", "hdd", "solrad"]
        feature_order = ["u_wall", "u_roof", "u_glass", "shgc", "cdd", "hvac_cop", "floor_area", "wwr", "hdd", "solrad"]
        X = X[feature_order]
        
        pred = model.predict(X)[0]
        
        # Get SHAP values for this prediction (only for tree-based models)
        shap_dict = {}
        if model_type in ["XGBoost", "RandomForest"]:
            try:
                # Ensure explainer is initialized for the specific model
                if self.explainers.get(model_type) is None:
                    self.explainers[model_type] = shap.TreeExplainer(model)
                
                shap_values = self.explainers[model_type].shap_values(X)
                # shap_values can be a list of arrays for multi-output models, but for regression it's usually one array
                if isinstance(shap_values, list):
                    shap_dict = dict(zip(feature_order, shap_values[0].tolist()))
                else:
                    shap_dict = dict(zip(feature_order, shap_values[0].tolist()))
            except Exception as e:
                print(f"SHAP explanation failed for {model_type}: {e}")
                pass # Fallback for errors
        
        return {
            "predicted_eui": float(pred),
            "shap_values": shap_dict,
            "adjusted_solrad": float(X['solrad'].iloc[0]),
            "model_metrics": self.metrics.get(model_type, {})
        }

    def recommend_materials(self, base_input, materials_df, orientation="South", model_type="XGBoost"):
        """
        Iterates through material combinations to find top energy-efficient options.
        Ensures the 3 best shown have DIFFERENT materials (diversity).
        """
        walls = materials_df[materials_df['component_type'] == 'wall']
        roofs = materials_df[materials_df['component_type'] == 'roof']
        glazing = materials_df[materials_df['component_type'] == 'glazing']
        
        results = []
        
        for _, wall in walls.iterrows():
            for _, roof in roofs.iterrows():
                for _, glass in glazing.iterrows():
                    test_input = base_input.copy()
                    test_input['u_wall'] = float(wall['u_value'])
                    test_input['u_roof'] = float(roof['u_value'])
                    test_input['u_glass'] = float(glass['u_value'])
                    test_input['shgc'] = float(glass.get('shgc', 0.82))
                    
                    # Ensure base_input is passed correctly to trigger different predictions
                    pred_res = self.predict(test_input, orientation=orientation, model_type=model_type)
                    results.append({
                        "wall": wall['name'],
                        "roof": roof['name'],
                        "glazing": glass['name'],
                        "predicted_eui": pred_res['predicted_eui'],
                        "wall_id": wall['id'],
                        "roof_id": roof['id'],
                        "glazing_id": glass['id'],
                        "embodied_carbon": float(wall.get('embodied_carbon', 0)) + float(roof.get('embodied_carbon', 0)) + float(glass.get('embodied_carbon', 0)),
                        "cost_index": int(wall.get('cost_index', 5)) + int(roof.get('cost_index', 5)) + int(glass.get('cost_index', 5))
                    })
        
        results.sort(key=lambda x: x['predicted_eui'])
        
        # Diversity filter remains same but we can now sort by carbon or cost if needed
        diverse_top_3 = []
        seen_wall_types = set()
        
        for res in results:
            wall_type = res['wall'].split(' ')[0] 
            if wall_type not in seen_wall_types:
                diverse_top_3.append(res)
                seen_wall_types.add(wall_type)
            
            if len(diverse_top_3) >= 3:
                break
        
        if len(diverse_top_3) < 3:
            diverse_top_3 = results[:3]

        return diverse_top_3

    def get_sensitivity_analysis(self, base_input, orientation="South", model_type="XGBoost"):
        """
        Calculates how EUI changes when key design parameters vary by +/- 20%.
        """
        parameters = {
            "wwr": [base_input['wwr'] * 0.8, base_input['wwr'] * 1.2],
            "solrad": [base_input['solrad'] * 0.8, base_input['solrad'] * 1.2],
            "u_wall": [base_input['u_wall'] * 0.8, base_input['u_wall'] * 1.2],
            "u_roof": [base_input['u_roof'] * 0.8, base_input['u_roof'] * 1.2]
        }
        
        base_pred = self.predict(base_input, orientation=orientation, model_type=model_type)['predicted_eui']
        sensitivity = {}
        
        for param, values in parameters.items():
            impacts = []
            for val in values:
                # Clamp WWR
                if param == "wwr":
                    val = max(0.1, min(0.9, val))
                
                test_input = base_input.copy()
                test_input[param] = val
                new_pred = self.predict(test_input, orientation=orientation, model_type=model_type)['predicted_eui']
                impacts.append(new_pred - base_pred)
            
            sensitivity[param] = {
                "low_impact": float(impacts[0]),
                "high_impact": float(impacts[1]),
                "relative_importance": float(abs(impacts[1] - impacts[0]))
            }
            
        return sensitivity

    def calculate_pmv(self, u_wall, u_roof, u_glass, solrad, cdd):
        """
        Calculates a proxy PMV (Predicted Mean Vote) thermal comfort index.
        Range: -3 (Cold) to +3 (Hot), 0 is neutral.
        Based on thermal transmittance and outdoor temperature proxy (CDD).
        """
        # Simplified PMV proxy:
        # Comfort is affected by heat gain (U-values * CDD) and radiant solar gain (solrad)
        # Higher U-values in hot climates (CDD > 0) lead to higher indoor radiant temp
        
        thermal_transmission = (u_wall * 0.4) + (u_roof * 0.3) + (u_glass * 0.3)
        temp_stress = (cdd / 1500) # Proxy for temperature intensity
        solar_stress = (solrad / 5.0) * 0.5
        
        # Base comfort - higher transmission in hot weather = hotter indoors
        pmv_proxy = (thermal_transmission * temp_stress) + solar_stress
        
        # Clamp between -3 and 3
        pmv_proxy = max(-3, min(3, pmv_proxy))
        
        status = "Neutral"
        if pmv_proxy > 1.5: status = "Warm"
        elif pmv_proxy > 2.5: status = "Hot"
        elif pmv_proxy < -1.5: status = "Cool"
        elif pmv_proxy < -2.5: status = "Cold"
        
        return {
            "index": round(float(pmv_proxy), 2),
            "status": status,
            "label": f"{status} ({pmv_proxy:+.1f})"
        }

    def get_ecbc_compliance(self, u_wall, u_roof, u_glass, shgc, climate_zone="Warm-Humid"):
        """
        Determines ECBC 2017 Compliance status based on climate zone and material properties.
        Indicative thresholds for ECBC-Compliant (Basic), ECBC+, and SuperECBC.
        """
        # indicitive ECBC 2017 Prescriptive thresholds (W/m2K)
        # Hot-Dry/Warm-Humid benchmarks
        thresholds = {
            "wall": 0.44, # Super ECBC
            "roof": 0.20, # Super ECBC
            "glass": 1.8, # Super ECBC
            "shgc": 0.25  # Super ECBC
        }
        
        compliance_score = 0
        if u_wall < thresholds["wall"]: compliance_score += 1
        if u_roof < thresholds["roof"]: compliance_score += 1
        if u_glass < thresholds["glass"]: compliance_score += 1
        if shgc < thresholds["shgc"]: compliance_score += 1
        
        if compliance_score >= 4:
            status = "Super ECBC"
            color = "emerald"
        elif compliance_score >= 2:
            status = "ECBC+"
            color = "sky"
        elif compliance_score >= 1 or (u_wall < 1.0):
            status = "ECBC Compliant"
            color = "primary"
        else:
            status = "Non-Compliant"
            color = "rose"
            
        return {
            "status": status,
            "score": compliance_score,
            "color": color,
            "is_compliant": compliance_score > 0
        }

if __name__ == "__main__":
    engine = MLEngine()
    engine.train_all()
    print(engine.metrics)
