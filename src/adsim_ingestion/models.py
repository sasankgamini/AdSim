from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Platform = Literal["google_ads", "meta_ads", "linkedin_ads", "tiktok_ads", "other"]


class RawRow(BaseModel):
    source: str
    url: str | None = None
    retrieved_at: str
    payload: dict


class BenchmarkRecord(BaseModel):
    industry: str = Field(min_length=1)
    platform: str = Field(min_length=1)
    ad_format: str | None = None
    ctr: float | None = Field(default=None, ge=0)
    conversion_rate: float | None = Field(default=None, ge=0)
    cpc: float | None = Field(default=None, ge=0)
    cpa: float | None = Field(default=None, ge=0)
    unit_currency: str | None = None
    unit_notes: str | None = None

