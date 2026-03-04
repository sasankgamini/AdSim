from __future__ import annotations

from typing import Any

import numpy as np
from pydantic import BaseModel, Field

from simulation.campaign_model import CampaignDefinition


class SimulationWeights(BaseModel):
    """
    Lightweight, interpretable probability model.

    We keep it intentionally simple: a base rate plus additive contributions
    (then clamped into [0, 1]). This matches the user's requested shape:
      P(click) = base_ctr + interest_weight + platform_weight + creative_weight
    while still allowing a few persona-driven terms.
    """

    # Click model
    base_ctr: float = Field(default=0.012, ge=0.0, le=0.5)
    interest_ctr_boost: float = Field(default=0.01, ge=0.0, le=0.2)
    platform_match_ctr_boost: float = Field(default=0.006, ge=0.0, le=0.2)
    creative_ctr_boost: float = Field(default=0.004, ge=0.0, le=0.2)
    purchase_intent_ctr_boost: float = Field(default=0.01, ge=0.0, le=0.2)
    attention_ctr_boost: float = Field(default=0.008, ge=0.0, le=0.2)
    fatigue_ctr_penalty: float = Field(default=0.012, ge=0.0, le=0.3)

    # Conversion model (conditional on click)
    base_cvr: float = Field(default=0.04, ge=0.0, le=0.9)
    interest_cvr_boost: float = Field(default=0.03, ge=0.0, le=0.9)
    purchase_intent_cvr_boost: float = Field(default=0.12, ge=0.0, le=0.9)
    fatigue_cvr_penalty: float = Field(default=0.05, ge=0.0, le=0.9)

    # Guards
    min_ctr: float = Field(default=0.0001, ge=0.0, le=0.1)
    max_ctr: float = Field(default=0.35, ge=0.05, le=0.95)
    min_cvr: float = Field(default=0.0001, ge=0.0, le=0.5)
    max_cvr: float = Field(default=0.8, ge=0.05, le=0.99)


class SimulationRequest(BaseModel):
    campaign: CampaignDefinition
    personas: list[dict] = Field(..., description="Personas from /personas/generate")

    n_simulations: int = Field(default=10_000, ge=100, le=500_000)
    seed: int | None = None

    # Unit economics
    revenue_per_conversion: float = Field(default=120.0, gt=0)
    default_cpc: float = Field(default=1.5, gt=0)

    # Output controls (API-friendly; avoids returning huge arrays by default)
    histogram_bins: int = Field(default=60, ge=10, le=400)
    return_samples: bool = Field(default=False)

    # Chunking to keep memory bounded: chunk_size * n_personas booleans per draw
    chunk_size: int = Field(default=2000, ge=100, le=50_000)

    weights: SimulationWeights = Field(default_factory=SimulationWeights)

    confidence_level: float = Field(default=0.95, ge=0.5, le=0.999)


def _clamp01(x: np.ndarray) -> np.ndarray:
    return np.clip(x, 0.0, 1.0)


def _campaign_creative_factor(creative_type: str) -> float:
    # Small, fixed deltas; tuned for plausible ordering, not "truth".
    return {
        "video": 1.15,
        "carousel": 1.08,
        "image": 1.0,
        "text": 0.92,
    }.get(creative_type, 1.0)


def _platform_match(
    persona_platform: np.ndarray, campaign_platform: str, platform_allocations: dict[str, float] | None
) -> np.ndarray:
    """
    Returns a match score in [0,1] per persona.

    - If platform_allocations is None, this is a hard match (1.0 if exact match).
    - If platform_allocations is provided, this becomes a *soft* match equal to
      the allocated fraction for that persona's platform.
    """
    if not platform_allocations:
        return (persona_platform == campaign_platform).astype(np.float32)
    alloc = {str(k): float(v) for k, v in platform_allocations.items()}
    total = sum(v for v in alloc.values() if v > 0)
    if total <= 0:
        return (persona_platform == campaign_platform).astype(np.float32)
    alloc = {k: v / total for k, v in alloc.items() if v > 0}
    return np.asarray([alloc.get(str(p), 0.0) for p in persona_platform], dtype=np.float32)


def _interest_match_score(persona_interests: list[list[str]], target_interests: list[str]) -> np.ndarray:
    if not target_interests:
        return np.zeros(len(persona_interests), dtype=np.float32)
    target = set(target_interests)
    scores = np.zeros(len(persona_interests), dtype=np.float32)
    for i, tags in enumerate(persona_interests):
        # Normalized overlap in [0,1]
        if not tags:
            continue
        overlap = len(target.intersection(tags))
        scores[i] = overlap / max(1, len(target))
    return scores


def _persona_arrays(personas: list[dict]) -> dict[str, Any]:
    # Note: most fields are numeric; interests/platform are handled separately.
    return {
        "platform": np.asarray([p.get("platform", "unknown") for p in personas], dtype=object),
        "purchase_intent": np.asarray([float(p.get("purchase_intent", 0.0)) for p in personas], dtype=float),
        "ad_fatigue": np.asarray([float(p.get("ad_fatigue", 0.0)) for p in personas], dtype=float),
        "attention_span": np.asarray([float(p.get("attention_span", 0.0)) for p in personas], dtype=float),
        "interests": [list(p.get("interests", [])) for p in personas],
        "age": np.asarray([int(p.get("age", 35)) for p in personas], dtype=int),
    }


def _compute_persona_probabilities(
    *,
    persona: dict[str, Any],
    campaign: CampaignDefinition,
    weights: SimulationWeights,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Returns:
      click_prob_per_persona: shape (n_personas,)
      conv_prob_given_click_per_persona: shape (n_personas,)
    """
    n = len(persona["purchase_intent"])

    # Targeting: age fit as a soft score in [0,1]
    age = persona["age"].astype(float)
    in_range = (age >= float(campaign.target_age_min)) & (age <= float(campaign.target_age_max))
    age_fit = in_range.astype(np.float32)

    platform_match = _platform_match(persona["platform"], campaign.target_platform, campaign.platform_allocations)
    interest_match = _interest_match_score(persona["interests"], campaign.target_interests)

    creative_factor = _campaign_creative_factor(campaign.creative_type)
    creative_term = weights.creative_ctr_boost * (creative_factor - 1.0)

    click_p = (
        weights.base_ctr
        + weights.interest_ctr_boost * interest_match
        + weights.platform_match_ctr_boost * platform_match
        + creative_term
        + weights.purchase_intent_ctr_boost * _clamp01(persona["purchase_intent"])
        + weights.attention_ctr_boost * _clamp01(persona["attention_span"])
        - weights.fatigue_ctr_penalty * _clamp01(persona["ad_fatigue"])
    )

    # Slight downweight for clearly out-of-target personas (still can click).
    click_p = click_p * (0.65 + 0.35 * age_fit)
    click_p = np.clip(click_p, weights.min_ctr, weights.max_ctr).astype(np.float32)

    conv_p = (
        weights.base_cvr
        + weights.interest_cvr_boost * interest_match
        + weights.purchase_intent_cvr_boost * _clamp01(persona["purchase_intent"])
        - weights.fatigue_cvr_penalty * _clamp01(persona["ad_fatigue"])
    )
    conv_p = conv_p * (0.75 + 0.25 * age_fit)
    conv_p = np.clip(conv_p, weights.min_cvr, weights.max_cvr).astype(np.float32)

    if len(click_p) != n or len(conv_p) != n:
        raise ValueError("Probability arrays must match number of personas.")

    return click_p, conv_p


def _distribution_summary(values: np.ndarray, confidence_level: float) -> dict[str, float]:
    values = np.asarray(values, dtype=float)
    alpha = 1.0 - float(confidence_level)
    lo_q = 100.0 * (alpha / 2.0)
    hi_q = 100.0 * (1.0 - alpha / 2.0)
    lo, hi = np.percentile(values, [lo_q, hi_q]).tolist()
    return {
        "mean": float(values.mean()),
        "std": float(values.std(ddof=1)) if values.size > 1 else 0.0,
        "p05": float(np.percentile(values, 5)),
        "p50": float(np.percentile(values, 50)),
        "p95": float(np.percentile(values, 95)),
        "ci_low": float(lo),
        "ci_high": float(hi),
    }


def _histogram(values: np.ndarray, bins: int) -> dict[str, list[float] | list[int]]:
    hist, edges = np.histogram(values, bins=int(bins))
    return {"bin_edges": edges.astype(float).tolist(), "counts": hist.astype(int).tolist()}


def run_campaign_simulation(req: SimulationRequest) -> dict:
    """
    Monte Carlo simulation of campaign performance.

    Vectorization strategy:
    - Compute per-persona probabilities once (size n_personas)
    - Simulate outcomes in chunks of simulations:
        U ~ Uniform(0,1) for (chunk, n_personas)
        click = U < click_prob
        convert = click & (V < conv_prob)
    """
    rng = np.random.default_rng(req.seed)

    persona = _persona_arrays(req.personas)
    click_prob, conv_prob = _compute_persona_probabilities(
        persona=persona, campaign=req.campaign, weights=req.weights
    )

    n_personas = int(len(req.personas))
    n_sims = int(req.n_simulations)
    chunk = int(min(req.chunk_size, n_sims))

    impressions = n_personas  # one impression/persona for this simplified engine

    # Spend model: budget-limited clicks at CPC
    cpc = float(req.campaign.cpc_bid) if req.campaign.cpc_bid is not None else float(req.default_cpc)
    max_clicks = int(np.floor(float(req.campaign.budget) / cpc))
    max_clicks = max(0, max_clicks)

    clicks_per_sim = np.zeros(n_sims, dtype=np.int32)
    conversions_per_sim = np.zeros(n_sims, dtype=np.int32)

    sim_idx = 0
    while sim_idx < n_sims:
        end = min(n_sims, sim_idx + chunk)
        m = end - sim_idx

        # Click draws
        u = rng.random((m, n_personas), dtype=np.float32)
        clicked = u < click_prob[None, :]
        clicks = clicked.sum(axis=1).astype(np.int32)

        # Apply budget cap at click stage (approximation)
        if max_clicks > 0:
            capped_clicks = np.minimum(clicks, max_clicks)
        else:
            capped_clicks = np.zeros_like(clicks)

        # Conversion draws (conditional on click)
        v = rng.random((m, n_personas), dtype=np.float32)
        converted = clicked & (v < conv_prob[None, :])
        conversions = converted.sum(axis=1).astype(np.int32)

        # If we capped clicks, scale conversions down proportionally.
        # This avoids selecting an explicit subset of clicked users (faster & stable).
        if max_clicks > 0:
            with np.errstate(divide="ignore", invalid="ignore"):
                frac = np.where(clicks > 0, capped_clicks / clicks, 0.0).astype(np.float32)
            conversions = np.floor(conversions.astype(np.float32) * frac).astype(np.int32)

        clicks_per_sim[sim_idx:end] = capped_clicks
        conversions_per_sim[sim_idx:end] = conversions
        sim_idx = end

    ctr = clicks_per_sim.astype(np.float32) / float(impressions)
    conversion_rate = conversions_per_sim.astype(np.float32) / float(impressions)

    spend = clicks_per_sim.astype(np.float32) * float(cpc)
    revenue = conversions_per_sim.astype(np.float32) * float(req.revenue_per_conversion)
    with np.errstate(divide="ignore", invalid="ignore"):
        roi = np.where(spend > 0, (revenue - spend) / spend, 0.0).astype(np.float32)

    result: dict[str, Any] = {
        "meta": {
            "n_simulations": n_sims,
            "n_personas": n_personas,
            "impressions_per_sim": impressions,
            "cpc": float(cpc),
            "budget": float(req.campaign.budget),
            "max_clicks_by_budget": int(max_clicks),
            "confidence_level": float(req.confidence_level),
        },
        "distributions": {
            "ctr": {
                "summary": _distribution_summary(ctr, req.confidence_level),
                "histogram": _histogram(ctr, req.histogram_bins),
            },
            "conversion_rate": {
                "summary": _distribution_summary(conversion_rate, req.confidence_level),
                "histogram": _histogram(conversion_rate, req.histogram_bins),
            },
            "roi": {
                "summary": _distribution_summary(roi, req.confidence_level),
                "histogram": _histogram(roi, req.histogram_bins),
            },
        },
        "expected": {
            "ctr_mean": float(ctr.mean()),
            "conversion_rate_mean": float(conversion_rate.mean()),
            "roi_mean": float(roi.mean()),
            "avg_clicks": float(clicks_per_sim.mean()),
            "avg_conversions": float(conversions_per_sim.mean()),
            "avg_spend": float(spend.mean()),
            "avg_revenue": float(revenue.mean()),
        },
    }

    if req.return_samples:
        # Warning: can be large; caller opted in.
        result["samples"] = {
            "ctr": ctr.astype(float).tolist(),
            "conversion_rate": conversion_rate.astype(float).tolist(),
            "roi": roi.astype(float).tolist(),
            "clicks": clicks_per_sim.astype(int).tolist(),
            "conversions": conversions_per_sim.astype(int).tolist(),
        }

    return result
