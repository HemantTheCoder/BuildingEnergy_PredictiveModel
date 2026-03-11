# Climate-aware Material Recommendation & EUI Predictor (India MVP)

Predict building energy use intensity (EUI, kWh/m²·yr) for Indian cities and get optimized material recommendations.

## Features

- **Climate Data Fetching**: Auto-resolves city coordinates and fetches NASA POWER Climatology data (CDD, Solar, Temp).
- **India-Focused Materials**: Seeded with BMTPC and CPWD material property standards.
- **ML Engine**: XGBoost regression model trained on synthetic parametric simulations.
- **Explainability**: SHAP (SHapley Additive exPlanations) for per-prediction feature importance.
- **Recommendation Engine**: Automated search for optimal wall, roof, and glazing combinations.

## Tech Stack

- **Backend**: FastAPI (Python), XGBoost, SHAP, Scikit-learn, Pandas.
- **Frontend**: React (TypeScript), Tailwind CSS, Framer Motion, Recharts.
- **Containerization**: Docker, Docker Compose.

## Setup & Run

### Using Docker (Recommended)

```bash
docker-compose up --build
```

- Backend available at: `http://localhost:8000`
- Frontend available at: `http://localhost:80`

### Local Development

**Backend:**

```bash
cd backend
pip install -r requirements.txt
python main.py
```

**Frontend:**

```bash
cd frontend
npm install
npm run dev
```

## Model Card

- **Model Type**: XGBoost Regressor
- **Training Data**: 1000 synthetic simulations based on thermal physics for Indian weather variations.
- **Target**: Annual Energy Use Intensity (EUI) in kWh/m²·yr.
- **Performance**: MAE ~1.59, R² ~0.91 (on synthetic validation set).

## Data Sources & Citations

- **NASA POWER API**: Long-term climatology weather data.
- **BMTPC**: Thermal Properties of Building Materials Technical Document (India). [Link](https://www.bmtpc.org/DataFiles/CMS/file/PDF_Files/ThermalProperitiesOfBldg_Material_Tech_v1.pdf)
- **CPWD/BIS**: Construction standards and typical U-values for Indian assemblies.
- **Saint-Gobain India**: Glazing property benchmarks.

## Developer Notes

The "synthetic labels" are generated using a physics-inspired surrogate model in `ml_engine.py` simulating standard thermal loads (conduction, solar gains, internal loads) for Indian climate profiles.
