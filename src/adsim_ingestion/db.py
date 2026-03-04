from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import duckdb


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS ingest_runs (
  run_id UUID PRIMARY KEY,
  started_at TIMESTAMP NOT NULL,
  finished_at TIMESTAMP,
  ok BOOLEAN,
  notes VARCHAR
);

CREATE TABLE IF NOT EXISTS raw_rows (
  run_id UUID NOT NULL,
  source VARCHAR NOT NULL,
  url VARCHAR,
  retrieved_at TIMESTAMP NOT NULL,
  row_json JSON NOT NULL
);

CREATE TABLE IF NOT EXISTS benchmarks (
  run_id UUID NOT NULL,
  source VARCHAR NOT NULL,
  retrieved_at TIMESTAMP NOT NULL,
  industry VARCHAR NOT NULL,
  platform VARCHAR NOT NULL,
  ad_format VARCHAR NOT NULL DEFAULT '',
  ctr DOUBLE,
  conversion_rate DOUBLE,
  cpc DOUBLE,
  cpa DOUBLE,
  unit_currency VARCHAR,
  unit_notes VARCHAR,
  url VARCHAR,
  PRIMARY KEY (source, retrieved_at, industry, platform, ad_format)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_industry_platform
ON benchmarks(industry, platform);
"""


@dataclass(frozen=True)
class DuckDBConfig:
    path: Path


def connect(db_path: str | Path) -> duckdb.DuckDBPyConnection:
    p = Path(db_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    con = duckdb.connect(str(p))
    con.execute("PRAGMA threads=4;")
    con.execute(SCHEMA_SQL)
    return con


def insert_raw_rows(
    con: duckdb.DuckDBPyConnection,
    *,
    run_id: str,
    source: str,
    url: str | None,
    retrieved_at_iso: str,
    rows_json: Iterable[str],
) -> None:
    rows_json = list(rows_json)
    if not rows_json:
        return
    con.executemany(
        "INSERT INTO raw_rows (run_id, source, url, retrieved_at, row_json) VALUES (?, ?, ?, ?, ?)",
        [(run_id, source, url, retrieved_at_iso, r) for r in rows_json],
    )


def upsert_benchmarks(
    con: duckdb.DuckDBPyConnection,
    *,
    run_id: str,
    source: str,
    retrieved_at_iso: str,
    url: str | None,
    normalized_rows: list[dict],
) -> None:
    params = []
    for r in normalized_rows:
        ad_format = r.get("ad_format") or ""
        params.append(
            (
                run_id,
                source,
                retrieved_at_iso,
                r["industry"],
                r["platform"],
                ad_format,
                r.get("ctr"),
                r.get("conversion_rate"),
                r.get("cpc"),
                r.get("cpa"),
                r.get("unit_currency"),
                r.get("unit_notes"),
                url,
            )
        )

    if not params:
        return
    con.executemany(
        """
        INSERT OR REPLACE INTO benchmarks (
          run_id, source, retrieved_at, industry, platform, ad_format,
          ctr, conversion_rate, cpc, cpa,
          unit_currency, unit_notes, url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        params,
    )

