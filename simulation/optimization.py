from __future__ import annotations

from dataclasses import dataclass
from math import erf
from typing import Any, Optional

import numpy as np
from pydantic import BaseModel, Field
from sklearn.gaussian_process import GaussianProcessRegressor
from sklearn.gaussian_process.kernels import Matern, WhiteKernel

from .campaign_model import CampaignDefinition, Platform
from .monte_carlo import SimulationRequest, run_campaign_simulation
from .persona_engine import PersonaRequest, generate_personas


class CreativeCandidate(BaseModel):
    creative_type: Optional[str] = None
    ad_copy: Optional[str] = None
    creative_description: Optional[str] = None


class SegmentCandidate(BaseModel):
    name: str = Field(..., description="Human-readable segment name")
    target_age_min: Optional[int] = None
    target_age_max: Optional[int] = None
    target_interests: Optional[list[str]] = None
    target_keywords: Optional[list[str]] = None


class OptimizationRequest(BaseModel):
    """
    Goal: maximize predicted ROI.

    Method:
    - Multi-armed bandit (Thompson Sampling) over (creative x segment) arms
    - Bayesian optimization (Gaussian Process + Expected Improvement) for:
        - platform allocation (simplex) via softmax(logits)
        - budget (continuous range or discrete list)
    """

    base_campaign: CampaignDefinition

    creatives: list[CreativeCandidate] = Field(default_factory=list)
    segments: list[SegmentCandidate] = Field(default_factory=list)
    platforms: list[Platform] = Field(default_factory=lambda: ["Google", "Meta", "TikTok"])

    budget_min: Optional[float] = Field(default=None, gt=0)
    budget_max: Optional[float] = Field(default=None, gt=0)
    budgets: Optional[list[float]] = Field(
        default=None,
        description="Optional discrete budget choices (overrides budget_min/budget_max).",
    )

    n_bandit_trials: int = Field(default=20, ge=5, le=250)
    bo_init_points: int = Field(default=8, ge=3, le=60)
    bo_iterations: int = Field(default=20, ge=5, le=250)

    simulation_personas: int = Field(default=1000, ge=200, le=5000)
    simulation_iterations: int = Field(
        default=20_000,
        ge=500,
        le=500_000,
        description="Passed as n_simulations to the Monte Carlo engine.",
    )

    seed: int | None = None

    # Legacy support
    exploration_segments: list[dict] = Field(default_factory=list)


@dataclass(frozen=True)
class _Arm:
    creative_index: int
    segment_index: int

    def key(self) -> str:
        return f"c{self.creative_index}:s{self.segment_index}"


class _NormalPosterior:
    def __init__(self, *, prior_mean: float = 0.0, prior_var: float = 1.0, noise_var: float = 0.35):
        self.mean = float(prior_mean)
        self.var = float(prior_var)
        self.noise_var = float(noise_var)
        self.n = 0

    def sample(self, rng: np.random.Generator) -> float:
        return float(rng.normal(self.mean, np.sqrt(max(1e-9, self.var))))

    def update(self, reward: float) -> None:
        prior_prec = 1.0 / max(1e-9, self.var)
        like_prec = 1.0 / max(1e-9, self.noise_var)
        post_prec = prior_prec + like_prec
        self.mean = float((prior_prec * self.mean + like_prec * float(reward)) / post_prec)
        self.var = float(1.0 / post_prec)
        self.n += 1


def _softmax(z: np.ndarray) -> np.ndarray:
    z = z - np.max(z)
    e = np.exp(z)
    return e / np.sum(e)


def _campaign_from_choice(
    *,
    base: CampaignDefinition,
    creative: Optional[CreativeCandidate],
    segment: Optional[SegmentCandidate],
    platform_allocations: dict[Platform, float],
    budget: float,
) -> CampaignDefinition:
    data = base.model_dump()
    data["budget"] = float(budget)
    data["platform_allocations"] = {k: float(v) for k, v in platform_allocations.items()}

    if creative:
        if creative.creative_type is not None:
            data["creative_type"] = creative.creative_type
        if creative.ad_copy is not None:
            data["ad_copy"] = creative.ad_copy
        if creative.creative_description is not None:
            data["creative_description"] = creative.creative_description

    if segment:
        if segment.target_age_min is not None:
            data["target_age_min"] = segment.target_age_min
        if segment.target_age_max is not None:
            data["target_age_max"] = segment.target_age_max
        if segment.target_interests is not None:
            data["target_interests"] = segment.target_interests
        if segment.target_keywords is not None:
            data["target_keywords"] = segment.target_keywords

    return CampaignDefinition(**data)


def _mean_roi(sim_result: dict[str, Any]) -> float:
    return float(sim_result["distributions"]["roi"]["summary"]["mean"])


def _evaluate_roi(
    *,
    campaign: CampaignDefinition,
    personas: list[dict],
    n_simulations: int,
    rng: np.random.Generator,
) -> float:
    result = run_campaign_simulation(
        SimulationRequest(
            campaign=campaign,
            personas=personas,
            n_simulations=int(n_simulations),
            seed=int(rng.integers(0, 1_000_000)),
        )
    )
    return _mean_roi(result)


def _bayes_opt(
    *,
    base_campaign: CampaignDefinition,
    creative: Optional[CreativeCandidate],
    segment: Optional[SegmentCandidate],
    platforms: list[Platform],
    budget_min: float,
    budget_max: float,
    discrete_budgets: Optional[list[float]],
    personas: list[dict],
    n_simulations: int,
    rng: np.random.Generator,
    init_points: int,
    bo_iters: int,
) -> dict[str, Any]:
    p = len(platforms)
    if p <= 0:
        raise ValueError("platforms must contain at least one platform")

    def decode(x: np.ndarray) -> tuple[dict[Platform, float], float]:
        logits = x[:p]
        u = float(np.clip(x[p], 0.0, 1.0))
        frac = _softmax(np.asarray(logits, dtype=float))
        alloc = {platforms[i]: float(frac[i]) for i in range(p)}
        if discrete_budgets:
            b = sorted(float(v) for v in discrete_budgets if float(v) > 0)
            idx = int(np.clip(round(u * (len(b) - 1)), 0, len(b) - 1))
            budget = b[idx]
        else:
            budget = float(budget_min + u * (budget_max - budget_min))
        return alloc, budget

    def f(x: np.ndarray) -> float:
        alloc, budget = decode(x)
        campaign = _campaign_from_choice(
            base=base_campaign,
            creative=creative,
            segment=segment,
            platform_allocations=alloc,
            budget=budget,
        )
        return _evaluate_roi(campaign=campaign, personas=personas, n_simulations=n_simulations, rng=rng)

    d = p + 1
    X: list[np.ndarray] = []
    y: list[float] = []

    for _ in range(init_points):
        x = np.concatenate([rng.uniform(-2.0, 2.0, size=p), rng.uniform(0.0, 1.0, size=1)])
        X.append(x)
        y.append(f(x))

    kernel = Matern(nu=2.5) + WhiteKernel(noise_level=1e-3, noise_level_bounds=(1e-6, 1e-1))
    gp = GaussianProcessRegressor(kernel=kernel, normalize_y=True, random_state=int(rng.integers(0, 1_000_000)))

    def ei(mu: np.ndarray, sigma: np.ndarray, best: float) -> np.ndarray:
        sigma = np.maximum(sigma, 1e-9)
        z = (mu - best) / sigma
        pdf = np.exp(-0.5 * z**2) / np.sqrt(2.0 * np.pi)
        cdf = 0.5 * (1.0 + np.vectorize(erf)(z / np.sqrt(2.0)))
        return (mu - best) * cdf + sigma * pdf

    for _ in range(bo_iters):
        X_mat = np.vstack(X)
        y_arr = np.asarray(y, dtype=float)
        gp.fit(X_mat, y_arr)
        best_y = float(y_arr.max())

        cand = rng.uniform(-2.0, 2.0, size=(256, d))
        cand[:, p] = rng.uniform(0.0, 1.0, size=256)
        mu, std = gp.predict(cand, return_std=True)
        x_next = cand[int(np.argmax(ei(mu, std, best_y)))]
        X.append(x_next)
        y.append(f(x_next))

    best_i = int(np.argmax(np.asarray(y)))
    best_alloc, best_budget = decode(X[best_i])
    return {"best_roi": float(y[best_i]), "best_budget": float(best_budget), "best_platform_allocations": best_alloc}


def optimize_campaign(req: OptimizationRequest) -> dict:
    rng = np.random.default_rng(req.seed)

    creatives = req.creatives[:] if req.creatives else [CreativeCandidate()]
    segments = req.segments[:]
    if not segments and req.exploration_segments:
        for i, seg in enumerate(req.exploration_segments):
            segments.append(
                SegmentCandidate(
                    name=str(seg.get("name", f"segment_{i}")),
                    target_age_min=seg.get("target_age_min"),
                    target_age_max=seg.get("target_age_max"),
                    target_interests=seg.get("target_interests"),
                    target_keywords=seg.get("target_keywords"),
                )
            )
    if not segments:
        segments = [SegmentCandidate(name="default")]

    platforms = req.platforms[:] if req.platforms else ["Meta"]

    if req.budgets:
        discrete_budgets = [float(b) for b in req.budgets if float(b) > 0]
        budget_min = float(min(discrete_budgets))
        budget_max = float(max(discrete_budgets))
    else:
        discrete_budgets = None
        budget_min = float(req.budget_min) if req.budget_min is not None else float(req.base_campaign.budget * 0.5)
        budget_max = float(req.budget_max) if req.budget_max is not None else float(req.base_campaign.budget * 2.0)
    if budget_max <= budget_min:
        budget_max = budget_min * 1.5

    personas = generate_personas(PersonaRequest(n_personas=req.simulation_personas, seed=req.seed))

    arms = [_Arm(ci, si) for ci in range(len(creatives)) for si in range(len(segments))]
    post = {a.key(): _NormalPosterior() for a in arms}
    history: list[dict[str, Any]] = []
    best: dict[str, Any] | None = None

    for t in range(req.n_bandit_trials):
        scores = np.array([post[a.key()].sample(rng) for a in arms], dtype=float)
        arm = arms[int(np.argmax(scores))]

        creative = creatives[arm.creative_index]
        segment = segments[arm.segment_index]

        bo = _bayes_opt(
            base_campaign=req.base_campaign,
            creative=creative,
            segment=segment,
            platforms=platforms,
            budget_min=budget_min,
            budget_max=budget_max,
            discrete_budgets=discrete_budgets,
            personas=personas,
            n_simulations=req.simulation_iterations,
            rng=rng,
            init_points=req.bo_init_points,
            bo_iters=req.bo_iterations,
        )

        reward = float(bo["best_roi"])
        post[arm.key()].update(reward)

        history.append(
            {
                "step": t,
                "arm": {"creative_index": arm.creative_index, "segment_index": arm.segment_index},
                "segment_name": segment.name,
                "reward_roi": reward,
                "posterior_mean": post[arm.key()].mean,
                "best_budget": bo["best_budget"],
                "best_platform_allocations": bo["best_platform_allocations"],
            }
        )

        if best is None or reward > float(best["predicted_roi"]):
            best = {
                "predicted_roi": reward,
                "creative": creative.model_dump(),
                "segment": segment.model_dump(),
                "budget": bo["best_budget"],
                "platform_allocations": bo["best_platform_allocations"],
            }

    if best is None:
        best = {
            "predicted_roi": 0.0,
            "creative": creatives[0].model_dump(),
            "segment": segments[0].model_dump(),
            "budget": float(req.base_campaign.budget),
            "platform_allocations": {platforms[0]: 1.0},
        }

    arm_rank = []
    for a in arms:
        p = post[a.key()]
        arm_rank.append(
            {
                "creative_index": a.creative_index,
                "segment_index": a.segment_index,
                "segment_name": segments[a.segment_index].name,
                "posterior_mean_roi": p.mean,
                "posterior_var": p.var,
                "n_pulls": p.n,
            }
        )
    arm_rank.sort(key=lambda r: r["posterior_mean_roi"], reverse=True)

    recommended_campaign = _campaign_from_choice(
        base=req.base_campaign,
        creative=CreativeCandidate(**best["creative"]),
        segment=SegmentCandidate(**best["segment"]),
        platform_allocations=best["platform_allocations"],
        budget=float(best["budget"]),
    ).model_dump()

    return {
        "goal": "maximize_predicted_roi",
        "recommendation": {
            "predicted_roi": float(best["predicted_roi"]),
            "best_audience_segment": best["segment"],
            "best_creative_messaging": best["creative"],
            "best_platform_allocation": best["platform_allocations"],
            "recommended_budget": float(best["budget"]),
            "recommended_campaign": recommended_campaign,
        },
        "rankings": {"arms_by_posterior_mean_roi": arm_rank[: min(25, len(arm_rank))]},
        "history": history,
    }

