from __future__ import annotations

import os
import shutil
import zipfile
from dataclasses import dataclass
from pathlib import Path

import duckdb
import pandas as pd


@dataclass(frozen=True)
class KaggleDatasetSpec:
    slug: str  # e.g. "blastchar/telco-customer-churn"
    name: str  # short stable identifier used in table names
    # If provided, only load matching CSV files
    include_globs: tuple[str, ...] = ("*.csv",)


def _require_kaggle() -> None:
    try:
        import kaggle  # noqa: F401
    except Exception as e:  # pragma: no cover
        raise RuntimeError(
            "Kaggle loader requires extra dependency. Install with: pip install -e '.[kaggle]'"
        ) from e


def _has_kaggle_creds() -> bool:
    # Kaggle API checks ~/.kaggle/kaggle.json or env vars
    if os.environ.get("KAGGLE_USERNAME") and os.environ.get("KAGGLE_KEY"):
        return True
    return Path.home().joinpath(".kaggle", "kaggle.json").exists()


def download_dataset(spec: KaggleDatasetSpec, *, out_dir: Path) -> Path:
    _require_kaggle()
    if not _has_kaggle_creds():  # pragma: no cover
        raise RuntimeError(
            "Kaggle credentials not found. Configure ~/.kaggle/kaggle.json or KAGGLE_USERNAME/KAGGLE_KEY."
        )

    out_dir.mkdir(parents=True, exist_ok=True)
    zip_path = out_dir / f"{spec.name}.zip"

    from kaggle.api.kaggle_api_extended import KaggleApi

    api = KaggleApi()
    api.authenticate()
    api.dataset_download_files(spec.slug, path=str(out_dir), quiet=False, unzip=False)

    # Kaggle API uses dataset name as zip filename; find newest zip in out_dir.
    zips = sorted(out_dir.glob("*.zip"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not zips:
        raise RuntimeError(f"Download failed for {spec.slug}")
    if zips[0] != zip_path:
        shutil.move(str(zips[0]), str(zip_path))
    return zip_path


def unzip_dataset(zip_path: Path, *, out_dir: Path) -> Path:
    extract_dir = out_dir / zip_path.stem
    if extract_dir.exists():
        return extract_dir
    extract_dir.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(path=str(extract_dir))
    return extract_dir


def load_csvs_into_duckdb(
    con: duckdb.DuckDBPyConnection,
    *,
    dataset_name: str,
    dataset_dir: Path,
    table_prefix: str = "kaggle",
    max_rows: int | None = None,
) -> list[str]:
    """
    Loads all CSV files found in dataset_dir into DuckDB tables:
      {table_prefix}_{dataset_name}_{csv_stem}
    """
    loaded_tables: list[str] = []
    for csv_path in sorted(dataset_dir.rglob("*.csv")):
        table = f"{table_prefix}_{dataset_name}_{csv_path.stem}".lower().replace("-", "_")
        df = pd.read_csv(csv_path)
        if max_rows is not None:
            df = df.head(max_rows)
        con.register("tmp_df", df)
        con.execute(f"CREATE OR REPLACE TABLE {table} AS SELECT * FROM tmp_df")
        con.unregister("tmp_df")
        loaded_tables.append(table)
    return loaded_tables

