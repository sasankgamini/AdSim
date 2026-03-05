# Deploying AdSim

Deploy the **dashboard** (Next.js) to Vercel and the **backend API** (FastAPI) to Render. Both have free tiers.

---

## 1. Deploy backend (Render)

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. **New → Web Service** and connect the `AdSim` repository.
3. Render will detect `render.yaml`. Confirm:
   - **Build command:** `pip install -r backend/requirements.txt`
   - **Start command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Root directory:** leave default (repo root).
4. Create the service. After the first deploy, note your API URL, e.g. `https://adsim-api.onrender.com`.

**Note:** On the free tier the service spins down after ~15 minutes of inactivity; the first request after that may take 30–60 seconds.

---

## 2. Dashboard (Vercel) — deployed

The dashboard is deployed at: **https://adsim-dashboard.vercel.app**

To redeploy or connect a different repo: go to [vercel.com](https://vercel.com) → **Add New → Project** → import the `AdSim` repository → set **Root Directory** to `dashboard` → Deploy.

**Optional:** To point the dashboard at your deployed API later (when UI calls are wired), add an environment variable in the Vercel project:
- **Name:** `NEXT_PUBLIC_API_URL`
- **Value:** `https://your-api.onrender.com` (your Render API URL).

---

## 3. GitHub repository links

- In your repo on GitHub, go to **Settings → General**.
- Under **Website**, paste: **https://adsim-dashboard.vercel.app** so the repo’s “About” link goes to the live app.
- Optionally add **Description** and **Topics** (e.g. `simulation`, `advertising`, `monte-carlo`).

---

## 4. CORS

The backend allows all origins (`allow_origins=["*"]`), so the Vercel-hosted dashboard can call the Render-hosted API without extra CORS setup.
