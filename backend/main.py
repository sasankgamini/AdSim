from typing import Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation.campaign_model import CampaignDefinition
from simulation.monte_carlo import SimulationRequest, SimulationWeights, run_campaign_simulation
from simulation.persona_engine import PersonaRequest, generate_personas


class SimulationRunBody(BaseModel):
    """API body: either provide personas or n_personas to generate them."""

    campaign: CampaignDefinition
    personas: Optional[list[dict]] = Field(default=None, description="Pre-generated personas; if omitted, backend generates them from n_personas.")
    n_personas: int = Field(default=1000, ge=100, le=5000, description="Used when personas is not provided.")
    n_simulations: int = Field(default=10_000, ge=100, le=500_000)
    seed: Optional[int] = None
    revenue_per_conversion: float = Field(default=120.0, gt=0)
    default_cpc: float = Field(default=1.5, gt=0)
    histogram_bins: int = Field(default=60, ge=10, le=400)
    return_samples: bool = False
    chunk_size: int = Field(default=2000, ge=100, le=50_000)
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.999)


app = FastAPI(
    title="AdSim — Agent-Based Advertising Simulation Engine",
    description="Simulate advertising campaign performance before spending budget.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}


@app.post("/personas/generate")
async def personas_endpoint(payload: PersonaRequest) -> dict:
    personas = generate_personas(payload)
    return {"personas": personas}


@app.post("/simulation/run")
async def simulation_endpoint(payload: SimulationRunBody) -> dict:
    if not payload.personas:
        personas = generate_personas(
            PersonaRequest(n_personas=payload.n_personas, seed=payload.seed)
        )
    else:
        personas = payload.personas

    req = SimulationRequest(
        campaign=payload.campaign,
        personas=personas,
        n_simulations=payload.n_simulations,
        seed=payload.seed,
        revenue_per_conversion=payload.revenue_per_conversion,
        default_cpc=payload.default_cpc,
        histogram_bins=payload.histogram_bins,
        return_samples=payload.return_samples,
        chunk_size=payload.chunk_size,
        confidence_level=payload.confidence_level,
    )
    return run_campaign_simulation(req)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)

