"""
Playwright-based scraper stub for pulling public CTR benchmark tables.

This module is intentionally minimal. It demonstrates how you could:
- open a public benchmark page (e.g., WordStream blog articles)
- extract HTML tables into pandas DataFrames
- write them into CSV inside data/sample_benchmarks

To keep the project fully offline by default, this script is not run
automatically; use it manually when you have network access.
"""

from pathlib import Path
from typing import List

import pandas as pd
from playwright.sync_api import sync_playwright


def scrape_public_ctr_tables(url: str) -> List[pd.DataFrame]:
    tables: List[pd.DataFrame] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url, wait_until="load")
        html = page.content()
        browser.close()

    try:
        tables = pd.read_html(html)
    except ValueError:
        tables = []
    return tables


def save_tables_to_csv(tables: List[pd.DataFrame], base_name: str) -> list[Path]:
    out_dir = Path(__file__).resolve().parents[1] / "data" / "scraped"
    out_dir.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    for i, df in enumerate(tables):
        path = out_dir / f"{base_name}_{i}.csv"
        df.to_csv(path, index=False)
        paths.append(path)
    return paths


if __name__ == "__main__":
    example_url = "https://www.wordstream.com/blog/ws/display-advertising-benchmarks"
    tables = scrape_public_ctr_tables(example_url)
    save_tables_to_csv(tables, "wordstream_display_benchmarks")

