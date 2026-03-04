#!/usr/bin/env bash
set -euo pipefail

DB_PATH="${1:-data/benchmarks.duckdb}"

python -m adsim_ingestion update --db "${DB_PATH}" --all
python -m adsim_ingestion calibrate --db "${DB_PATH}" --out data/calibration.json

