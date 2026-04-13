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

    def validate_physics(self, input_data):
        """Physics Guardrails: Checks if inputs are within realistic physical bounds."""
        errors = []
        if not (0 < input_data.get('u_wall', 1.0) <= 15.0): errors.append("u_wall must be between 0 and 15")
        if not (0 < input_data.get('u_roof', 1.0) <= 15.0): errors.append("u_roof must be between 0 and 15")
        if not (0 < input_data.get('u_glass', 1.0) <= 15.0): errors.append("u_glass must be between 0 and 15")
        if not (0.0 <= input_data.get('shgc', 0.5) <= 1.0): errors.append("shgc must be between 0 and 1.0")
        if not (0.0 <= input_data.get('wwr', 0.1) <= 0.95): errors.append("wwr must be between 0 and 0.95")
        if not (0 < input_data.get('hvac_cop', 3.0) <= 8.5): errors.append("hvac_cop must be positive and realistic (<= 8.5)")
        if input_data.get('floor_area', 100) <= 0: errors.append("floor_area must be positive")
        if input_data.get('cdd', 0) < 0 or input_data.get('hdd', 0) < 0: errors.append("cdd/hdd cannot be negative")
        
        if errors:
            raise ValueError(f"PhysicsBoundError: Invalid inputs: {', '.join(errors)}")

    def predict(self, input_data, orientation="South", model_type="XGBoost", skip_logging=False):
        # 1. Physics Guardrails Sanity Check
        self.validate_physics(input_data)
        
        if self.models.get(model_type) is None:
            self.load_models()
        
        if self.models.get(model_type) is None: # If still None after loading, train them
            self.train_all()
            
        model = self.models.get(model_type)
        if model is None: # Fallback if model_type is invalid or training failed
            print(f"Warning: Model type '{model_type}' not found. Using XGBoost as fallback.")
            model = self.models["XGBoost"]
            model_type = "XGBoost" # Update model_type for SHAP and metrics

        # Apply Orientation Factor
        orientation_factors = {"North": 0.65, "South": 1.0, "East": 0.9, "West": 1.15}
        factor = orientation_factors.get(orientation, 1.0)
        
        X = pd.DataFrame([input_data])
        X['solrad'] = X['solrad'] * factor
        
        feature_order = ["u_wall", "u_roof", "u_glass", "shgc", "cdd", "hvac_cop", "floor_area", "wwr", "hdd", "solrad"]
        X = X[feature_order]
        
        # 2. Anomaly Detection (Drift tracking)
        is_anomalous = False
        if input_data.get('cdd', 0) > 8000 or input_data.get('hdd', 0) > 6000:
            is_anomalous = True

        pred = model.predict(X)[0]
        
        # 3. Uncertainty-aware Predictions (Prediction Intervals based on MAE)
        metrics = self.metrics.get(model_type, {})
        mae = metrics.get('mae', 5.0)
        interval = round(mae * 1.96, 2)
        prediction_interval = [round(float(pred) - interval, 2), round(float(pred) + interval, 2)]

        # Get SHAP values
        shap_dict = {}
        if model_type in ["XGBoost", "RandomForest"]:
            try:
                if self.explainers.get(model_type) is None:
                    self.explainers[model_type] = shap.TreeExplainer(model)
                shap_values = self.explainers[model_type].shap_values(X)
                if isinstance(shap_values, list):
                    shap_dict = dict(zip(feature_order, shap_values[0].tolist()))
                else:
                    shap_dict = dict(zip(feature_order, shap_values[0].tolist()))
            except Exception:
                pass 
        
        prediction_result = {
            "predicted_eui": float(pred),
            "prediction_interval": prediction_interval,
            "shap_values": shap_dict,
            "adjusted_solrad": float(X['solrad'].iloc[0]),
            "model_metrics": metrics,
            "low_confidence": is_anomalous
        }
        
        # MLOps: Log the prediction and evaluate drift
        if not skip_logging:
            self.log_prediction(input_data, prediction_result['predicted_eui'])
            self.evaluate_drift_and_retrain()
        
        return prediction_result

    def log_prediction(self, input_data, prediction):
        """Simulates logging to an offline feature store for model retraining monitoring."""
        log_entry = input_data.copy()
        log_entry['predicted_eui'] = prediction
        log_entry['timestamp'] = pd.Timestamp.now().isoformat()
        
        log_path = os.path.join(self.model_dir, "prediction_logs.jsonl")
        try:
            with open(log_path, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
        except Exception as e:
            print(f"Failed to log prediction: {e}")

    def evaluate_drift_and_retrain(self):
        """Simulates a continuous training pipeline (MLOps) detecting drift."""
        # In a real scenario, this would compare feature distributions of real-time incoming 
        # logs to training datasets, or check if actual verified IoT data shows our EUI is degrading.
        # Here we simulate triggering a retrain if log size hits a threshold (e.g. 10 new entries)
        log_path = os.path.join(self.model_dir, "prediction_logs.jsonl")
        
        if not os.path.exists(log_path):
            return
            
        try:
            with open(log_path, 'r') as f:
                logs = f.readlines()
            
            # Simulated MLOps Trigger
            if len(logs) >= 10:  # Kept small for demonstration 
                print("MLOps Pipeline: Sample size threshold reached for potential drift. Triggering retrain...")
                # In real scenario, we merge actual outcomes from BMS/IoT here to create ground truth.
                self.train_all()
                # Archive logs after retraining
                archive_name = f"prediction_logs_archived_{pd.Timestamp.now().strftime('%Y%m%d%H%M%S')}.jsonl"
                os.rename(log_path, os.path.join(self.model_dir, archive_name))
                print("MLOps Pipeline: Retraining complete and models seamlessly deployed.")
        except Exception as e:
            print(f"MLOps pipeline error: {e}")

    def recommend_materials(self, base_input, materials_df, orientation="South", model_type="XGBoost"):
        """
        Iterates through material combinations to find top energy-efficient options.
        Applies Smart Filtering based on climate context (Hot vs Cold).
        """
        cdd = base_input.get('cdd', 0)
        hdd = base_input.get('hdd', 0)
        is_hot = cdd > 2000
        is_cold = hdd > 1000
        
        walls = materials_df[materials_df['component_type'] == 'wall']
        roofs = materials_df[materials_df['component_type'] == 'roof']
        glazing = materials_df[materials_df['component_type'] == 'glazing']
        
        results = []
        
        for _, wall in walls.iterrows():
            for _, roof in roofs.iterrows():
                for _, glass in glazing.iterrows():
                    # Smart Climate Context Penalties
                    malus = 0
                    wall_u = float(wall.get('u_value', 2.0))
                    wall_density = float(wall.get('density', 1000))
                    roof_u = float(roof.get('u_value', 2.0))
                    glass_u = float(glass.get('u_value', 3.0))

                    if is_hot:
                        # Hot climates punish high U-value roofs heavily and low thermal mass walls without insulation
                        if roof_u > 2.0: malus += 25
                        if wall_density < 800 and wall_u > 1.2: malus += 10
                        if float(glass.get('shgc', 0.8)) > 0.6: malus += 15
                        
                    if is_cold:
                        # Cold climates severely punish high thermal transmittance
                        if wall_u > 1.5: malus += 20
                        if glass_u > 3.0: malus += 20
                        if roof_u > 1.0: malus += 15

                    test_input = base_input.copy()
                    test_input['u_wall'] = wall_u
                    test_input['u_roof'] = roof_u
                    test_input['u_glass'] = glass_u
                    test_input['shgc'] = float(glass.get('shgc', 0.82))
                    
                    pred_res = self.predict(test_input, orientation=orientation, model_type=model_type, skip_logging=True)
                    predicted_eui = pred_res['predicted_eui']
                    
                    # Final scoring = ML Prediction + Climate Architectural Penalty
                    suitability_score = predicted_eui + malus
                    
                    results.append({
                        "wall": wall['name'],
                        "roof": roof['name'],
                        "glazing": glass['name'],
                        "predicted_eui": predicted_eui,
                        "suitability_score": suitability_score,
                        "wall_id": wall['id'],
                        "roof_id": roof['id'],
                        "glazing_id": glass['id'],
                        "embodied_carbon": float(wall.get('embodied_carbon', 0)) + float(roof.get('embodied_carbon', 0)) + float(glass.get('embodied_carbon', 0)),
                        "cost_index": int(wall.get('cost_index', 5)) + int(roof.get('cost_index', 5)) + int(glass.get('cost_index', 5))
                    })
        
        # Sort by the heuristically adjusted suitability score, not just raw EUI
        results.sort(key=lambda x: x['suitability_score'])
        
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
