# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Traffic Generator Platform** — a web app for simulating realistic ad traffic for Real-Time Bidding (RTB) systems. It generates synthetic OpenRTB 2.5-compatible bid requests for testing and development. Live at: https://trafficgenerator-1.onrender.com

## Development Commands

### Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
export FLASK_APP=app.main
flask run                          # http://localhost:5000
python -m pytest Tests/            # run all tests
python Tests/test-api-endpoints.py # run specific test
python Tests/test-file-structure.py
```

### Frontend (React/Vite)
```bash
cd frontend
npm install
export VITE_API_URL=http://localhost:5000
npm run dev    # http://localhost:5173
npm run build  # production build
npm run lint   # ESLint
```

## Architecture

### Backend (`backend/app/`)

**`api/traffic.py`** (~2300 lines) — the core engine:
- Multi-threaded traffic generation; one thread per campaign
- Global `active_threads` and `thread_locks` dicts keyed by campaign ID
- Generates OpenRTB 2.5-compatible bid requests using Faker for synthetic data
- File-based persistence in `app/data/traffic/<campaign_id>/` (JSON)
- **Data format**: recently migrated from array to object format (`{"request_1": {...}, ...}`). Code auto-converts legacy list format on read; always writes object format.
- `fix_corrupted_traffic_file()` repairs malformed data files automatically

**`api/sessions.py`** — campaign lifecycle (draft → running → paused/completed/stopped), campaign CRUD

**`api/profiles.py`** — synthetic user profiles: demographics, device prefs, app usage, RTB params

**`api/llm_referrer_bank.py`** — optional OpenAI integration to generate realistic referrer URLs per profile

**`main.py`** — Flask app, CORS config, blueprint registration, health check at `/api/traffic/health`

### Frontend (`frontend/src/`)

Pages in `pages/`: Dashboard (real-time monitoring), Generator (campaign wizard), Campaigns, UserProfiles, Analytics, Logs

Components organized by domain under `components/`: `dashboard/`, `generator/`, `campaigns/`, `profiles/`, `ui/` (Radix UI wrappers)

API calls in `api/`, custom hooks in `hooks/`.

### Key Data Shapes

**Campaign** (stored in sessions):
```json
{
  "campaign_id": "string",
  "status": "draft|running|paused|completed|stopped",
  "target_url": "string",
  "requests_per_minute": 10,
  "geo_locations": ["US"],
  "user_profile_ids": ["string"],
  "profile_user_counts": {}
}
```

**Traffic entry** (new object format):
```json
{
  "request_1": {
    "id": "request_1",
    "rtb_id": "string",
    "timestamp": "ISO8601",
    "success": true,
    "response_time": 120,
    "rtb_imp": [],
    "rtb_site": {},
    "rtb_device": {},
    "rtb_user": {}
  }
}
```

## Environment Variables

| Variable | Where | Purpose |
|---|---|---|
| `FLASK_APP` | backend | `app.main` |
| `CORS_ORIGINS` | backend | Comma-separated allowed origins |
| `OPENAI_API_KEY` | backend | Optional — enables AI referrer generation |
| `VITE_API_URL` | frontend | Backend URL, e.g. `http://localhost:5000` |
| `ENVIRONMENT` | backend | `development` or `production` |

## API Surface

All routes prefixed `/api/`:
- `POST /traffic/generate` — start campaign traffic
- `POST /traffic/stop/<campaign_id>` — stop
- `GET /traffic/stats/<campaign_id>` — live stats
- `GET /traffic/generated/<campaign_id>` — traffic data
- `GET /traffic/monitor/<campaign_id>` — real-time stream
- `GET/POST /sessions/` — list/create campaigns
- `GET/PUT/DELETE /sessions/<id>` — campaign CRUD
- `GET/POST /profiles/` — list/create user profiles
- `PUT/DELETE /profiles/<id>` — profile management

## Important Notes

- **File format migration**: The traffic data format changed from list → object in recent commits (RTB_File_Struct_Change_V2–V4). Always write object format; the read path handles both.
- **Thread safety**: Use `thread_locks[campaign_id]` before accessing shared campaign state or files.
- **Logging**: Application logs → `backend/logs/`; campaign event logs → `/tmp/logs/`.
- **Deployment**: Render.com via `render.yaml`. Backend is a Python service; frontend is a Node.js static build.
- **Database**: File-based JSON for now. SQLAlchemy is in requirements but not yet integrated.
