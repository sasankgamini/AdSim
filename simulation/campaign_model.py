from typing import Literal, Optional

from pydantic import BaseModel, Field


Platform = Literal["Google", "Meta", "TikTok"]
CreativeType = Literal["image", "video", "carousel", "text"]
Objective = Literal["awareness", "traffic", "leads", "sales"]


class CampaignDefinition(BaseModel):
    name: str = Field(..., description="Internal campaign name")
    objective: Objective
    target_platform: Platform = Field(
        default="Meta",
        description="Primary platform; used if platform_allocations is not provided.",
    )
    platform_allocations: Optional[dict[Platform, float]] = Field(
        default=None,
        description="Optional budget split across platforms. Values are fractions that should sum to 1.",
    )
    creative_type: CreativeType
    budget: float = Field(..., gt=0)
    cpc_bid: Optional[float] = Field(
        default=None,
        description="Optional manual CPC bid; if absent a benchmark-based default is used.",
    )
    ad_copy: str
    creative_description: str
    target_keywords: list[str] = Field(default_factory=list)
    target_interests: list[str] = Field(default_factory=list)
    target_age_min: int = 18
    target_age_max: int = 65

