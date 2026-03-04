from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

from adsim_ingestion.scrapers.common import ScrapeResult, scrape_table_page
from adsim_ingestion.scrapers.wordstream import scrape_wordstream_facebook_benchmarks


@dataclass(frozen=True)
class SourceSpec:
    source: str
    platform: str
    url: str
    wait_for_selector: str | None = "table"
    caption_like: str | None = None
    # How to map raw columns -> normalized fields (see normalize.normalize_common_benchmark_rows)
    field_map: dict | None = None
    default_ad_format: str | None = None
    unit_notes: str | None = None


def load_sources(path: str | Path) -> list[SourceSpec]:
    """
    Load SourceSpecs from a JSON file containing a list of objects with SourceSpec fields.
    """
    p = Path(path)
    data = json.loads(p.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("sources file must be a JSON list")
    out: list[SourceSpec] = []
    for obj in data:
        out.append(SourceSpec(**obj))
    return out


def scrape_source(spec: SourceSpec, *, user_data_dir: str | None = None) -> ScrapeResult:
    if spec.source == "wordstream_facebook_ads_benchmarks":
        return scrape_wordstream_facebook_benchmarks(url=spec.url)
    return scrape_table_page(
        source=spec.source,
        url=spec.url,
        wait_for_selector=spec.wait_for_selector,
        caption_like=spec.caption_like,
        user_data_dir=user_data_dir,
    )


# NOTE: These URLs/field maps are intentionally conservative defaults.
# Many benchmark reports change their table markup over time; you can adjust SourceSpecs without
# changing the pipeline code.
DEFAULT_SOURCES: list[SourceSpec] = [
    SourceSpec(
        source="wordstream_facebook_ads_benchmarks",
        platform="meta_ads",
        url="https://www.wordstream.com/blog/ws/facebook-advertising-benchmarks",
        field_map={
            "industry": "Industry",
            "ctr": "Average CTR",
            "conversion_rate": "Average CVR",
            "cpc": "Average CPC",
            "cpa": "Average CPA",
        },
        default_ad_format="feed",
        unit_notes="WordStream Facebook Ads benchmarks by industry.",
    ),
    # WordStream publishes a Google Ads CTR benchmark report (often with industry table).
    SourceSpec(
        source="wordstream_google_ads_ctr",
        platform="google_ads",
        url="https://www.wordstream.com/blog/ws/google-ads-industry-benchmarks",
        field_map={
            "industry": "Industry",
            "ctr": "CTR",
            "conversion_rate": "Conv. Rate",
            "cpc": "Avg. CPC",
            "cpa": "Cost / Conv.",
        },
        default_ad_format="search",
        unit_notes="Values are typically Google Ads Search benchmarks; verify report context.",
    ),
    # HubSpot reports sometimes embed benchmark tables; this is a placeholder spec that may need tuning.
    SourceSpec(
        source="hubspot_marketing_benchmarks",
        platform="other",
        url="https://blog.hubspot.com/marketing/marketing-statistics",
        field_map={
            "industry": "Industry",
            "ctr": "CTR",
            "conversion_rate": "Conversion Rate",
            "cpc": "CPC",
            "cpa": "CPA",
        },
        unit_notes="HubSpot pages are not always table-based; adjust to specific report URLs if needed.",
    ),
    # Meta benchmarks are frequently published via Meta Business/partners; this may require auth.
    SourceSpec(
        source="meta_ads_benchmarks_public",
        platform="meta_ads",
        url="https://www.facebook.com/business/news/insights",
        field_map={
            "industry": "Industry",
            "ctr": "CTR",
            "conversion_rate": "Conversion Rate",
            "cpc": "CPC",
            "cpa": "CPA",
        },
        unit_notes="May require authentication or different public URL; treat as configurable.",
    ),
    # Google Ads benchmarks often appear as blog/partner tables; placeholder spec.
    SourceSpec(
        source="google_ads_benchmarks_public",
        platform="google_ads",
        url="https://support.google.com/google-ads/answer/6167112",
        field_map={
            "industry": "Industry",
            "ctr": "CTR",
            "conversion_rate": "Conversion rate",
            "cpc": "Avg. CPC",
            "cpa": "Avg. CPA",
        },
        unit_notes="Google Help Center pages rarely provide industry tables; update to specific benchmark pages.",
    ),
    # Statista typically requires login; placeholder spec for public datasets pages.
    SourceSpec(
        source="statista_marketing_datasets",
        platform="other",
        url="https://www.statista.com/markets/413/topic/470/advertising-marketing/",
        field_map={
            "industry": "Industry",
            "ctr": "CTR",
            "conversion_rate": "Conversion rate",
            "cpc": "CPC",
            "cpa": "CPA",
        },
        unit_notes="Often gated; use Playwright persistent profile if you have access.",
    ),
]

