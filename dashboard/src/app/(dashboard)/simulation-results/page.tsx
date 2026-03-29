"use client";

import * as React from "react";
import { Loader2, TrendingUp } from "lucide-react";
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
import { Select } from "@/components/ui/select";
import {
  type SimulationResult,
  runSimulation,
  histogramToBuckets,
} from "@/lib/api";
import { exampleCampaigns } from "@/lib/example-campaigns";
import { useMounted } from "@/lib/use-mounted";

export default function SimulationResultsPage() {
  const mounted = useMounted();
  const [selectedId, setSelectedId] = React.useState(exampleCampaigns[0].id);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SimulationResult | null>(null);

  const selectedCampaign = exampleCampaigns.find((c) => c.id === selectedId) ?? exampleCampaigns[0];

  async function handleRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await runSimulation({
        campaign: selectedCampaign.campaign,
        n_personas: selectedCampaign.n_personas,
        n_simulations: selectedCampaign.n_simulations,
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

  const tooltipStyle = {
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
        subtitle="Real Monte Carlo distributions from the simulation engine."
        right={
          <div className="flex items-center gap-2">
            <Select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="w-[200px]">
              {exampleCampaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </Select>
            <Button onClick={handleRun} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
              {loading ? "Running…" : "Simulate"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {!result && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-fg))]">
              Select a campaign above and click &ldquo;Simulate&rdquo; to run {selectedCampaign.n_simulations.toLocaleString()} Monte Carlo
              iterations against {selectedCampaign.n_personas.toLocaleString()} synthetic personas.
              Each persona has unique attributes (age, income, interests, platform preference, purchase intent,
              ad fatigue, attention span) that determine their click and conversion probability.
            </p>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Expected CTR</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  Median across {result.meta.n_simulations.toLocaleString()} sims
                </div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-tight">
                    {(result.distributions.ctr.summary.p50 * 100).toFixed(2)}%
                  </div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                    95% CI: {(result.distributions.ctr.summary.ci_low * 100).toFixed(2)}% – {(result.distributions.ctr.summary.ci_high * 100).toFixed(2)}%
                  </div>
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
                  <div className="text-3xl font-semibold tracking-tight">
                    {result.distributions.roi.summary.p50.toFixed(2)}x
                  </div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                    {result.distributions.roi.summary.ci_low.toFixed(2)}x – {result.distributions.roi.summary.ci_high.toFixed(2)}x
                  </div>
                </div>
                <Badge tone={result.expected.roi_mean > 1 ? "good" : "accent"}>
                  {result.expected.roi_mean > 1 ? "Profitable" : "Below 1x"}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Risk</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">P(ROI &lt; 0)</div>
              </CardHeader>
              <CardContent className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-3xl font-semibold tracking-tight">
                    {result.distributions.roi.summary.p05 < 0 ? "Yes" : "Low"}
                  </div>
                  <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                    5th percentile: {result.distributions.roi.summary.p05.toFixed(2)}x
                  </div>
                </div>
                <Badge tone={result.distributions.roi.summary.p05 >= 0 ? "good" : "accent"}>
                  {result.distributions.roi.summary.p05 >= 0 ? "Safe" : "Risky"}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Distribution charts */}
          {mounted && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartShell
                title="CTR Distribution"
                description={`How click-through rate varies across ${result.meta.n_simulations.toLocaleString()} Monte Carlo iterations. Each bar = count of iterations that produced that CTR.`}
                right={<Badge tone="good">Live data</Badge>}
              >
                <DistributionBarChart data={ctrBuckets} color="hsl(var(--accent))" tooltipStyle={tooltipStyle} />
              </ChartShell>

              <ChartShell
                title="ROI Distribution"
                description="Forecasted return on investment across all iterations."
                right={<Badge tone="accent">{selectedCampaign.label}</Badge>}
              >
                <DistributionBarChart data={roiBuckets} color="hsl(var(--accent-2))" tooltipStyle={tooltipStyle} />
              </ChartShell>

              <div className="lg:col-span-2">
                <ChartShell
                  title="Conversion Rate Distribution"
                  description="Fraction of personas that converted (clicked then purchased) in each iteration."
                  right={<Badge tone="neutral">{result.meta.n_personas} personas</Badge>}
                >
                  <DistributionBarChart data={cvrBuckets} color="hsl(224 85% 55%)" tooltipStyle={tooltipStyle} />
                </ChartShell>
              </div>
            </div>
          )}

          {/* How it works */}
          <Card>
            <CardHeader><CardTitle>How the simulation works</CardTitle></CardHeader>
            <CardContent className="text-sm text-[hsl(var(--muted-fg))] space-y-2">
              <p>
                <span className="font-medium text-[hsl(var(--fg))]">{result.meta.n_personas} synthetic personas</span> are
                generated with realistic demographic distributions (age, income, gender, region, device) and behavioral
                traits (purchase intent, ad fatigue, attention span, interests, platform preference).
              </p>
              <p>
                For each of <span className="font-medium text-[hsl(var(--fg))]">{result.meta.n_simulations.toLocaleString()} iterations</span>,
                every persona sees your ad. Their <span className="font-medium text-[hsl(var(--fg))]">click probability</span> is
                computed as: base CTR + interest overlap boost + platform match boost + creative type factor
                + attention span boost − ad fatigue penalty, clamped to [0, 1].
              </p>
              <p>
                If a persona clicks, their <span className="font-medium text-[hsl(var(--fg))]">conversion probability</span> uses
                purchase intent, interest match, and fatigue. Budget caps total clicks
                at {result.meta.max_clicks_by_budget} (${result.meta.budget} ÷ ${result.meta.cpc.toFixed(2)} CPC).
              </p>
              <p>
                The distributions above show the spread of CTR, conversion rate, and ROI across all iterations — this is the
                Monte Carlo output that quantifies uncertainty before any money is spent.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function DistributionBarChart({
  data,
  color,
  tooltipStyle,
}: {
  data: Array<{ bucket: string; count: number }>;
  color: string;
  tooltipStyle: React.CSSProperties;
}) {
  const filtered = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 30)) === 0);
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis
            dataKey="bucket"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(0, Math.floor(filtered.length / 8))}
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted)/0.5)" }}
            contentStyle={tooltipStyle}
            labelStyle={{ color: "hsl(var(--muted-fg))" }}
            formatter={(value) => [`${value} iterations`, "Count"]}
          />
          <Bar dataKey="count" radius={[6, 6, 2, 2]} fill={color} opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
