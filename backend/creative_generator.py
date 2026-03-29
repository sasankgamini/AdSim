"""
Gemini-powered ad creative generator.

Uses the free Google AI Studio API (google-genai) to generate ad copy,
creative descriptions, and performance rationale given campaign parameters.

Set GEMINI_API_KEY env var to enable. Without it, the endpoint returns
a helpful fallback explaining how to get a free key.
"""

from __future__ import annotations

import json
import os
from typing import Optional

from pydantic import BaseModel, Field


class CreativeRequest(BaseModel):
    product_name: str = Field(..., description="Name of the product or brand")
    product_description: str = Field(..., description="What the product does")
    objective: str = Field(default="sales", description="Campaign objective: awareness, traffic, leads, sales")
    target_platform: str = Field(default="Meta", description="Google, Meta, or TikTok")
    creative_type: str = Field(default="video", description="image, video, carousel, or text")
    target_audience: str = Field(default="", description="Freeform audience description, e.g. 'fitness enthusiasts 22-35'")
    target_interests: list[str] = Field(default_factory=list)
    budget: float = Field(default=5000, gt=0)
    tone: str = Field(default="professional", description="Brand voice: professional, playful, urgent, minimal, bold")
    n_variants: int = Field(default=3, ge=1, le=5, description="Number of creative variants to generate")


class CreativeVariant(BaseModel):
    variant_name: str
    ad_copy: str
    creative_description: str
    headline: str
    cta: str
    rationale: str


class CreativeResponse(BaseModel):
    variants: list[CreativeVariant]
    suggested_campaign: dict
    strategy_notes: str


SYSTEM_PROMPT = """You are an expert performance marketing creative strategist.
Given campaign parameters, generate ad creative variants that are designed to
perform well in Monte Carlo simulations against synthetic personas.

Each persona has: age, gender, income, interests (fitness, gaming, finance,
travel, beauty, startups, parenting, education, sports, food), platform
preference, purchase_intent (0-1), ad_fatigue (0-1), attention_span (0-1).

Creatives that perform well have:
- Strong interest overlap with target personas
- Platform-native format (vertical video for TikTok, carousel for Google, etc.)
- Copy that appeals to high-purchase-intent users
- Hooks that capture attention quickly (for high attention_span boost)
- Fresh angles that reduce ad fatigue penalty

Return ONLY valid JSON matching this schema:
{
  "variants": [
    {
      "variant_name": "string",
      "ad_copy": "string (the actual ad text, 1-3 sentences)",
      "creative_description": "string (visual/format description for the creative)",
      "headline": "string (short headline)",
      "cta": "string (call to action text)",
      "rationale": "string (why this creative should perform well with the target personas)"
    }
  ],
  "suggested_campaign": {
    "name": "string",
    "objective": "string",
    "target_platform": "string",
    "creative_type": "string",
    "budget": number,
    "ad_copy": "string (best variant's ad copy)",
    "creative_description": "string (best variant's creative description)",
    "target_interests": ["string"],
    "target_age_min": number,
    "target_age_max": number
  },
  "strategy_notes": "string (overall strategy reasoning, what to A/B test)"
}"""


def _build_user_prompt(req: CreativeRequest) -> str:
    return f"""Generate {req.n_variants} ad creative variants for:

Product: {req.product_name}
Description: {req.product_description}
Objective: {req.objective}
Platform: {req.target_platform}
Creative format: {req.creative_type}
Target audience: {req.target_audience or "broad"}
Interests to target: {", ".join(req.target_interests) if req.target_interests else "infer from product"}
Budget: ${req.budget:,.0f}
Brand tone: {req.tone}

Remember: these creatives will be tested in a Monte Carlo simulation against
synthetic personas. Optimize for click-through rate and conversion rate by
matching persona interests, platform behavior, and attention patterns."""


def _parse_gemini_response(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
    if text.endswith("```"):
        text = text[:-3]
    if text.startswith("json"):
        text = text[4:]
    return json.loads(text.strip())


async def generate_creative(req: CreativeRequest) -> dict:
    api_key = os.environ.get("GEMINI_API_KEY", "")

    if not api_key:
        return _fallback_response(req)

    try:
        from google import genai

        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=_build_user_prompt(req),
            config={
                "system_instruction": SYSTEM_PROMPT,
                "temperature": 0.8,
            },
        )

        parsed = _parse_gemini_response(response.text)
        return parsed
    except Exception:
        fallback = _fallback_response(req)
        fallback["strategy_notes"] = (
            "Gemini API call failed (rate limit or network error). "
            "Showing template-based creatives instead. "
            "The simulation results are still fully real."
        )
        return fallback


def _fallback_response(req: CreativeRequest) -> dict:
    """Return a structured response without Gemini when no API key is set."""
    interests = req.target_interests or ["fitness", "startups"]
    return {
        "variants": [
            {
                "variant_name": f"{req.product_name} — Direct Response",
                "ad_copy": f"Discover {req.product_name}. {req.product_description[:80]}. Start free today.",
                "creative_description": f"{req.creative_type.title()} creative on {req.target_platform}: product hero shot with bold headline, social proof badge, and clear CTA button.",
                "headline": f"Try {req.product_name} Free",
                "cta": "Get Started",
                "rationale": f"Direct response format on {req.target_platform} with clear value prop targets high purchase-intent personas. {req.creative_type.title()} format matches platform expectations.",
            },
            {
                "variant_name": f"{req.product_name} — Social Proof",
                "ad_copy": f"Join 10,000+ users who switched to {req.product_name}. See why they never looked back.",
                "creative_description": f"{req.creative_type.title()} featuring user testimonial quotes, star ratings, and before/after comparison.",
                "headline": f"Why Users Love {req.product_name}",
                "cta": "See Reviews",
                "rationale": "Social proof reduces skepticism in high-fatigue personas and boosts conversion for users with moderate purchase intent.",
            },
            {
                "variant_name": f"{req.product_name} — Urgency",
                "ad_copy": f"Limited time: {req.product_name} is offering early access. {req.product_description[:60]}. Don't miss out.",
                "creative_description": f"{req.creative_type.title()} with countdown timer overlay, vibrant colors, and animated CTA.",
                "headline": "Early Access — Limited Spots",
                "cta": "Claim Your Spot",
                "rationale": "Urgency messaging captures high-attention-span personas and drives immediate action from users with elevated purchase intent.",
            },
        ],
        "suggested_campaign": {
            "name": f"{req.product_name} — {req.target_platform} {req.creative_type.title()}",
            "objective": req.objective,
            "target_platform": req.target_platform,
            "creative_type": req.creative_type,
            "budget": req.budget,
            "ad_copy": f"Discover {req.product_name}. {req.product_description[:80]}. Start free today.",
            "creative_description": f"{req.creative_type.title()} creative on {req.target_platform}: product hero shot with bold headline and CTA.",
            "target_interests": interests,
            "target_age_min": 22,
            "target_age_max": 45,
        },
        "strategy_notes": "These are template-generated creatives (no Gemini API key set). To get AI-generated creatives tailored to your product, set GEMINI_API_KEY. Get a free key at https://aistudio.google.com/apikey",
    }
