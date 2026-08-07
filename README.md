# Nirikshan — Satellite-Based Intelligence & Illegal Construction Detection

Nirikshan is an AI-powered satellite monitoring and legal compliance portal. It compares year-over-year Sentinel-2 satellite imagery to detect unauthorized land changes, validates construction activity with vision models, cross-references land-use datasets, and provides field officers with an interactive command center, PDF report generation, and an AI compliance assistant.

**Team DOMinators**
- Shravani Chaudhary
- Mitanshi Khanna
- Shravani Kolekar

<img width="1892" height="801" alt="Nirikshan Operations Portal" src="https://github.com/user-attachments/assets/0795cc4c-bfed-44ff-9d60-1248350de0e2" />

---

## Live Deployments

- **Frontend Application (Vercel)**: [https://nirikshan2-ktqj.vercel.app](https://nirikshan2-ktqj.vercel.app)
- **Backend API Server (Render)**: [https://autosentinel2-1.onrender.com](https://autosentinel2-1.onrender.com)

---

## How It Works

1. **Change Detection** — Sentinel-2 SR surface reflectance composites (via Google Earth Engine) across multiple time periods are analyzed using NDBI (Normalized Difference Built-up Index). Areas showing abnormal NDBI increases are flagged as target zones.
2. **Vision-Based Verification** — Before/after satellite thumbnails are evaluated by a YOLO object-detection model to identify construction indicators (cranes, building frames, containers) and generate a vision confidence score.
3. **Severity & Risk Scoring** — Polygons are classified into severity levels (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`) based on detected area, proximity to infrastructure, and structural changes.
4. **Spatial & Legal Cross-Referencing** — Zones are cross-referenced with OpenStreetMap (OSM) layers (forests, water bodies, protected lands), Bhuvan land-use datasets, and Microsoft Building Footprints to determine legal compliance and confirm physical structures.
5. **Command Center & Intelligence** — Officers can search regions, draw custom bounding boxes for live scanning, download PDF inspection reports, and interact with an AI compliance assistant via text or voice.

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet (`react-leaflet` + `leaflet-draw`).
- **Backend**: Python, FastAPI, SQLAlchemy ORM, Alembic, PostgreSQL, Google Earth Engine (`earthengine-api`), `rasterio`, `geopandas`, `shapely`.
- **Auth & Security**: JWT Access & Refresh Tokens, bcrypt password hashing, CORS middleware.
- **Data & AI**: Google Earth Engine (Sentinel-2), OpenStreetMap (Overpass / OSMnx), Microsoft Building Footprints, OpenRouter (AI assistant), Gnani.ai (voice input/output).

---

## Project Structure

```
Autosentinel2/
├── backend/
│   ├── main.py               # FastAPI app, CORS middleware, and primary API routes
│   ├── auth_routes.py        # Authentication router (/auth/login, /auth/me, /auth/refresh)
│   ├── auth_utils.py         # JWT token creation/decoding and bcrypt password hashing
│   ├── database.py           # PostgreSQL SQLAlchemy engine and session factory
│   ├── models.py             # SQLAlchemy models (User, RefreshToken, Zone)
│   ├── db_client.py          # PostgreSQL zone query & upsert client
│   ├── seed_db.py            # Seed database with zone data
│   ├── seed_user.py          # Seed default admin user credentials
│   ├── gee_auth.py           # Earth Engine authentication logic
│   ├── assistant.py          # OpenRouter-backed AI assistant helpers
│   ├── subscription.py       # Feature gating and scan limit checks
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main map dashboard and interactive command center
│   │   ├── main.tsx          # Application entry point
│   │   ├── config.ts         # Base API URL and environment configurations
│   │   ├── lib/api.ts        # Axios API client, auth interceptors, and error handling
│   │   └── pages/
│   │       ├── LoginPage.tsx # Secure Email & Password Login Page
│   │       ├── LandingPage.tsx
│   │       └── LoginHeroGlobe.tsx
│   ├── package.json
│   ├── vite.config.ts
│   └── .env
├── notebooks/
│   ├── run_pipeline.py            # End-to-end NDBI change detection pipeline
│   ├── process_change.py          # Vectorize & score change-detection output
│   ├── score_zones.py             # Severity & risk scoring logic
│   ├── legal_cross_reference.py   # Spatial join against land-use & OSM layers
│   ├── fetch_bhuvan_lulc.py       # Bhuvan land-use extract generator
│   ├── fetch_osm_layers.py        # Live OSM/Overpass layer extractor
│   └── generate_report.py         # PDF report generator
└── data/
    ├── flagged_zones.json         # Precomputed flagged zones dataset
    └── live_zones.json            # Persisted live scan result zones
```

---

## Getting Started Locally

### 1. Backend Setup

```bash
cd backend
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Create a `backend/.env` file:

```env
DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/autosentinel
JWT_SECRET_KEY=autosentinel_super_secret_jwt_key_2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7
OPENROUTER_API_KEY=your_openrouter_api_key
```

Seed the default database tables and user credentials:

```bash
python backend/seed_user.py
```

Run the backend development server:

```bash
uvicorn main:app --reload
```

Interactive API Documentation: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `frontend/.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the Vite development server:

```bash
npm run dev
```

Application will run locally at `http://localhost:5173`.

---

## Default Test Credentials

For local testing or portal access:
- **Email**: `shravaniii2619@gmail.com`
- **Password**: `Shravani`

---

## Core API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `POST /auth/login` | `POST` | Authenticate user with Email & Password, returns JWT access token |
| `GET /auth/me` | `GET` | Get profile details for authenticated user |
| `GET /zones` | `GET` | Fetch all flagged satellite zones |
| `GET /zones/summary` | `GET` | Summary statistics and severity breakdown |
| `GET /zones/{id}` | `GET` | Retrieve details for a specific zone |
| `GET /zones/{id}/images` | `GET` | Retrieve before/after satellite imagery URLs |
| `GET /zones/{id}/report` | `GET` | Download official PDF inspection report |
| `POST /zones/query` | `POST` | Trigger custom bounding-box satellite scan |
| `GET /me/subscription` | `GET` | Get current user's subscription and scan limit quota |
| `POST /assistant/ask` | `POST` | Ask AI assistant questions regarding specific zones |

---

## Data Sources & Integrations

- **Sentinel-2 Imagery**: Google Earth Engine (GEE)
- **Land-Use Classification**: Bhuvan (NRSC / ISRO) & OpenStreetMap (OSMnx / Overpass)
- **Building Footprints**: Microsoft Global Building Footprints
- **Vision Verification**: Custom YOLO object detection models
- **Database & Persistence**: PostgreSQL (SQLAlchemy ORM)

---

## Preview Screenshots

<img width="1112" height="895" alt="Flagged Zone Analysis" src="https://github.com/user-attachments/assets/95179508-2220-473d-a33f-e24b64a51e40" />
<img width="1918" height="933" alt="Satellite Scan Grid" src="https://github.com/user-attachments/assets/4cbf1c0e-5b92-4fd5-a95c-d6a7d3a27126" />
<img width="1911" height="921" alt="Interactive Map View" src="https://github.com/user-attachments/assets/7e5e6294-18f4-44f5-86b6-f203124065bd" />
<img width="998" height="849" alt="Legal & Risk Inspection" src="https://github.com/user-attachments/assets/735f5362-be5b-4c42-bb54-1a972aa81e49" />
