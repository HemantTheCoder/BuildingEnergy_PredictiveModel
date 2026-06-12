---
name: ClimaBuild AI architecture
description: Stack layout, real source paths, and proxy config
---
- Backend: FastAPI Python 3.11 in `backend/`, port 8000, workflow "Backend API"
- Frontend: Vite React+Tailwind in `frontend/src/`, port $PORT, workflow "artifacts/eui-predictor: web"
- Real components live in `frontend/src/components/`, NOT in `artifacts/eui-predictor/src/`
- Vite proxy: all `/predict`, `/materials`, `/cities`, `/fetch_climate`, `/models` routes proxy to `http://127.0.0.1:8000`
- Materials seeded from `backend/material_db.py` → `backend/data/materials.csv` (33 records)
- Predict endpoint requires `archetype` field in request body
