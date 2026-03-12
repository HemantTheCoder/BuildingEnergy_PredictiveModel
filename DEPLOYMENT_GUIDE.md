# Deployment Guide: Building Energy Predictive Model

To make your application accessible for the conference and beyond, you can deploy it using several modern platforms. Since your app has a **FastAPI (Python) Backend** and a **React (Vite) Frontend**, here are the best options.

## Special Note: Can I deploy everything on Vercel?

Technically **possible**, but **not recommended** for this specific project. Here's why:
- **ML Heavy**: Python libraries like `xgboost`, `pandas`, and `scikit-learn` are heavy. Vercel's Serverless Functions have strict size and memory limits that these packages often exceed.
- **Cold Starts**: ML models take 1-2 seconds to load into memory. On Vercel, this happens every time the function "wakes up", leading to a slow user experience.
- **Timeouts**: Energy simulations can take several seconds, which might trigger Vercel's execution time limits (10s on free tier).

### Recommended Alternatives:
1. **The Pro Split (Best Performance)**: Frontend on **Vercel**, Backend on **Railway**. This gives you a fast UI and a robust, persistent ML server.
2. **The "Everything in One Place" (Easiest)**: Deploy both on **Railway**. Railway allows you to have two services in one project—one for the frontend and one for the backend.

---

## 1. The Pro Split (Vercel + Railway)

- **Cost**: Free Tier available.
- **Why**: Extremely fast global CDN, perfect for showing the UI.
- **Steps**:
    1. Push your code to GitHub (Done!).
    2. Log in to Vercel and "Import Project".
    3. Select the `frontend` folder.
    4. Set Build Command: `npm run build` and Output Directory: `dist`.
    5. Add Environment Variable: `VITE_API_URL` pointing to your deployed backend.

### Backend: [Render](https://render.com/) or [Railway](https://railway.app/)

- **Cost**: Free/Low cost tiers.
- **Why**: Supports Python/FastAPI out of the box.
- **Steps**:
    1. Select "Web Service" on Render.
    2. Connect your GitHub repo.
    3. Set Root Directory to `backend`.
    4. Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`.
    5. **Wait**: Free tiers on Render "spin down" after inactivity, so open the link 30 seconds before your presentation!

---

## 2. Professional / National Scalability

### [Google Cloud Platform (GCP)](https://cloud.google.com/) or [AWS](https://aws.amazon.com/)

- **Tool**: Google Cloud Run or AWS App Runner.
- **Why**: Best for handling thousands of users across India.
- **Steps**: Use the `Dockerfile` already present in your `backend` and `frontend` folders to deploy as "Containers". This ensures the app runs exactly as it does on your machine.

---

## 3. Local "Offline" Mode (Conference Backup)

If the conference internet is unstable, use **Docker Desktop**:

1. Open terminal in the project root.
2. Run: `docker-compose up --build`.
3. Your app will be live at `localhost:5173` without needing an active internet connection (except for the NASA climate API).

---

## Technical Sync Checklist
>
> [!IMPORTANT]
>
> - Ensure `frontend/src/lib/api.ts` (or wherever you call the API) uses an environment variable for the base URL.
> - On Render/Railway, make sure to set the `PYTHON_VERSION` to 3.9+ in the environment settings.
