from dataclasses import dataclass
from typing import List, Literal, Sequence

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field


Gender = Literal["male", "female", "non-binary", "unknown"]
Platform = Literal["Google", "Meta", "Instagram", "TikTok", "YouTube", "LinkedIn"]


class PersonaRequest(BaseModel):
    n_personas: int = Field(default=1000, ge=1, le=5000)
    seed: int | None = None


@dataclass
class Persona:
    age: int
    gender: Gender
    income: float
    interests: List[str]
    platform: Platform
    purchase_intent: float
    ad_fatigue: float
    attention_span: float
    device: Literal["mobile", "desktop", "tablet"]
    location_region: str


INTEREST_CATEGORIES: Sequence[str] = (
    "fitness",
    "gaming",
    "finance",
    "travel",
    "beauty",
    "startups",
    "parenting",
    "education",
    "sports",
    "food",
)

REGIONS: Sequence[str] = (
    "NA",
    "EU",
    "LATAM",
    "APAC",
    "MEA",
)


def _sample_demographics(n: int, rng: np.random.Generator) -> pd.DataFrame:
    # Very rough synthetic distributions; in a real system you would
    # parameterize these from public benchmark datasets in data/.
    ages = rng.normal(loc=35, scale=10, size=n).clip(18, 70).round().astype(int)
    genders = rng.choice(["male", "female", "non-binary"], size=n, p=[0.48, 0.48, 0.04])

    # Log-normal income distribution
    incomes = np.exp(rng.normal(np.log(55000), 0.6, size=n)).clip(20000, 250000)

    platforms = rng.choice(
        ["Google", "Meta", "Instagram", "TikTok", "YouTube", "LinkedIn"],
        size=n,
        p=[0.25, 0.2, 0.2, 0.15, 0.1, 0.1],
    )

    devices = rng.choice(["mobile", "desktop", "tablet"], size=n, p=[0.7, 0.25, 0.05])
    regions = rng.choice(list(REGIONS), size=n, p=[0.35, 0.25, 0.15, 0.2, 0.05])

    # Base behavioral traits
    purchase_intent = rng.beta(a=2.0, b=3.0, size=n)
    ad_fatigue = rng.beta(a=1.5, b=4.0, size=n)
    attention_span = rng.beta(a=2.0, b=2.5, size=n)

    df = pd.DataFrame(
        {
            "age": ages,
            "gender": genders,
            "income": incomes,
            "platform": platforms,
            "device": devices,
            "location_region": regions,
            "purchase_intent": purchase_intent,
            "ad_fatigue": ad_fatigue,
            "attention_span": attention_span,
        }
    )
    return df


def _sample_interests(n: int, rng: np.random.Generator) -> List[List[str]]:
    interests_list: List[List[str]] = []
    popularity = np.linspace(1.5, 0.5, num=len(INTEREST_CATEGORIES))
    probs = popularity / popularity.sum()
    for _ in range(n):
        n_tags = rng.integers(1, 4)
        tags = rng.choice(INTEREST_CATEGORIES, size=n_tags, replace=False, p=probs)
        interests_list.append(sorted(tags.tolist()))
    return interests_list


def generate_personas(req: PersonaRequest) -> list[dict]:
    rng = np.random.default_rng(req.seed)
    demo = _sample_demographics(req.n_personas, rng)
    demo["interests"] = _sample_interests(req.n_personas, rng)

    personas: list[dict] = []
    for row in demo.to_dict(orient="records"):
        personas.append(
            {
                "age": int(row["age"]),
                "gender": row["gender"],
                "income": float(row["income"]),
                "interests": row["interests"],
                "platform": row["platform"],
                "purchase_intent": float(row["purchase_intent"]),
                "ad_fatigue": float(row["ad_fatigue"]),
                "attention_span": float(row["attention_span"]),
                "device": row["device"],
                "location_region": row["location_region"],
            }
        )
    return personas

