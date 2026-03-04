"use client";

import * as React from "react";
import { FlaskConical, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/charts/chart-shell";
import { OptimizationImpactChart } from "@/components/charts/optimization-impact";
import { cn } from "@/lib/utils";

const suggestions = [
  {
    title: "Shift creative toward ROI-first proof",
    detail:
      "Your highest-intent personas over-index on clarity and outcomes. Use a 3-step story: pain → quantified win → CTA.",
    impact: "High",
    effort: "Low",
  },
  {
    title: "Improve landing performance (LCP < 2.2s)",
    detail:
      "Simulations predict a measurable CVR uplift when load latency drops. Compress above-the-fold media and defer analytics.",
    impact: "Medium",
    effort: "Medium",
  },
  {
    title: "Reduce frequency after day 4",
    detail:
      "Engagement heatmaps show diminishing returns after repeated impressions. Cap frequency and diversify hooks.",
    impact: "Medium",
    effort: "Low",
  },
];

export default function OptimizationInsightsPage() {
  const [whatIf, setWhatIf] = React.useState({
    creativePlus: true,
    fasterLanding: false,
    lookalike: true,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Optimization Insights"
        subtitle="AI-suggested levers, predicted lift, and quick what-if toggles."
        right={
          <Button>
            <Sparkles size={16} />
            Generate insights
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Recommended levers</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                Ranked by predicted lift and confidence.
              </div>
            </div>
            <Badge tone="neutral">
              <FlaskConical size={14} />
              Experimental
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4 transition-all hover:-translate-y-px hover:border-[hsl(var(--border))]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{s.title}</div>
                    <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                      {s.detail}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge tone={s.impact === "High" ? "good" : "accent"}>
                      {s.impact} impact
                    </Badge>
                    <Badge tone="neutral">{s.effort} effort</Badge>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What-if toggles</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              See how assumptions move projections.
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: "creativePlus", label: "Creative+", hint: "Higher hook diversity" },
              { key: "fasterLanding", label: "Faster landing", hint: "LCP under 2.2s" },
              { key: "lookalike", label: "Lookalike audience", hint: "Top 1% similarity" },
            ].map((t) => {
              const k = t.key as keyof typeof whatIf;
              const on = whatIf[k];
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setWhatIf((w) => ({ ...w, [k]: !w[k] }))}
                  className={cn(
                    "focus-ring w-full rounded-2xl border p-4 text-left transition-all",
                    "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] hover:-translate-y-px hover:border-[hsl(var(--border))]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-sm text-[hsl(var(--muted-fg))]">
                        {t.hint}
                      </div>
                    </div>
                    <Badge tone={on ? "good" : "neutral"}>{on ? "On" : "Off"}</Badge>
                  </div>
                </button>
              );
            })}
            <div className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                Projected blended ROI
              </div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">2.21x</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                based on enabled toggles
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChartShell
        title="Optimization impact"
        description="Estimated ROI lift from top levers (normalized)."
        right={<Badge tone="accent">Model v0.3</Badge>}
      >
        <OptimizationImpactChart />
      </ChartShell>
    </div>
  );
}

