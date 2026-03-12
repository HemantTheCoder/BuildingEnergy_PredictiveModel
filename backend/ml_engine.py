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
        # Resolve project root
        self.root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.model_dir = os.path.join(self.root_dir, "data", "models")
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
        file_path = os.path.join(self.root_dir, "data", "bee_benchmarks.csv")
        if os.path.exists(file_path):
            return pd.read_csv(file_path)
        else:
            raise FileNotFoundError(f"Real benchmark data not found at {file_path}. Run ingestion script first.")

    def train_all(self):
        df = self.load_real_data()
        X = df.drop(["eui", "archetype", "source"], axis=1)
        y = df["eui"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        # 1. XGBoost
        xgb_model = xgb.XGBRegressor(n_estimators=100, learning_rate=0.1, max_depth=5, random_state=42)
        xgb_model.fit(X_train, y_train)
        self._save_model_and_metrics("XGBoost", xgb_model, X_test, y_test)
        
        # 2. RandomForest
        rf_model = RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42)
        rf_model.fit(X_train, y_train)
        self._save_model_and_metrics("RandomForest", rf_model, X_test, y_test)
        
        # 3. Ridge Regression (Simpler, Interpretable)
        ridge_model = Ridge(alpha=1.0)
        ridge_model.fit(X_train, y_train)
        self._save_model_and_metrics("RidgeRegression", ridge_model, X_test, y_test)

    def _save_model_and_metrics(self, name, model, X_test, y_test):
        preds = model.predict(X_test)
        r2 = r2_score(y_test, preds)
        mae = mean_absolute_error(y_test, preds)
        
        self.models[name] = model
        self.metrics[name] = {"r2": float(r2), "mae": float(mae)}
        
        joblib.dump(model, os.path.join(self.model_dir, f"{name}.joblib"))
        with open(os.path.join(self.model_dir, f"{name}_metrics.json"), 'w') as f:
            json.dump(self.metrics[name], f)
        
        print(f"Model '{name}' Trained. MAE: {mae:.2f}, R2: {r2:.2f}")

    def load_models(self):
        for name in self.models.keys():
            m_path = os.path.join(self.model_dir, f"{name}.joblib")
            met_path = os.path.join(self.model_dir, f"{name}_metrics.json")
            if os.path.exists(m_path):
                self.models[name] = joblib.load(m_path)
            if os.path.exists(met_path):
                with open(met_path, 'r') as f:
                    self.metrics[name] = json.load(f)
        
        # Initialize explainers for tree-based models if models are loaded
        if self.models.get("XGBoost") is not None:
            self.explainers["XGBoost"] = shap.TreeExplainer(self.models["XGBoost"])
        if self.models.get("RandomForest") is not None:
            self.explainers["RandomForest"] = shap.TreeExplainer(self.models["RandomForest"])

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
        
        # Ensure feature order
        feature_order = ["floor_area", "wwr", "u_wall", "u_roof", "u_glass", "shgc", "cdd", "hdd", "solrad", "hvac_cop"]
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
                    test_input['u_wall'] = wall['u_value']
                    test_input['u_roof'] = roof['u_value']
                    test_input['u_glass'] = glass['u_value']
                    test_input['shgc'] = glass.get('shgc', 0.82)
                    
                    pred_res = self.predict(test_input, orientation=orientation, model_type=model_type)
                    results.append({
                        "wall": wall['name'],
                        "roof": roof['name'],
                        "glazing": glass['name'],
                        "predicted_eui": pred_res['predicted_eui'],
                        "wall_id": wall['id'],
                        "roof_id": roof['id'],
                        "glazing_id": glass['id']
                    })
        
        results.sort(key=lambda x: x['predicted_eui'])
        diverse_top_3 = []
        seen_wall_types = set()
        
        for res in results:
            # Simple diversity: check if wall material base type is different
            wall_type = res['wall'].split(' ')[0] 
            if wall_type not in seen_wall_types:
                diverse_top_3.append(res)
                seen_wall_types.add(wall_type)
            
            if len(diverse_top_3) >= 3:
                break
        
        # Fallback if diversity filter is too strict
        if len(diverse_top_3) < 3:
            diverse_top_3 = results[:3]

        return diverse_top_3

if __name__ == "__main__":
    engine = MLEngine()
    engine.train_all()
    print(engine.metrics)
