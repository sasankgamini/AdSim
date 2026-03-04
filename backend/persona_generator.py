import os
from dataclasses import dataclass
from typing import Optional

import duckdb
import numpy as np
import pandas as pd


@dataclass
class PersonaGenerationConfig:
    """Configuration for how many personas to generate and random seed."""

    n_personas: int = 1000
    random_seed: Optional[int] = None


class PersonaGenerator:
    """
    Vectorized synthetic persona generator.

    Personas are sampled from approximate US demographic and internet-usage
    distributions inspired by:
    - US Census age and income distributions
    - Pew Research internet usage by age
    - Statista device and social media usage breakdowns
    """

    # Age buckets (roughly US adult distribution, not exact)
    AGE_BUCKETS = np.array(
        [
            (18, 24),
            (25, 34),
            (35, 44),
            (45, 54),
            (55, 64),
            (65, 80),
        ]
    )
    AGE_BUCKET_PROBS = np.array(
        [
            0.13,  # 18–24
            0.18,  # 25–34
            0.18,  # 35–44
            0.17,  # 45–54
            0.17,  # 55–64
            0.17,  # 65–80
        ]
    )

    GENDERS = np.array(["female", "male", "nonbinary", "other"])
    GENDER_PROBS = np.array([0.51, 0.47, 0.01, 0.01])

    # Annual household income in USD brackets
    INCOME_BRACKETS = np.array(
        [
            "<25k",
            "25k-50k",
            "50k-75k",
            "75k-100k",
            "100k-150k",
            "150k+",
        ]
    )
    INCOME_PROBS = np.array([0.16, 0.22, 0.20, 0.16, 0.16, 0.10])

    REGIONS = np.array(["Northeast", "Midwest", "South", "West"])
    REGION_PROBS = np.array([0.17, 0.21, 0.38, 0.24])

    URBANICITY = np.array(["urban", "suburban", "rural"])
    URBANICITY_PROBS = np.array([0.31, 0.46, 0.23])

    DEVICE_TYPES = np.array(["mobile", "desktop", "tablet"])
    DEVICE_PROBS = np.array([0.68, 0.24, 0.08])

    SOCIAL_PLATFORMS = np.array(
        ["instagram", "tiktok", "facebook", "x", "youtube", "snapchat", "none"]
    )
    SOCIAL_PLATFORM_PROBS = np.array(
        [0.18, 0.16, 0.24, 0.07, 0.23, 0.07, 0.05]
    )

    INTERESTS = np.array(
        [
            "fitness",
            "gaming",
            "beauty",
            "finance",
            "travel",
            "food",
            "parenting",
            "tech",
            "fashion",
            "sports",
            "home_decor",
            "auto",
        ]
    )
    INTEREST_PROBS = np.array(
        [0.09, 0.11, 0.08, 0.09, 0.09, 0.09, 0.07, 0.10, 0.08, 0.09, 0.06, 0.05]
    )

    def __init__(self, config: Optional[PersonaGenerationConfig] = None) -> None:
        self.config = config or PersonaGenerationConfig()

    @staticmethod
    def _rng(seed: Optional[int]) -> np.random.Generator:
        return np.random.default_rng(seed)

    @classmethod
    def _sample_ages(cls, rng: np.random.Generator, n: int) -> np.ndarray:
        bucket_idx = rng.choice(
            len(cls.AGE_BUCKETS), size=n, p=cls.AGE_BUCKET_PROBS
        )
        lows = cls.AGE_BUCKETS[bucket_idx, 0]
        highs = cls.AGE_BUCKETS[bucket_idx, 1]
        # Uniform within each bucket
        return rng.integers(lows, highs + 1)

    @classmethod
    def _sample_categorical(
        cls, rng: np.random.Generator, choices: np.ndarray, probs: np.ndarray, n: int
    ) -> np.ndarray:
        return rng.choice(choices, size=n, p=probs)

    @classmethod
    def _sample_interests(
        cls, rng: np.random.Generator, n: int
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
        primary = rng.choice(cls.INTERESTS, size=n, p=cls.INTEREST_PROBS)
        secondary = rng.choice(cls.INTERESTS, size=n, p=cls.INTEREST_PROBS)
        # Avoid identical primary/secondary too often
        mask_same = primary == secondary
        resample = rng.choice(cls.INTERESTS, size=mask_same.sum(), p=cls.INTEREST_PROBS)
        secondary[mask_same] = resample
        # Compact "interests" string representation (for JSON / DuckDB)
        interests_str = np.where(
            primary == secondary, primary, primary + "," + secondary
        )
        return primary, secondary, interests_str

    @staticmethod
    def _sample_social_media_minutes(
        rng: np.random.Generator, n: int, ages: np.ndarray
    ) -> np.ndarray:
        # Younger cohorts tend to have higher daily social media minutes
        base = np.where(ages < 25, 160, 0)
        base += np.where((ages >= 25) & (ages < 45), 130, 0)
        base += np.where((ages >= 45) & (ages < 65), 95, 0)
        base += np.where(ages >= 65, 70, 0)
        noise = rng.normal(loc=0.0, scale=25.0, size=n)
        minutes = np.clip(base + noise, 10, 360)
        return minutes

    @staticmethod
    def _sample_attention_span(
        rng: np.random.Generator, n: int, social_minutes: np.ndarray
    ) -> np.ndarray:
        # Normalize to 0–1; more minutes on social tends to reduce attention span a bit
        norm_minutes = (social_minutes - social_minutes.min()) / max(
            social_minutes.max() - social_minutes.min(), 1.0
        )
        base = 0.65 - 0.25 * norm_minutes
        noise = rng.normal(loc=0.0, scale=0.08, size=n)
        attention = np.clip(base + noise, 0.1, 0.95)
        return attention

    @staticmethod
    def _sample_ad_fatigue(
        rng: np.random.Generator,
        n: int,
        social_minutes: np.ndarray,
        attention_span: np.ndarray,
    ) -> np.ndarray:
        # Higher social minutes and lower attention span increase fatigue
        norm_minutes = (social_minutes - social_minutes.min()) / max(
            social_minutes.max() - social_minutes.min(), 1.0
        )
        fatigue = 0.25 + 0.45 * norm_minutes + 0.35 * (1.0 - attention_span)
        noise = rng.normal(loc=0.0, scale=0.08, size=n)
        return np.clip(fatigue + noise, 0.0, 1.0)

    @staticmethod
    def _income_to_numeric(income_bracket: np.ndarray) -> np.ndarray:
        mapping = {
            "<25k": 20_000,
            "25k-50k": 37_500,
            "50k-75k": 62_500,
            "75k-100k": 87_500,
            "100k-150k": 125_000,
            "150k+": 175_000,
        }
        return np.vectorize(mapping.get)(income_bracket).astype(float)

    @staticmethod
    def _interest_purchase_uplift(primary_interest: np.ndarray) -> np.ndarray:
        uplift_mapping = {
            "fitness": 0.06,
            "gaming": 0.04,
            "beauty": 0.07,
            "finance": 0.09,
            "travel": 0.08,
            "food": 0.05,
            "parenting": 0.08,
            "tech": 0.09,
            "fashion": 0.06,
            "sports": 0.05,
            "home_decor": 0.05,
            "auto": 0.07,
        }
        default = 0.05
        uplift = np.full_like(primary_interest, default, dtype=float)
        for k, v in uplift_mapping.items():
            uplift[primary_interest == k] = v
        return uplift

    @classmethod
    def _compute_behavioral_weights(
        cls,
        ages: np.ndarray,
        income_bracket: np.ndarray,
        device_type: np.ndarray,
        primary_interest: np.ndarray,
        attention_span: np.ndarray,
        ad_fatigue: np.ndarray,
    ) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
        """
        Compute behavioral weights and derived probabilities:
        - click_weight, conversion_weight, ignore_weight
        - p_click, p_convert, p_ignore
        """
        income_num = cls._income_to_numeric(income_bracket)
        income_norm = (income_num - income_num.min()) / max(
            income_num.max() - income_num.min(), 1.0
        )

        age_norm = (ages - ages.min()) / max(ages.max() - ages.min(), 1.0)

        # Device engagement modifiers
        device_click_mod = np.where(device_type == "mobile", 1.1, 1.0)
        device_click_mod = np.where(device_type == "desktop", 1.05, device_click_mod)
        device_click_mod = np.where(device_type == "tablet", 0.95, device_click_mod)

        # Interest-specific uplift for likelihood of purchase
        interest_purchase_uplift = cls._interest_purchase_uplift(primary_interest)

        # Base scores
        base_click = 0.4 + 0.4 * attention_span - 0.3 * ad_fatigue
        base_click += 0.15 * (1.0 - age_norm)  # younger → slightly higher CTR
        base_click *= device_click_mod

        base_convert = (
            0.15
            + 0.45 * income_norm
            + 0.25 * attention_span
            + interest_purchase_uplift
            - 0.15 * ad_fatigue
        )

        base_ignore = 0.35 + 0.45 * ad_fatigue + 0.2 * (1.0 - attention_span)

        # Ensure positivity and soften extremes
        click_weight = np.clip(base_click, 0.01, None)
        conversion_weight = np.clip(base_convert, 0.01, None)
        ignore_weight = np.clip(base_ignore, 0.01, None)

        total = click_weight + conversion_weight + ignore_weight
        p_click = click_weight / total
        p_convert = conversion_weight / total
        p_ignore = ignore_weight / total

        return (
            click_weight,
            conversion_weight,
            ignore_weight,
            p_click,
            p_convert,
            p_ignore,
        )

    def generate(self, override_n: Optional[int] = None) -> pd.DataFrame:
        """Generate a DataFrame of synthetic personas."""
        n = override_n or self.config.n_personas
        rng = self._rng(self.config.random_seed)

        ages = self._sample_ages(rng, n)
        genders = self._sample_categorical(rng, self.GENDERS, self.GENDER_PROBS, n)
        income = self._sample_categorical(
            rng, self.INCOME_BRACKETS, self.INCOME_PROBS, n
        )
        regions = self._sample_categorical(rng, self.REGIONS, self.REGION_PROBS, n)
        urbanicity = self._sample_categorical(
            rng, self.URBANICITY, self.URBANICITY_PROBS, n
        )
        device_type = self._sample_categorical(
            rng, self.DEVICE_TYPES, self.DEVICE_PROBS, n
        )

        primary_interest, secondary_interest, interests_str = self._sample_interests(
            rng, n
        )

        social_platform = self._sample_categorical(
            rng, self.SOCIAL_PLATFORMS, self.SOCIAL_PLATFORM_PROBS, n
        )
        social_minutes = self._sample_social_media_minutes(rng, n, ages)

        attention_span = self._sample_attention_span(rng, n, social_minutes)
        ad_fatigue = self._sample_ad_fatigue(
            rng, n, social_minutes, attention_span
        )

        (
            click_weight,
            conversion_weight,
            ignore_weight,
            p_click,
            p_convert,
            p_ignore,
        ) = self._compute_behavioral_weights(
            ages=ages,
            income_bracket=income,
            device_type=device_type,
            primary_interest=primary_interest,
            attention_span=attention_span,
            ad_fatigue=ad_fatigue,
        )

        purchase_intent = conversion_weight / (
            conversion_weight + ignore_weight + 1e-6
        )

        df = pd.DataFrame(
            {
                "persona_id": np.arange(n, dtype=int),
                "age": ages,
                "gender": genders,
                "income_bracket": income,
                "region": regions,
                "urbanicity": urbanicity,
                "location": regions
                + ", "
                + urbanicity,  # composite location string
                "device_type": device_type,
                "primary_interest": primary_interest,
                "secondary_interest": secondary_interest,
                "interests": interests_str,
                "social_platform": social_platform,
                "social_media_minutes_per_day": social_minutes,
                "attention_span": attention_span,
                "ad_fatigue_score": ad_fatigue,
                "purchase_intent_score": purchase_intent,
                "click_weight": click_weight,
                "conversion_weight": conversion_weight,
                "ignore_weight": ignore_weight,
                "p_click": p_click,
                "p_convert": p_convert,
                "p_ignore": p_ignore,
            }
        )

        return df


def personas_to_json(df: pd.DataFrame, path: str) -> None:
    """Write personas to a JSON file (records/oriented)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    df.to_json(path, orient="records", lines=False, indent=2)


def personas_to_duckdb(
    df: pd.DataFrame,
    duckdb_path: str,
    table_name: str = "personas",
    overwrite: bool = True,
) -> None:
    """Write personas to a DuckDB file as a table."""
    os.makedirs(os.path.dirname(duckdb_path), exist_ok=True)
    con = duckdb.connect(duckdb_path)
    try:
        if overwrite:
            con.execute(f"DROP TABLE IF EXISTS {table_name}")
        con.register("personas_df", df)
        con.execute(
            f"CREATE TABLE {table_name} AS SELECT * FROM personas_df"
        )
    finally:
        con.close()


__all__ = [
    "PersonaGenerationConfig",
    "PersonaGenerator",
    "personas_to_json",
    "personas_to_duckdb",
]

