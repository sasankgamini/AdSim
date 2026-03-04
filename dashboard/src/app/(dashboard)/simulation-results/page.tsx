"use client";

import * as React from "react";
import { TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/charts/chart-shell";
import { CtrDistributionChart } from "@/components/charts/ctr-distribution";
import { RoiPredictionsChart } from "@/components/charts/roi-predictions";
import { PlatformComparisonChart } from "@/components/charts/platform-comparison";
import { Select } from "@/components/ui/select";
import { type Platform, platforms } from "@/lib/demo-data";

export default function SimulationResultsPage() {
  const [scenario, setScenario] = React.useState("Base");
  const [platform, setPlatform] = React.useState<Platform | "All">("All");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Simulation Results"
        subtitle="Compare scenarios, inspect distributions, and validate predicted ROI before spend."
        right={
          <div className="flex items-center gap-2">
            <Select
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="w-[140px]"
            >
              <option>Base</option>
              <option>Creative+</option>
              <option>Budget ramp</option>
            </Select>
            <Select
              value={platform}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "All") setPlatform("All");
                else if (platforms.includes(v as Platform)) setPlatform(v as Platform);
              }}
              className="w-[140px]"
            >
              <option value="All">All</option>
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
            <Button variant="secondary">
              <TrendingUp size={16} />
              Export
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Expected CTR</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              Median across 1k sims
            </div>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-semibold tracking-tight">1.74%</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                +0.18% vs last run
              </div>
            </div>
            <Badge tone="good">Stable</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Predicted ROI</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              90% credible interval
            </div>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-semibold tracking-tight">2.08x</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                1.62x — 2.44x
              </div>
            </div>
            <Badge tone="accent">High upside</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Risk</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              Underperform probability
            </div>
          </CardHeader>
          <CardContent className="flex items-end justify-between gap-3">
            <div>
              <div className="text-3xl font-semibold tracking-tight">12%</div>
              <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">
                defined as ROI &lt; 1.0x
              </div>
            </div>
            <Badge tone="good">Low</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartShell
          title="CTR distribution"
          description="A quick read on creative-market fit and variance."
          right={<Badge tone="neutral">1,000 runs</Badge>}
        >
          <CtrDistributionChart />
        </ChartShell>
        <ChartShell
          title="ROI predictions"
          description="Forecasted ROI with confidence band over 12 weeks."
          right={<Badge tone="accent">{scenario}</Badge>}
        >
          <RoiPredictionsChart />
        </ChartShell>
        <div className="lg:col-span-2">
          <ChartShell
            title="Platform comparison"
            description="How key metrics move across platforms for this scenario."
            right={
              <Badge tone="neutral">
                {platform === "All" ? "All platforms" : platform}
              </Badge>
            }
          >
            <PlatformComparisonChart />
          </ChartShell>
        </div>
      </div>
    </div>
  );
}

