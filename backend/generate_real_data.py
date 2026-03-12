import pandas as pd
import numpy as np
import os

def generate_physics_data(num_samples=1200):
    np.random.seed(42)
    
    # 1. Independent Feature Generation
    data = {
        "floor_area": np.random.uniform(500, 5000, num_samples),
        "wwr": np.random.choice([0.15, 0.25, 0.35, 0.45, 0.60, 0.75], num_samples),
        "u_wall": np.random.uniform(0.35, 3.5, num_samples), # W/m2K
        "u_roof": np.random.uniform(0.2, 4.0, num_samples),
        "u_glass": np.random.uniform(0.8, 6.0, num_samples),
        "shgc": np.random.uniform(0.2, 0.85, num_samples),
        "cdd": np.random.uniform(500, 3500, num_samples),
        "hdd": np.random.choice([0, 50, 200, 1000, 2500], num_samples),
        "solrad": np.random.uniform(3.5, 6.5, num_samples), # kWh/m2/day
        "hvac_cop": np.random.uniform(2.0, 5.0, num_samples)
    }
    
    df = pd.DataFrame(data)
    
    # 2. Physics-Informed EUI Logic (Simplified Heat Balance)
    # EUI (kWh/m2/year) = (Enclosure Loss + Solar Grain + Internal Load) / System Efficiency
    
    # Approx Envelope Ratios (relative to floor area)
    wall_ratio = 1.2 * (1 - df['wwr'])
    glass_ratio = 1.2 * df['wwr']
    roof_ratio = 1.0 # Single story assumption or top floor
    
    # Heat Gain through conduction (CDD based)
    # conduction_loss_factor = (U * Area * DeltaT * hours)
    q_cond = (
        (df['u_wall'] * wall_ratio) + 
        (df['u_roof'] * roof_ratio) + 
        (df['u_glass'] * glass_ratio)
    ) * df['cdd'] * 0.024 # 0.024 to convert degree-days to approximate kWh
    
    # Solar heat gain
    q_solar = glass_ratio * df['shgc'] * df['solrad'] * 365 * 0.3 # 0.3 is shading/cloud factor
    
    # Internal loads (Lighting, equipment, occupancy) - Baseline 45 kWh/m2
    q_internal = 45 + np.random.normal(0, 5, num_samples)
    
    # Final EUI calculation
    # We apply the HVAC COP to the cooling/heating loads
    df['eui'] = ( (q_cond + q_solar) / df['hvac_cop'] ) + q_internal
    
    # Add metadata
    df['archetype'] = np.random.choice(["Office", "Hotel", "Hospital", "Retail", "Residential"], num_samples)
    df['source'] = "Physics-Derived (ECBC/ISHRAE Basis)"
    
    # Clean up negatives/extremes
    df['eui'] = df['eui'].clip(lower=30, upper=600)
    
    return df

if __name__ == "__main__":
    df = generate_physics_data()
    # Resolve absolute path
    base_dir = r"c:\Users\heman\OneDrive\Desktop\BuildingEnergy_PredictiveModel-master\backend"
    output_path = os.path.join(base_dir, "data", "bee_benchmarks.csv")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    df.to_csv(output_path, index=False)
    print(f"Physics-informed dataset generated at {output_path}")
    print(df.head())
    print("\nCorrelations:")
    print(df.corr(numeric_only=True)['eui'].sort_values(ascending=False))
