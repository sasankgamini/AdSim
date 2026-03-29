"use client";

import * as React from "react";
import { Loader2, Sparkles, Zap } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/charts/chart-shell";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface OptResult {
  goal: string;
  recommendation: {
    predicted_roi: number;
    best_audience_segment: { name: string; target_age_min?: number; target_age_max?: number; target_interests?: string[] };
    best_creative_messaging: { creative_type?: string; ad_copy?: string; creative_description?: string };
    best_platform_allocation: Record<string, number>;
    recommended_budget: number;
    recommended_campaign: Record<string, unknown>;
  };
  rankings: {
    arms_by_posterior_mean_roi: Array<{
      creative_index: number;
      segment_index: number;
      segment_name: string;
      posterior_mean_roi: number;
      posterior_var: number;
      n_pulls: number;
    }>;
  };
  history: Array<{
    step: number;
    segment_name: string;
    reward_roi: number;
    posterior_mean: number;
    best_budget: number;
    best_platform_allocations: Record<string, number>;
  }>;
}

export default function OptimizationInsightsPage() {
  const mounted = useMounted();

  const [campaignName, setCampaignName] = React.useState("");
  const [platform, setPlatform] = React.useState("Meta");
  const [creativeType, setCreativeType] = React.useState("video");
  const [budget, setBudget] = React.useState(5000);
  const [adCopy, setAdCopy] = React.useState("");
  const [interestsStr, setInterestsStr] = React.useState("");
  const [nTrials, setNTrials] = React.useState(10);

  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<OptResult | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    setResult(null);
    setProgress("Generating personas and running Thompson Sampling + Bayesian Optimization…");

    const interests = interestsStr.split(",").map((s) => s.trim()).filter(Boolean);

    try {
      const res = await fetch(`${API_BASE}/optimization/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_campaign: {
            name: campaignName || "Optimization Run",
            objective: "sales",
            target_platform: platform,
            creative_type: creativeType,
            budget,
            ad_copy: adCopy || "Discover our product. Start free today.",
            creative_description: `${creativeType} creative for optimization`,
            target_interests: interests,
          },
          segments: [
            { name: "Young (18-30)", target_age_min: 18, target_age_max: 30 },
            { name: "Mid (25-45)", target_age_min: 25, target_age_max: 45 },
            { name: "Broad (18-65)", target_age_min: 18, target_age_max: 65 },
          ],
          creatives: [
            { creative_type: "video" },
            { creative_type: "image" },
            { creative_type: "carousel" },
          ],
          n_bandit_trials: nTrials,
          bo_init_points: 5,
          bo_iterations: 8,
          simulation_personas: 800,
          simulation_iterations: 5000,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status}: ${text}`);
      }
      const data: OptResult = await res.json();
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Optimization failed. Is the backend running?");
    } finally {
      setLoading(false);
      setProgress("");
    }
  }

  const tooltipStyle: React.CSSProperties = {
    background: "hsl(var(--card)/0.85)",
    border: "1px solid hsl(var(--border)/0.7)",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "hsl(var(--card-fg))",
  };

  const arms = result?.rankings?.arms_by_posterior_mean_roi ?? [];
  const chartData = arms.map((a) => ({
    name: a.segment_name,
    roi: Number(a.posterior_mean_roi.toFixed(3)),
    pulls: a.n_pulls,
  }));

  const historyChart = (result?.history ?? []).map((h) => ({
    step: h.step + 1,
    roi: Number(h.reward_roi.toFixed(3)),
    segment: h.segment_name,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimization Insights"
        subtitle="Uses Thompson Sampling + Bayesian Optimization to discover the best audience segment, creative type, platform allocation, and budget."
      />

      {/* Config */}
      <Card>
        <CardHeader>
          <CardTitle>Base Campaign</CardTitle>
          <div className="text-sm text-[hsl(var(--muted-fg))]">
            Define a starting campaign. The optimizer will test 9 combinations of (3 creative types × 3 audience segments) and optimize platform allocation and budget using Bayesian Optimization.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Campaign name</div>
              <Input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="My product" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Platform</div>
              <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
                <option value="Google">Google</option>
                <option value="Meta">Meta</option>
                <option value="TikTok">TikTok</option>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Creative type</div>
              <Select value={creativeType} onChange={(e) => setCreativeType(e.target.value)}>
                <option value="video">Video</option>
                <option value="image">Image</option>
                <option value="carousel">Carousel</option>
                <option value="text">Text</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Budget ($)</div>
              <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 5000)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Interests</div>
              <Input value={interestsStr} onChange={(e) => setInterestsStr(e.target.value)} placeholder="fitness, startups" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Bandit trials</div>
              <Input type="number" value={nTrials} onChange={(e) => setNTrials(Number(e.target.value) || 10)} />
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Ad copy</div>
            <textarea className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm" rows={2} value={adCopy} onChange={(e) => setAdCopy(e.target.value)} placeholder="Discover our product. Start free today." />
          </div>
          <Button onClick={handleRun} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
            {loading ? progress : `Run Optimization (${nTrials} bandit trials × 13 BO evals × 5,000 sims)`}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {result && (
        <>
          {/* Recommendation */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>Optimal Configuration</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  Best predicted ROI found by Thompson Sampling over {result.history.length} trials with Bayesian Optimization per trial.
                </div>
              </div>
              <Badge tone="good">Best</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <MetricCard label="Predicted ROI" value={`${result.recommendation.predicted_roi.toFixed(2)}x`} />
                <MetricCard label="Budget" value={`$${result.recommendation.recommended_budget.toFixed(0)}`} />
                <MetricCard label="Segment" value={result.recommendation.best_audience_segment.name} />
                <MetricCard label="Creative" value={result.recommendation.best_creative_messaging.creative_type ?? "—"} />
              </div>
              <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Platform Allocation</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(result.recommendation.best_platform_allocation).map(([p, frac]) => (
                    <Badge key={p} tone="accent">{p}: {(frac * 100).toFixed(0)}%</Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Arm rankings */}
          <Card>
            <CardHeader>
              <CardTitle>Arm Rankings (Thompson Sampling)</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                Each arm is a (creative × audience segment) combination. Posterior mean ROI is updated after each trial.
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {arms.map((arm, idx) => (
                <div key={`${arm.creative_index}-${arm.segment_index}`} className={cn(
                  "rounded-2xl border p-4",
                  idx === 0 ? "border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.08)]" : "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)]",
                )}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn("grid h-8 w-8 place-items-center rounded-xl text-xs font-bold", idx === 0 ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted)/0.8)]")}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{arm.segment_name}</div>
                        <div className="text-xs text-[hsl(var(--muted-fg))]">Creative #{arm.creative_index + 1} · {arm.n_pulls} pulls</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{arm.posterior_mean_roi.toFixed(2)}x</div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">±{Math.sqrt(arm.posterior_var).toFixed(3)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Charts */}
          {mounted && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartShell title="Posterior Mean ROI by Arm" description="Thompson Sampling posterior estimates." right={<Badge tone="good">Live</Badge>}>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
                      <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}x`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0}x`, "ROI"]} />
                      <Bar dataKey="roi" radius={[8, 8, 4, 4]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted)/0.7)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>

              <ChartShell title="Trial History" description="ROI reward at each bandit trial." right={<Badge tone="accent">{result.history.length} trials</Badge>}>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historyChart} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
                      <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="step" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}x`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, _, props) => [`${v ?? 0}x — ${(props as { payload?: { segment?: string } })?.payload?.segment ?? ""}`, "ROI"]} />
                      <Bar dataKey="roi" radius={[8, 8, 4, 4]} fill="hsl(var(--accent-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>How optimization works</CardTitle></CardHeader>
            <CardContent className="text-sm text-[hsl(var(--muted-fg))] space-y-2">
              <p><span className="font-medium text-[hsl(var(--fg))]">Thompson Sampling</span>: each arm (creative × segment) has a Bayesian posterior for ROI. At each trial, the system samples from each posterior and picks the arm with the highest sample — balancing exploration vs exploitation.</p>
              <p><span className="font-medium text-[hsl(var(--fg))]">Bayesian Optimization</span>: within each trial, a Gaussian Process models ROI as a function of platform allocation (softmax over logits) and budget. Expected Improvement acquisition selects the next point to evaluate.</p>
              <p>Each evaluation runs a full Monte Carlo simulation (800 personas × 5,000 iterations). The result is a data-driven recommendation for the best creative, audience, platform mix, and budget.</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
      <div className="text-xs text-[hsl(var(--muted-fg))]">{label}</div>
      <div className="mt-1 text-lg font-semibold tracking-tight">{value}</div>
    </div>
  );
}
