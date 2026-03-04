from __future__ import annotations

import io

import pandas as pd

from adsim_ingestion.scrapers.common import scrape_html_via_playwright


def debug_table_detection(url: str) -> dict:
    html = scrape_html_via_playwright(url=url, wait_for_selector=None)
    try:
        dfs = pd.read_html(io.StringIO(html))
    except Exception as e:
        return {"url": url, "ok": False, "error": str(e), "tables": 0}

    shapes = []
    for df in dfs[:5]:
        shapes.append({"rows": int(df.shape[0]), "cols": int(df.shape[1]), "columns": [str(c) for c in df.columns]})
    return {"url": url, "ok": True, "tables": len(dfs), "sample_tables": shapes}

