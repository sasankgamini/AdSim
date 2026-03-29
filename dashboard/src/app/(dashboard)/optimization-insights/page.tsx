"use client";

import * as React from "react";
import { FlaskConical, Loader2, Sparkles } from "lucide-react";
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
import {
  type SimulationResult,
  runSimulation,
} from "@/lib/api";
import { exampleCampaigns } from "@/lib/example-campaigns";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

interface ArmResult {
  id: string;
  label: string;
  platform: string;
  creative: string;
  ctr: number;
  roi: number;
  conversions: number;
  spend: number;
  full: SimulationResult;
}

export default function OptimizationInsightsPage() {
  const mounted = useMounted();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [arms, setArms] = React.useState<ArmResult[]>([]);
  const [progress, setProgress] = React.useState(0);

  async function handleRunAll() {
    setLoading(true);
    setError(null);
    setArms([]);
    setProgress(0);

    const results: ArmResult[] = [];

    try {
      for (let i = 0; i < exampleCampaigns.length; i++) {
        const ec = exampleCampaigns[i];
        setProgress(i + 1);

        const res = await runSimulation({
          campaign: ec.campaign,
          n_personas: 800,
          n_simulations: 5000,
        });

        results.push({
          id: ec.id,
          label: ec.label,
          platform: ec.campaign.target_platform,
          creative: ec.campaign.creative_type,
          ctr: res.expected.ctr_mean,
          roi: res.expected.roi_mean,
          conversions: res.expected.avg_conversions,
          spend: res.expected.avg_spend,
          full: res,
        });
      }

      results.sort((a, b) => b.roi - a.roi);
      setArms(results);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const bestArm = arms[0];
  const chartData = arms.map((a) => ({
    name: a.label.split(" — ")[0],
    roi: Number(a.roi.toFixed(3)),
    ctr: Number((a.ctr * 100).toFixed(3)),
  }));

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
        title="Optimization Insights"
        subtitle="Run all example campaigns head-to-head to find the best-performing ad creative, platform, and audience combination."
        right={
          <Button onClick={handleRunAll} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading
              ? `Simulating ${progress}/${exampleCampaigns.length}…`
              : "Compare All Campaigns"}
          </Button>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {!arms.length && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-fg))]">
              Click &ldquo;Compare All Campaigns&rdquo; to run Monte Carlo simulations for
              all {exampleCampaigns.length} example ad creatives. Each campaign is simulated
              with 800 synthetic personas × 5,000 iterations. The system then ranks them by
              predicted ROI to identify the best-performing creative, platform, and audience
              combination — like a multi-armed bandit but exhaustive.
            </p>
          </CardContent>
        </Card>
      )}

      {arms.length > 0 && (
        <>
          {/* Winner card */}
          {bestArm && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle>Best Performing Campaign</CardTitle>
                  <div className="text-sm text-[hsl(var(--muted-fg))]">
                    Highest predicted ROI across all {arms.length} variants.
                  </div>
                </div>
                <Badge tone="good">Winner</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-lg font-semibold">{bestArm.label}</div>
                    <div className="mt-1 flex gap-2">
                      <Badge tone="accent">{bestArm.platform}</Badge>
                      <Badge tone="neutral">{bestArm.creative}</Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-semibold tracking-tight">{bestArm.roi.toFixed(2)}x ROI</div>
                    <div className="text-sm text-[hsl(var(--muted-fg))]">
                      CTR {(bestArm.ctr * 100).toFixed(2)}% · {bestArm.conversions.toFixed(1)} avg conversions
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Ranking table */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Rankings</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                All {arms.length} campaigns ranked by simulated ROI. Each row shows how synthetic personas interacted with that ad.
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {arms.map((arm, idx) => (
                <div
                  key={arm.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    idx === 0
                      ? "border-[hsl(var(--accent)/0.5)] bg-[hsl(var(--accent)/0.08)]"
                      : "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-8 w-8 place-items-center rounded-xl bg-[hsl(var(--muted)/0.8)] text-xs font-bold">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{arm.label}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge tone="accent">{arm.platform}</Badge>
                          <Badge tone="neutral">{arm.creative}</Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{arm.roi.toFixed(2)}x</div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">
                        CTR {(arm.ctr * 100).toFixed(2)}% · {arm.conversions.toFixed(1)} conv · ${arm.spend.toFixed(0)} spend
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Charts */}
          {mounted && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <ChartShell
                title="ROI by Campaign"
                description="Predicted ROI from Monte Carlo simulation for each ad creative."
                right={<Badge tone="good">Live</Badge>}
              >
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
                      <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}x`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}x`, "ROI"]} />
                      <Bar dataKey="roi" radius={[10, 10, 6, 6]}>
                        {chartData.map((_, i) => (
                          <Cell key={i} fill={i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted)/0.8)"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>

              <ChartShell
                title="CTR by Campaign"
                description="Click-through rate — how many personas clicked each ad."
                right={<Badge tone="accent">800 personas</Badge>}
              >
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
                      <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}%`, "CTR"]} />
                      <Bar dataKey="ctr" radius={[10, 10, 6, 6]} fill="hsl(var(--accent-2))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>
            </div>
          )}

          <Card>
            <CardHeader><CardTitle>How optimization works</CardTitle></CardHeader>
            <CardContent className="text-sm text-[hsl(var(--muted-fg))] space-y-2">
              <p>
                Each of the {arms.length} example campaigns is run through the same Monte Carlo engine:
                800 synthetic personas × 5,000 iterations. Personas with matching interests, platform
                preferences, and high attention spans have higher click probability; personas with
                strong purchase intent and higher income are more likely to convert.
              </p>
              <p>
                The system ranks campaigns by average ROI across all iterations. The winner is the
                campaign where synthetic personas consistently clicked, converted, and generated revenue
                relative to spend — analogous to a multi-armed bandit selecting the best arm.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
