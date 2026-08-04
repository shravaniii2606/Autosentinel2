# AutoSentinel

Satellite-based illegal construction detection system. AutoSentinel compares
Sentinel-2 satellite imagery year-over-year to flag new construction, scores
each flagged zone by severity and legal risk, and gives field officers a map
dashboard to investigate, scan new areas on demand, generate reports, and ask
an AI assistant natural-language questions about any flagged zone.

**Team DOMinators**
- Shravani Chaudhary
- Mitanshi Khanna
- Shravani Kolekar

<img width="1892" height="801" alt="image" src="https://github.com/user-attachments/assets/0795cc4c-bfed-44ff-9d60-1248350de0e2" />

## How it works

1. **Detect** — Sentinel-2 SR composites (via Google Earth Engine) for two
   time periods are compared using NDBI (Normalized Difference Built-up
   Index). Areas where NDBI increases beyond a threshold are flagged as
   likely new construction.
2. **Verify with vision** — Before/after satellite thumbnails are run through
   a YOLO object-detection model to confirm construction activity (cranes,
   buildings, containers), adding a vision-based confidence score on top of
   the raw change detection.
3. **Score** — Each flagged polygon is scored by area and assigned a severity
   (LOW / MEDIUM / HIGH / CRITICAL).
4. **Cross-reference** — Zones are checked against OpenStreetMap (OSM) land-use
   layers (forest, agricultural, protected land) and Microsoft's global
   building footprints dataset to flag legal risk and confirm whether a real
   structure exists.
5. **Report & ask** — Officers get a live map dashboard, a downloadable PDF
   report per zone with the legal explanation, and can ask the AI assistant
   questions like *"why is this zone high risk?"* and get an answer grounded
   in the actual scan data.

## Tech stack

**Backend** — Python, FastAPI, Google Earth Engine (`earthengine-api`),
`rasterio` / `geopandas` for geospatial processing, `shapely` for geometry,
YOLO for vision-based construction detection on satellite thumbnails.

**Frontend** — React 19, TypeScript, Vite, Tailwind CSS v4, Leaflet
(`react-leaflet` + `leaflet-draw`) for the interactive map.

**Data & AI** — Google Earth Engine (Sentinel-2 imagery), OpenStreetMap
(land-use + natural feature layers via Overpass/OSMnx), Microsoft Building
Footprints (structure verification), Supabase (zone persistence), OpenRouter
for OpenAI-compatible assistant chat, and Gnani.ai (voice input/output).

## Project structure

```
autosentinel/
├── backend/
│   ├── main.py               # FastAPI app — all API endpoints
│   ├── gee_auth.py           # Earth Engine authentication (service account or local OAuth)
│   ├── supabase_client.py    # Zone persistence in Supabase
│   ├── assistant.py          # OpenRouter-backed AI assistant helpers
│   ├── gnani_client.py       # Voice input/output (Gnani.ai)
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.tsx           # Main map dashboard
│       └── main.tsx
├── notebooks/
│   ├── run_pipeline.py            # End-to-end NDBI change detection pipeline
│   ├── process_change.py          # Vectorize + score change-detection output
│   ├── score_zones.py             # Severity / risk scoring logic
│   ├── legal_cross_reference.py   # Spatial join against land-use + OSM layers
│   ├── fetch_bhuvan_lulc.py       # Local land-use extract for a study area
│   ├── fetch_osm_layers.py        # Live OSM/Overpass layers (rivers, forests, etc.)
│   ├── generate_report.py         # Per-zone PDF report generation
│   └── train_classifier*.py       # YOLO-detection-fed XGBoost risk classifiers
├── data/
│   ├── flagged_zones.json             # Precomputed dataset of flagged zones
│   ├── zoned_violations_enriched.geojson
│   └── live_zones.json                # Zones from user-drawn live scans (persisted)
└── docs/
    └── dahisar-landuse.md
```

## Setup

### Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your credentials (Earth Engine,
Supabase, OpenRouter, Gnani.ai):

```bash
cp .env.example .env
```

For **local development**, run `earthengine authenticate` once and the
backend will use your local OAuth session. For **deployment**, set
`GEE_SERVICE_ACCOUNT_EMAIL` and `GEE_SERVICE_ACCOUNT_KEY` (a GCP service
account JSON key, as a single-line env var) instead — see `gee_auth.py`.

Run the server:

```bash
uvicorn main:app --reload
```

API docs are available at `http://localhost:8000/docs` once running.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The dashboard expects the backend running at `http://localhost:8000`.

## Core API endpoints

| Endpoint | Description |
|---|---|
| `GET /zones` | All flagged zones (precomputed + live) |
| `GET /zones/summary` | Summary counts by severity |
| `GET /zones/{id}` | Single zone detail |
| `GET /zones/{id}/images` | Before/after satellite thumbnails |
| `GET /zones/{id}/report` | Downloadable PDF report |
| `POST /scan` | Kick off a live scan for a user-drawn area (returns a `job_id`) |
| `GET /jobs/{job_id}` | Poll status of a running scan job |
| `POST /assistant/ask` | Ask the AI assistant a question about a zone (text or voice) |
| `POST /assistant/sync-context` | Push current zones into the AI assistant's context store |
| `POST /admin/sync-flagged-to-supabase` | Backfill flagged zones into Supabase |

## Data sources

- **Sentinel-2** surface reflectance imagery via **Google Earth Engine (GEE)**
- **YOLO** object detection for vision-based construction verification
  (cranes, buildings, containers)
- **OpenStreetMap (OSM)** (via Overpass API / OSMnx) for land-use and natural   feature layers
- **Microsoft Building Footprints** for structure verification

## Images
<img width="1112" height="895" alt="image" src="https://github.com/user-attachments/assets/95179508-2220-473d-a33f-e24b64a51e40" />
<img width="1918" height="933" alt="image" src="https://github.com/user-attachments/assets/4cbf1c0e-5b92-4fd5-a95c-d6a7d3a27126" />
<img width="1911" height="921" alt="image" src="https://github.com/user-attachments/assets/7e5e6294-18f4-44f5-86b6-f203124065bd" />
<img width="998" height="849" alt="image" src="https://github.com/user-attachments/assets/735f5362-be5b-4c42-bb54-1a972aa81e49" />





  
