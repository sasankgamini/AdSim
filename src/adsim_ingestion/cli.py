from __future__ import annotations

from pathlib import Path

import duckdb
import typer
from rich import print

from adsim_ingestion import db as dbmod
from adsim_ingestion.calibration import calibrate_from_benchmarks, write_calibration_json
from adsim_ingestion.kaggle_loader import KaggleDatasetSpec
from adsim_ingestion.pipeline import PipelineConfig, run_update
from adsim_ingestion.scrapers.sources import load_sources


app = typer.Typer(add_completion=False, help="AdSim ingestion + calibration CLI")


@app.command()
def update(
    db: Path = typer.Option(Path("data/benchmarks.duckdb"), help="DuckDB path"),
    all: bool = typer.Option(False, "--all", help="Run all benchmark scrapers"),
    sources_file: Path | None = typer.Option(
        None,
        help="JSON file with scraper source specs (overrides built-in defaults)",
    ),
    kaggle: bool = typer.Option(False, help="Run Kaggle dataset loaders"),
    playwright_profile: Path | None = typer.Option(
        None, help="Chromium user data dir for authenticated sources"
    ),
    kaggle_dataset: list[str] = typer.Option(
        None, help="Kaggle dataset slug(s) like owner/dataset"
    ),
    kaggle_name: list[str] = typer.Option(
        None, help="Short dataset names (same length as kaggle-dataset)"
    ),
    kaggle_max_rows: int | None = typer.Option(None, help="Max rows per CSV (debug)"),
):
    """
    Refresh benchmarks into DuckDB.
    """
    datasets: list[KaggleDatasetSpec] = []
    if kaggle:
        slugs = kaggle_dataset or []
        names = kaggle_name or []
        if names and len(names) != len(slugs):
            raise typer.BadParameter("--kaggle-name must match count of --kaggle-dataset")
        for i, slug in enumerate(slugs):
            nm = names[i] if names else slug.split("/")[-1]
            datasets.append(KaggleDatasetSpec(slug=slug, name=nm))

    cfg = PipelineConfig(db_path=db, playwright_user_data_dir=playwright_profile)
    if sources_file is not None:
        # Override built-in defaults via config file.
        sources = load_sources(sources_file)
    else:
        sources = None
    res = run_update(
        cfg=cfg,
        run_all_scrapers=all,
        sources=sources,
        run_kaggle=kaggle,
        kaggle_datasets=datasets,
        kaggle_max_rows=kaggle_max_rows,
    )
    print(res)


@app.command()
def calibrate(
    db: Path = typer.Option(Path("data/benchmarks.duckdb"), help="DuckDB path"),
    out: Path = typer.Option(Path("data/calibration.json"), help="Output JSON path"),
    ctr_concentration: float = typer.Option(4000.0, help="Beta concentration for CTR"),
    conv_concentration: float = typer.Option(800.0, help="Beta concentration for conversion rate"),
    money_cv: float = typer.Option(0.6, help="LogNormal coefficient of variation for CPC/CPA"),
):
    """
    Convert stored benchmarks into persona-friendly probability distributions.
    """
    con: duckdb.DuckDBPyConnection = dbmod.connect(db)
    try:
        calib = calibrate_from_benchmarks(
            con,
            ctr_concentration=ctr_concentration,
            conv_concentration=conv_concentration,
            money_cv=money_cv,
        )
    finally:
        con.close()
    write_calibration_json(calib, out_path=out)
    print({"ok": True, "out": str(out), "groups": len(calib.get("groups", []))})


def main() -> None:
    app()


if __name__ == "__main__":
    main()

