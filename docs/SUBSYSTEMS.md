# AdSim Subsystem Map

Quick reference for the orchestrator role. See `.cursor/rules/orchestrator.mdc` for the full rule.

## Data ingestion (`src/adsim_ingestion/`)

- **cli.py** — Typer CLI: `update` (scrapers + optional Kaggle), `calibrate`.
- **pipeline.py** — Runs scrapers, writes to DuckDB.
- **calibration.py** — Builds calibration priors from benchmarks; writes `data/calibration.json` (or similar).
- **kaggle_loader.py** — Loads Kaggle datasets into DuckDB.
- **scrapers/** — WordStream and other benchmark scrapers; `sources.py` / config drive which run.
- **db.py** — DuckDB helpers/schema.

Config: `config/sources.default.json`. Data output: `data/` (DuckDB, JSON, CSVs).

## Persona generation

- **simulation/persona_engine.py** — `generate_personas(PersonaRequest)` → list of persona dicts. Uses demographic distributions (can be driven by calibration/benchmarks).
- **backend/persona_generator.py** — If present, may be an alternative or extended generator; orchestrator should keep a single source of truth for “personas” consumed by the simulation engine.

## Simulation engine (`simulation/`)

- **campaign_model.py** — `CampaignDefinition` (objective, platform, budget, targeting).
- **monte_carlo.py** — `run_campaign_simulation(SimulationRequest)` → mean CTR/CPC/CPA/ROI + distribution.
- **optimization.py** — `optimize_campaign(OptimizationRequest)` → best arm, estimates, history.

Consumes: personas, campaign definition, benchmark/calibration data (for base CTR/CPC).

## Backend API (`backend/main.py`)

- Routes: `/health`, `/personas/generate`, `/simulation/run` (and optionally `/optimization/run`, `/calibration/update`).
- Imports from `simulation.*` only. No ingestion logic here; ingestion is CLI/script-driven.

## Frontend (`dashboard/`)

- Next.js app; pages: Campaign Builder, Simulation Results, Persona Explorer, Optimization Insights.
- Calls `backend` HTTP API only. No direct DuckDB or simulation logic.

## Scripts and automation

- **scripts/update_benchmarks.sh** — Wraps ingestion CLI (e.g. `adsim-ingestion update`).
- **.github/workflows/benchmarks-update.yml** — Scheduled or manual benchmark refresh.

When changing ingestion output format or DuckDB schema, update: ingestion → calibration (if needed) → simulation/backend readers → docs.
