from __future__ import annotations

import io
from typing import Any

import pandas as pd

from adsim_ingestion.scrapers.common import ScrapeResult, scrape_html_via_playwright


def _df_to_records(df: pd.DataFrame) -> list[dict[str, Any]]:
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    return df.replace({pd.NA: None}).to_dict(orient="records")


def scrape_wordstream_facebook_benchmarks(
    url: str = "https://www.wordstream.com/blog/ws/facebook-advertising-benchmarks",
) -> ScrapeResult:
    """
    WordStream's Facebook advertising benchmarks page commonly contains 4 simple HTML tables:
    CTR, CPC, CVR, CPA by Industry.

    This scraper merges them on Industry into a single row per industry.
    """
    html = scrape_html_via_playwright(url=url, wait_for_selector=None)
    dfs = pd.read_html(io.StringIO(html))
    tables = [_df_to_records(df) for df in dfs]

    by_industry: dict[str, dict[str, Any]] = {}
    for rows in tables:
        if not rows:
            continue
        cols = set(rows[0].keys())
        if "Industry" not in cols:
            continue
        # detect metric column name (other than Industry)
        metric_cols = [c for c in cols if c != "Industry"]
        if len(metric_cols) != 1:
            continue
        metric = metric_cols[0]
        for r in rows:
            ind = str(r.get("Industry", "")).strip()
            if not ind:
                continue
            by_industry.setdefault(ind, {"Industry": ind})
            by_industry[ind][metric] = r.get(metric)

    merged = list(by_industry.values())
    return ScrapeResult(source="wordstream_facebook_ads_benchmarks", url=url, extracted_rows=merged)

