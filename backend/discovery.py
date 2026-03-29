"""
Discovery engine — tests all platform × creative_type combinations
against a shared population of synthetic personas via Monte Carlo simulation.

Returns ranked results so the user knows what works BEFORE generating creatives.
"""

from __future__ import annotations

from typing import Any, Optional

import numpy as np
from pydantic import BaseModel, Field

from simulation.campaign_model import CampaignDefinition
from simulation.monte_carlo import SimulationRequest, run_campaign_simulation
from simulation.persona_engine import PersonaRequest, generate_personas


PLATFORMS = ["Google", "Meta", "TikTok"]
CREATIVE_TYPES = ["image", "video", "carousel", "text"]


class DiscoveryRequest(BaseModel):
    product_name: str = Field(..., min_length=1)
    product_description: str = Field(default="")
    budget: float = Field(default=5000, gt=0)
    target_interests: list[str] = Field(default_factory=list)
    target_age_min: int = Field(default=18, ge=13, le=80)
    target_age_max: int = Field(default=65, ge=18, le=100)
    n_personas: int = Field(default=1000, ge=200, le=3000)
    sims_per_combo: int = Field(default=3000, ge=500, le=20000)
    seed: Optional[int] = None


def run_discovery(req: DiscoveryRequest) -> dict[str, Any]:
    rng = np.random.default_rng(req.seed)

    personas = generate_personas(
        PersonaRequest(n_personas=req.n_personas, seed=req.seed)
    )

    rankings: list[dict[str, Any]] = []

    for platform in PLATFORMS:
        for creative_type in CREATIVE_TYPES:
            campaign = CampaignDefinition(
                name=f"{req.product_name} — {platform} {creative_type.title()}",
                objective="sales",
                target_platform=platform,
                creative_type=creative_type,
                budget=req.budget,
                ad_copy=req.product_description[:120] or f"Ad for {req.product_name}",
                creative_description=f"{creative_type.title()} creative for {req.product_name} on {platform}",
                target_interests=req.target_interests,
                target_age_min=req.target_age_min,
                target_age_max=req.target_age_max,
            )

            sim = run_campaign_simulation(
                SimulationRequest(
                    campaign=campaign,
                    personas=personas,
                    n_simulations=req.sims_per_combo,
                    seed=int(rng.integers(0, 1_000_000)),
                )
            )

            rankings.append({
                "platform": platform,
                "creative_type": creative_type,
                "ctr_mean": sim["expected"]["ctr_mean"],
                "roi_mean": sim["expected"]["roi_mean"],
                "conversion_rate_mean": sim["expected"]["conversion_rate_mean"],
                "avg_clicks": sim["expected"]["avg_clicks"],
                "avg_conversions": sim["expected"]["avg_conversions"],
                "avg_spend": sim["expected"]["avg_spend"],
                "avg_revenue": sim["expected"]["avg_revenue"],
                "ctr_ci": [
                    sim["distributions"]["ctr"]["summary"]["ci_low"],
                    sim["distributions"]["ctr"]["summary"]["ci_high"],
                ],
                "roi_ci": [
                    sim["distributions"]["roi"]["summary"]["ci_low"],
                    sim["distributions"]["roi"]["summary"]["ci_high"],
                ],
            })

    rankings.sort(key=lambda r: r["roi_mean"], reverse=True)
    for i, r in enumerate(rankings):
        r["rank"] = i + 1

    # Persona population summary
    interest_counts: dict[str, int] = {}
    platform_counts: dict[str, int] = {}
    age_brackets = {"18-24": 0, "25-34": 0, "35-44": 0, "45-54": 0, "55+": 0}

    for p in personas:
        for interest in p["interests"]:
            interest_counts[interest] = interest_counts.get(interest, 0) + 1
        platform_counts[p["platform"]] = platform_counts.get(p["platform"], 0) + 1
        age = p["age"]
        if age < 25:
            age_brackets["18-24"] += 1
        elif age < 35:
            age_brackets["25-34"] += 1
        elif age < 45:
            age_brackets["35-44"] += 1
        elif age < 55:
            age_brackets["45-54"] += 1
        else:
            age_brackets["55+"] += 1

    intents = [float(p["purchase_intent"]) for p in personas]
    fatigues = [float(p["ad_fatigue"]) for p in personas]
    attentions = [float(p["attention_span"]) for p in personas]

    return {
        "n_personas": len(personas),
        "combinations_tested": len(rankings),
        "sims_per_combo": req.sims_per_combo,
        "total_simulations": len(rankings) * req.sims_per_combo,
        "rankings": rankings,
        "best": rankings[0] if rankings else None,
        "persona_summary": {
            "avg_purchase_intent": float(np.mean(intents)),
            "avg_ad_fatigue": float(np.mean(fatigues)),
            "avg_attention_span": float(np.mean(attentions)),
            "interest_distribution": dict(
                sorted(interest_counts.items(), key=lambda x: -x[1])
            ),
            "platform_distribution": dict(
                sorted(platform_counts.items(), key=lambda x: -x[1])
            ),
            "age_distribution": age_brackets,
        },
    }
