from __future__ import annotations

import json
import re
from dataclasses import dataclass


_PCT_RE = re.compile(r"(-?\d+(?:\.\d+)?)\s*%")
_NUM_RE = re.compile(r"(-?\d+(?:\.\d+)?)")


def _to_float(x: object) -> float | None:
    if x is None:
        return None
    if isinstance(x, (int, float)):
        return float(x)
    s = str(x).strip()
    if not s:
        return None
    m = _NUM_RE.search(s.replace(",", ""))
    if not m:
        return None
    try:
        return float(m.group(1))
    except ValueError:
        return None


def parse_percent_to_prob(x: object) -> float | None:
    """
    Accepts inputs like:
    - 2.5% -> 0.025
    - 0.025 -> 0.025 (assumed already a probability if <= 1.5)
    - 2.5 -> 0.025 (assumed percent if > 1.5 and <= 100)
    """
    if x is None:
        return None
    if isinstance(x, (int, float)):
        v = float(x)
        if 0 <= v <= 1.5:
            return v
        if 0 <= v <= 100:
            return v / 100.0
        return None
    s = str(x).strip()
    if not s:
        return None
    m = _PCT_RE.search(s)
    if m:
        try:
            return float(m.group(1)) / 100.0
        except ValueError:
            return None
    v = _to_float(s)
    if v is None:
        return None
    if 0 <= v <= 1.5:
        return v
    if 0 <= v <= 100:
        return v / 100.0
    return None


def parse_money(x: object) -> tuple[float | None, str | None]:
    """
    Returns (value, currency_code_guess).
    Handles strings like "$2.34", "USD 2.34", "€1,20".
    """
    if x is None:
        return None, None
    if isinstance(x, (int, float)):
        return float(x), None
    s = str(x).strip()
    if not s:
        return None, None

    currency = None
    if "$" in s:
        currency = "USD"
    elif "usd" in s.lower():
        currency = "USD"
    elif "eur" in s.lower() or "€" in s:
        currency = "EUR"
    elif "gbp" in s.lower() or "£" in s:
        currency = "GBP"

    v = _to_float(s)
    return v, currency


@dataclass(frozen=True)
class NormalizedBatch:
    raw_rows_json: list[str]
    normalized_rows: list[dict]


def normalize_common_benchmark_rows(
    *,
    source: str,
    platform: str,
    url: str | None,
    retrieved_at: str,
    rows: list[dict],
    field_map: dict,
    default_ad_format: str | None = None,
    unit_notes: str | None = None,
) -> NormalizedBatch:
    """
    Normalizes rows extracted from a benchmark page/table.

    `field_map` defines where to find raw fields:
      {
        "industry": "Industry",
        "ad_format": "Ad format",
        "ctr": "CTR",
        "conversion_rate": "Conversion rate",
        "cpc": "CPC",
        "cpa": "CPA",
      }
    """
    raw_rows_json = [json.dumps(r, ensure_ascii=False) for r in rows]
    out: list[dict] = []

    for r in rows:
        industry = str(r.get(field_map["industry"], "")).strip()
        if not industry:
            continue

        ad_format = None
        if "ad_format" in field_map:
            ad_format = r.get(field_map["ad_format"])
            if ad_format is not None:
                ad_format = str(ad_format).strip() or None
        if ad_format is None:
            ad_format = default_ad_format

        ctr = parse_percent_to_prob(r.get(field_map.get("ctr", "")))
        conv = parse_percent_to_prob(r.get(field_map.get("conversion_rate", "")))

        cpc, cpc_ccy = parse_money(r.get(field_map.get("cpc", "")))
        cpa, cpa_ccy = parse_money(r.get(field_map.get("cpa", "")))

        unit_currency = cpc_ccy or cpa_ccy
        out.append(
            {
                "industry": industry,
                "platform": platform,
                "ad_format": ad_format,
                "ctr": ctr,
                "conversion_rate": conv,
                "cpc": cpc,
                "cpa": cpa,
                "unit_currency": unit_currency,
                "unit_notes": unit_notes,
                "source": source,
                "url": url,
                "retrieved_at": retrieved_at,
            }
        )

    return NormalizedBatch(raw_rows_json=raw_rows_json, normalized_rows=out)

