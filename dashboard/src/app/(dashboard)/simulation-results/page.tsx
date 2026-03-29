"use client";

import * as React from "react";
import { Loader2, Sparkles } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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
import {
  type CampaignPayload,
  type SimulationResult,
  runSimulation,
  histogramToBuckets,
} from "@/lib/api";
import { useMounted } from "@/lib/use-mounted";

export default function SimulationResultsPage() {
  const mounted = useMounted();

  const [campaign, setCampaign] = React.useState<CampaignPayload>({
    name: "",
    objective: "sales",
    target_platform: "Meta",
    creative_type: "video",
    budget: 5000,
    ad_copy: "",
    creative_description: "",
    target_interests: [],
    target_age_min: 18,
    target_age_max: 65,
  });
  const [nPersonas, setNPersonas] = React.useState(1000);
  const [nSims, setNSims] = React.useState(10000);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SimulationResult | null>(null);

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runSimulation({
        campaign,
        n_personas: nPersonas,
        n_simulations: nSims,
      });
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const ctrBuckets = result
    ? histogramToBuckets(result.distributions.ctr.histogram, (v) => `${(v * 100).toFixed(2)}%`)
    : [];
  const roiBuckets = result
    ? histogramToBuckets(result.distributions.roi.histogram, (v) => `${v.toFixed(2)}x`)
    : [];
  const cvrBuckets = result
    ? histogramToBuckets(result.distributions.conversion_rate.histogram, (v) => `${(v * 100).toFixed(2)}%`)
    : [];

  const tooltipStyle: React.CSSProperties = {
    background: "hsl(var(--card)/0.85)",
    border: "1px solid hsl(var(--border)/0.7)",
    borderRadius: 12,
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "hsl(var(--card-fg))",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation Results"
        subtitle="Define a campaign and run a Monte Carlo simulation to see detailed CTR, ROI, and conversion rate distributions."
      />

      {/* Campaign form */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Parameters</CardTitle>
          <div className="text-sm text-[hsl(var(--muted-fg))]">
            Configure the campaign to simulate. All results are computed live by the Monte Carlo engine.
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Campaign name</div>
              <Input value={campaign.name} onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))} placeholder="My campaign" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Platform</div>
              <Select value={campaign.target_platform} onChange={(e) => setCampaign((c) => ({ ...c, target_platform: e.target.value as CampaignPayload["target_platform"] }))}>
                <option value="Google">Google</option>
                <option value="Meta">Meta</option>
                <option value="TikTok">TikTok</option>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Creative type</div>
              <Select value={campaign.creative_type} onChange={(e) => setCampaign((c) => ({ ...c, creative_type: e.target.value as CampaignPayload["creative_type"] }))}>
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
                <option value="text">Text</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Budget ($)</div>
              <Input type="number" value={campaign.budget} onChange={(e) => setCampaign((c) => ({ ...c, budget: Number(e.target.value) || 5000 }))} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Personas</div>
              <Input type="number" value={nPersonas} onChange={(e) => setNPersonas(Number(e.target.value) || 1000)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Simulations</div>
              <Input type="number" value={nSims} onChange={(e) => setNSims(Number(e.target.value) || 10000)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Interests</div>
              <Input
                value={(campaign.target_interests ?? []).join(", ")}
                onChange={(e) => setCampaign((c) => ({ ...c, target_interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                placeholder="fitness, sports"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Ad copy</div>
              <textarea className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm" rows={2} value={campaign.ad_copy} onChange={(e) => setCampaign((c) => ({ ...c, ad_copy: e.target.value }))} placeholder="Your ad copy" />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Creative description</div>
              <textarea className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm" rows={2} value={campaign.creative_description} onChange={(e) => setCampaign((c) => ({ ...c, creative_description: e.target.value }))} placeholder="Describe the visual" />
            </div>
          </div>
          <Button onClick={handleRun} disabled={loading} className="w-full">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading
              ? `Running ${nSims.toLocaleString()} simulations × ${nPersonas.toLocaleString()} personas…`
              : `Run Simulation (${nSims.toLocaleString()} × ${nPersonas.toLocaleString()})`}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {result && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Expected CTR</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">Median across {result.meta.n_simulations.toLocaleString()} sims</div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-tight">{(result.distributions.ctr.summary.p50 * 100).toFixed(2)}%</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">95% CI: {(result.distributions.ctr.summary.ci_low * 100).toFixed(2)}% – {(result.distributions.ctr.summary.ci_high * 100).toFixed(2)}%</div>
                </div>
                <Badge tone="good">Live</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Predicted ROI</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">95% credible interval</div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-tight">{result.distributions.roi.summary.p50.toFixed(2)}x</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">{result.distributions.roi.summary.ci_low.toFixed(2)}x – {result.distributions.roi.summary.ci_high.toFixed(2)}x</div>
                </div>
                <Badge tone={result.expected.roi_mean > 1 ? "good" : "accent"}>{result.expected.roi_mean > 1 ? "Profitable" : "Below 1x"}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risk</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">P(ROI &lt; 0)</div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-tight">{result.distributions.roi.summary.p05 < 0 ? "Yes" : "Low"}</div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">5th percentile: {result.distributions.roi.summary.p05.toFixed(2)}x</div>
                </div>
                <Badge tone={result.distributions.roi.summary.p05 >= 0 ? "good" : "accent"}>{result.distributions.roi.summary.p05 >= 0 ? "Safe" : "Risky"}</Badge>
              </CardContent>
            </Card>
          </div>

          {/* Distribution charts */}
          {mounted && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartShell title="CTR Distribution" description={`Click-through rate across ${result.meta.n_simulations.toLocaleString()} iterations.`} right={<Badge tone="good">Live</Badge>}>
                <DistributionBarChart data={ctrBuckets} color="hsl(var(--accent))" tooltipStyle={tooltipStyle} />
              </ChartShell>
              <ChartShell title="ROI Distribution" description="Forecasted return on investment." right={<Badge tone="accent">{result.meta.n_personas} personas</Badge>}>
                <DistributionBarChart data={roiBuckets} color="hsl(var(--accent-2))" tooltipStyle={tooltipStyle} />
              </ChartShell>
              <div className="lg:col-span-2">
                <ChartShell title="Conversion Rate Distribution" description="Fraction of personas that converted per iteration." right={<Badge tone="neutral">{result.meta.n_personas} personas</Badge>}>
                  <DistributionBarChart data={cvrBuckets} color="hsl(224 85% 55%)" tooltipStyle={tooltipStyle} />
                </ChartShell>
              </div>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>How the simulation works</CardTitle></CardHeader>
            <CardContent className="text-sm text-[hsl(var(--muted-fg))] space-y-2">
              <p><span className="font-medium text-[hsl(var(--fg))]">{result.meta.n_personas} synthetic personas</span> are generated with statistically distributed demographics and behavioral traits.</p>
              <p>For each of <span className="font-medium text-[hsl(var(--fg))]">{result.meta.n_simulations.toLocaleString()} iterations</span>, every persona sees your ad. Their <span className="font-medium text-[hsl(var(--fg))]">click probability</span> is: base CTR + interest overlap + platform match + creative factor + attention boost − fatigue penalty.</p>
              <p>If clicked, <span className="font-medium text-[hsl(var(--fg))]">conversion probability</span> uses purchase intent, interest match, and fatigue. Budget caps clicks at {result.meta.max_clicks_by_budget} (${result.meta.budget} ÷ ${result.meta.cpc.toFixed(2)} CPC).</p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DistributionBarChart({ data, color, tooltipStyle }: { data: Array<{ bucket: string; count: number }>; color: string; tooltipStyle: React.CSSProperties }) {
  const filtered = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 30)) === 0);
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis dataKey="bucket" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(filtered.length / 8))} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip cursor={{ fill: "hsl(var(--muted)/0.5)" }} contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-fg))" }} formatter={(v) => [`${v ?? 0} iterations`, "Count"]} />
          <Bar dataKey="count" radius={[6, 6, 2, 2]} fill={color} opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
