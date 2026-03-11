import numpy as np
import pandas as pd
import xgboost as xgb
import shap
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, r2_score

class MLEngine:
    def __init__(self, model_path="data/model.joblib"):
        self.model_path = model_path
        self.model = None
        self.explainer = None

    def load_real_data(self):
        """
        Loads real building energy data from official BEE benchmarking datasets.
        """
        file_path = "data/bee_benchmarks.csv"
        if os.path.exists(file_path):
            return pd.read_csv(file_path)
        else:
            raise FileNotFoundError(f"Real benchmark data not found at {file_path}. Run ingestion script first.")

    def train(self):
        df = self.load_real_data()
        X = df.drop(["eui", "archetype", "source"], axis=1)
        y = df["eui"]
        
        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
        
        self.model = xgb.XGBRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=7,
            random_state=42
        )
        
        self.model.fit(X_train, y_train)
        
        # Eval
        preds = self.model.predict(X_test)
        mae = mean_absolute_error(y_test, preds)
        r2 = r2_score(y_test, preds)
        
        print(f"Model Trained on REAL DATA. MAE: {mae:.2f}, R2: {r2:.2f}")
        
        # Save model
        if not os.path.exists("data"):
            os.makedirs("data")
        joblib.dump(self.model, self.model_path)
        
        # SHAP
        self.explainer = shap.TreeExplainer(self.model)
        
        return {"mae": mae, "r2": r2}

    def predict(self, input_data):
        if self.model is None:
            if os.path.exists(self.model_path):
                self.model = joblib.load(self.model_path)
            else:
                self.train()
        
        # input_data is a dict with all features
        X = pd.DataFrame([input_data])
        # Ensure feature order
        feature_order = ["floor_area", "wwr", "u_wall", "u_roof", "u_glass", "shgc", "cdd", "hdd", "solrad", "hvac_cop"]
        X = X[feature_order]
        
        pred = self.model.predict(X)[0]
        
        # Get SHAP values for this prediction
        if self.explainer is None:
            self.explainer = shap.TreeExplainer(self.model)
        
        shap_values = self.explainer.shap_values(X)
        shap_dict = dict(zip(feature_order, shap_values[0].tolist()))
        
        return {
            "predicted_eui": float(pred),
            "shap_values": shap_dict
        }

    def recommend_materials(self, base_input, materials_df, top_k=3):
        """
        Iterates through material combinations to find top energy-efficient options.
        base_input: dict with static features (floor_area, wwr, climate, hvac)
        materials_df: DataFrame of available materials
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
                    test_input['shgc'] = glass['shgc']
                    
                    pred_res = self.predict(test_input)
                    results.append({
                        "wall": wall['name'],
                        "roof": roof['name'],
                        "glazing": glass['name'],
                        "predicted_eui": pred_res['predicted_eui']
                    })
        
        results.sort(key=lambda x: x['predicted_eui'])
        return results[:top_k]

if __name__ == "__main__":
    engine = MLEngine()
    metrics = engine.train()
    print(metrics)
