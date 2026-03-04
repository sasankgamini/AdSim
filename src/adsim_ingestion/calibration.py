from __future__ import annotations

import json
import math
from dataclasses import dataclass
from pathlib import Path

import duckdb
import numpy as np


@dataclass(frozen=True)
class BetaParams:
    alpha: float
    beta: float


@dataclass(frozen=True)
class LogNormalParams:
    mu: float
    sigma: float


def beta_from_mean_concentration(mean: float, concentration: float) -> BetaParams:
    mean = float(mean)
    concentration = float(concentration)
    mean = min(max(mean, 1e-9), 1 - 1e-9)
    concentration = max(concentration, 2.0)
    alpha = mean * concentration
    beta = (1 - mean) * concentration
    return BetaParams(alpha=alpha, beta=beta)


def lognormal_from_mean_cv(mean: float, cv: float) -> LogNormalParams:
    mean = max(float(mean), 1e-12)
    cv = max(float(cv), 1e-6)
    sigma2 = math.log(1 + cv * cv)
    sigma = math.sqrt(sigma2)
    mu = math.log(mean) - 0.5 * sigma2
    return LogNormalParams(mu=mu, sigma=sigma)


def calibrate_from_benchmarks(
    con: duckdb.DuckDBPyConnection,
    *,
    ctr_concentration: float = 4000.0,
    conv_concentration: float = 800.0,
    money_cv: float = 0.6,
) -> dict:
    """
    Converts point-estimate benchmarks into distributions.

    Because most public reports provide only averages, we treat each average as the mean of a
    distribution with an assumed dispersion:
    - CTR, conversion_rate: Beta(mean, concentration)
    - CPC, CPA: LogNormal(mean, cv)
    """
    df = con.execute(
        """
        SELECT
          industry, platform, COALESCE(ad_format, '') AS ad_format,
          AVG(ctr) AS ctr,
          AVG(conversion_rate) AS conversion_rate,
          AVG(cpc) AS cpc,
          AVG(cpa) AS cpa,
          MAX(unit_currency) AS unit_currency
        FROM benchmarks
        GROUP BY 1,2,3
        """
    ).df()

    out: dict = {"version": 1, "groups": []}
    for _, r in df.iterrows():
        industry = str(r["industry"])
        platform = str(r["platform"])
        ad_format = str(r["ad_format"]) if r["ad_format"] is not None else ""
        unit_currency = r.get("unit_currency") if "unit_currency" in r else None

        group = {"industry": industry, "platform": platform, "ad_format": ad_format or None}

        if r["ctr"] is not None and not np.isnan(r["ctr"]):
            bp = beta_from_mean_concentration(float(r["ctr"]), ctr_concentration)
            group["ctr"] = {"dist": "beta", "alpha": bp.alpha, "beta": bp.beta}

        if r["conversion_rate"] is not None and not np.isnan(r["conversion_rate"]):
            bp = beta_from_mean_concentration(float(r["conversion_rate"]), conv_concentration)
            group["conversion_rate"] = {"dist": "beta", "alpha": bp.alpha, "beta": bp.beta}

        if r["cpc"] is not None and not np.isnan(r["cpc"]):
            lp = lognormal_from_mean_cv(float(r["cpc"]), money_cv)
            group["cpc"] = {
                "dist": "lognormal",
                "mu": lp.mu,
                "sigma": lp.sigma,
                "currency": unit_currency,
            }

        if r["cpa"] is not None and not np.isnan(r["cpa"]):
            lp = lognormal_from_mean_cv(float(r["cpa"]), money_cv)
            group["cpa"] = {
                "dist": "lognormal",
                "mu": lp.mu,
                "sigma": lp.sigma,
                "currency": unit_currency,
            }

        out["groups"].append(group)

    return out


def write_calibration_json(calibration: dict, *, out_path: str | Path) -> None:
    p = Path(out_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(calibration, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

