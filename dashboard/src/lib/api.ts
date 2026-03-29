const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface CampaignPayload {
  name: string;
  objective: "awareness" | "traffic" | "leads" | "sales";
  target_platform: "Google" | "Meta" | "TikTok";
  creative_type: "image" | "video" | "carousel" | "text";
  budget: number;
  ad_copy: string;
  creative_description: string;
  target_keywords?: string[];
  target_interests?: string[];
  target_age_min?: number;
  target_age_max?: number;
}

export interface SimulationPayload {
  campaign: CampaignPayload;
  n_personas?: number;
  n_simulations?: number;
  seed?: number;
  revenue_per_conversion?: number;
  default_cpc?: number;
  histogram_bins?: number;
  return_samples?: boolean;
  confidence_level?: number;
}

export interface DistributionSummary {
  mean: number;
  std: number;
  p05: number;
  p50: number;
  p95: number;
  ci_low: number;
  ci_high: number;
}

export interface Histogram {
  bin_edges: number[];
  counts: number[];
}

export interface SimulationResult {
  meta: {
    n_simulations: number;
    n_personas: number;
    impressions_per_sim: number;
    cpc: number;
    budget: number;
    max_clicks_by_budget: number;
    confidence_level: number;
  };
  distributions: {
    ctr: { summary: DistributionSummary; histogram: Histogram };
    conversion_rate: { summary: DistributionSummary; histogram: Histogram };
    roi: { summary: DistributionSummary; histogram: Histogram };
  };
  expected: {
    ctr_mean: number;
    conversion_rate_mean: number;
    roi_mean: number;
    avg_clicks: number;
    avg_conversions: number;
    avg_spend: number;
    avg_revenue: number;
  };
}

export interface Persona {
  age: number;
  gender: string;
  income: number;
  interests: string[];
  platform: string;
  purchase_intent: number;
  ad_fatigue: number;
  attention_span: number;
  device: string;
  location_region: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

export async function runSimulation(
  payload: SimulationPayload,
): Promise<SimulationResult> {
  return post<SimulationResult>("/simulation/run", payload);
}

export async function generatePersonas(
  n: number,
  seed?: number,
): Promise<Persona[]> {
  const data = await post<{ personas: Persona[] }>("/personas/generate", {
    n_personas: n,
    seed,
  });
  return data.personas;
}

export function histogramToBuckets(
  hist: Histogram,
  formatLabel: (v: number) => string = (v) => v.toFixed(3),
) {
  return hist.counts.map((count, i) => ({
    bucket: formatLabel((hist.bin_edges[i] + hist.bin_edges[i + 1]) / 2),
    count,
    midpoint: (hist.bin_edges[i] + hist.bin_edges[i + 1]) / 2,
  }));
}
