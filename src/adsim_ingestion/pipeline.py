from __future__ import annotations

import json
import uuid
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

import duckdb

from adsim_ingestion import db as dbmod
from adsim_ingestion.kaggle_loader import (
    KaggleDatasetSpec,
    download_dataset,
    load_csvs_into_duckdb,
    unzip_dataset,
)
from adsim_ingestion.normalize import normalize_common_benchmark_rows
from adsim_ingestion.scrapers.sources import DEFAULT_SOURCES, SourceSpec, scrape_source


@dataclass(frozen=True)
class PipelineConfig:
    db_path: Path
    kaggle_cache_dir: Path = Path("data/kaggle")
    playwright_user_data_dir: Path | None = None


def _now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def start_run(con: duckdb.DuckDBPyConnection, *, notes: str | None = None) -> str:
    run_id = str(uuid.uuid4())
    con.execute(
        "INSERT INTO ingest_runs (run_id, started_at, ok, notes) VALUES (?, ?, NULL, ?)",
        (run_id, _now_iso(), notes),
    )
    return run_id


def finish_run(con: duckdb.DuckDBPyConnection, *, run_id: str, ok: bool, notes: str | None = None) -> None:
    con.execute(
        "UPDATE ingest_runs SET finished_at=?, ok=?, notes=? WHERE run_id=?",
        (_now_iso(), ok, notes, run_id),
    )


def run_scrapers(
    con: duckdb.DuckDBPyConnection,
    *,
    run_id: str,
    sources: list[SourceSpec] | None = None,
    user_data_dir: str | None = None,
) -> None:
    retrieved_at = _now_iso()
    sources = sources or DEFAULT_SOURCES

    for spec in sources:
        try:
            result = scrape_source(spec, user_data_dir=user_data_dir)
            normalized = normalize_common_benchmark_rows(
                source=result.source,
                platform=spec.platform,
                url=result.url,
                retrieved_at=retrieved_at,
                rows=result.extracted_rows,
                field_map=spec.field_map or {"industry": "Industry"},
                default_ad_format=spec.default_ad_format,
                unit_notes=spec.unit_notes,
            )
            dbmod.insert_raw_rows(
                con,
                run_id=run_id,
                source=result.source,
                url=result.url,
                retrieved_at_iso=retrieved_at,
                rows_json=normalized.raw_rows_json,
            )
            dbmod.upsert_benchmarks(
                con,
                run_id=run_id,
                source=result.source,
                retrieved_at_iso=retrieved_at,
                url=result.url,
                normalized_rows=normalized.normalized_rows,
            )
        except Exception as e:
            # Keep the pipeline running; store the failure so it can be triaged later.
            err_row = json.dumps({"error": str(e), "source": spec.source, "url": spec.url}, ensure_ascii=False)
            dbmod.insert_raw_rows(
                con,
                run_id=run_id,
                source=spec.source,
                url=spec.url,
                retrieved_at_iso=retrieved_at,
                rows_json=[err_row],
            )
            continue


def run_kaggle_loaders(
    con: duckdb.DuckDBPyConnection,
    *,
    datasets: list[KaggleDatasetSpec],
    cache_dir: Path,
    max_rows: int | None = None,
) -> dict[str, list[str]]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    out: dict[str, list[str]] = {}
    for spec in datasets:
        zip_path = download_dataset(spec, out_dir=cache_dir)
        dataset_dir = unzip_dataset(zip_path, out_dir=cache_dir)
        tables = load_csvs_into_duckdb(con, dataset_name=spec.name, dataset_dir=dataset_dir, max_rows=max_rows)
        out[spec.name] = tables
    return out


def run_update(
    *,
    cfg: PipelineConfig,
    run_all_scrapers: bool = True,
    sources: list[SourceSpec] | None = None,
    run_kaggle: bool = False,
    kaggle_datasets: list[KaggleDatasetSpec] | None = None,
    kaggle_max_rows: int | None = None,
) -> dict:
    con = dbmod.connect(cfg.db_path)
    run_id = start_run(con)
    notes = None

    try:
        if run_all_scrapers:
            user_dir = str(cfg.playwright_user_data_dir) if cfg.playwright_user_data_dir else None
            run_scrapers(con, run_id=run_id, sources=sources, user_data_dir=user_dir)

        kaggle_tables = {}
        if run_kaggle:
            kaggle_datasets = kaggle_datasets or []
            kaggle_tables = run_kaggle_loaders(
                con,
                datasets=kaggle_datasets,
                cache_dir=cfg.kaggle_cache_dir,
                max_rows=kaggle_max_rows,
            )

        notes = json.dumps({"kaggle_tables": kaggle_tables}, ensure_ascii=False)
        finish_run(con, run_id=run_id, ok=True, notes=notes)
        return {"run_id": run_id, "ok": True, "notes": notes}
    except Exception as e:
        finish_run(con, run_id=run_id, ok=False, notes=str(e))
        raise
    finally:
        con.close()

