from __future__ import annotations

import json
import io
from dataclasses import dataclass
from typing import Any

import pandas as pd
from bs4 import BeautifulSoup
from playwright.sync_api import Browser, TimeoutError as PlaywrightTimeoutError, sync_playwright


@dataclass(frozen=True)
class ScrapeResult:
    source: str
    url: str
    extracted_rows: list[dict[str, Any]]
    notes: str | None = None


def _extract_first_html_table(html: str) -> list[dict[str, Any]]:
    """
    Best-effort extraction for pages that render a single benchmark table.
    Uses pandas.read_html (lxml) for robustness across table markup variations.
    """
    try:
        dfs = pd.read_html(io.StringIO(html))
    except ValueError:
        return []
    if not dfs:
        return []
    df = dfs[0]
    df.columns = [str(c).strip() for c in df.columns]
    return df.replace({pd.NA: None}).to_dict(orient="records")


def _extract_table_by_caption_like(html: str, caption_substring: str) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "lxml")
    caption_substring = caption_substring.lower().strip()
    for table in soup.find_all("table"):
        cap = table.find("caption")
        if not cap:
            continue
        if caption_substring in cap.get_text(" ", strip=True).lower():
            try:
                return (
                    pd.read_html(io.StringIO(str(table)))[0]
                    .replace({pd.NA: None})
                    .to_dict(orient="records")
                )
            except Exception:
                return []
    return []


def scrape_html_via_playwright(
    *,
    url: str,
    wait_for_selector: str | None = None,
    user_data_dir: str | None = None,
    timeout_ms: int = 45_000,
) -> str:
    with sync_playwright() as p:
        if user_data_dir:
            context = p.chromium.launch_persistent_context(
                user_data_dir,
                headless=True,
                viewport={"width": 1400, "height": 900},
            )
            page = context.new_page()
        else:
            browser: Browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1400, "height": 900})
            page = context.new_page()

        page.set_default_timeout(timeout_ms)
        page.goto(url, wait_until="domcontentloaded")
        if wait_for_selector:
            try:
                # "visible" is too strict for many sites; attach is enough to proceed.
                page.wait_for_selector(wait_for_selector, state="attached")
            except PlaywrightTimeoutError:
                # Best-effort: proceed with whatever DOM we have.
                page.wait_for_load_state("networkidle")
        else:
            page.wait_for_load_state("networkidle")

        html = page.content()
        context.close()
        return html


def scrape_table_page(
    *,
    source: str,
    url: str,
    wait_for_selector: str | None = "table",
    caption_like: str | None = None,
    user_data_dir: str | None = None,
) -> ScrapeResult:
    html = scrape_html_via_playwright(url=url, wait_for_selector=wait_for_selector, user_data_dir=user_data_dir)
    if caption_like:
        rows = _extract_table_by_caption_like(html, caption_like)
    else:
        rows = _extract_first_html_table(html)
    return ScrapeResult(source=source, url=url, extracted_rows=rows)


def to_json_debug(result: ScrapeResult) -> str:
    return json.dumps(
        {
            "source": result.source,
            "url": result.url,
            "row_count": len(result.extracted_rows),
            "sample": result.extracted_rows[:3],
            "notes": result.notes,
        },
        ensure_ascii=False,
        indent=2,
    )

