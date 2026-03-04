"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/charts/chart-shell";
import { PersonaEngagementHeatmap } from "@/components/persona/engagement-heatmap";
import { personas } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

export default function PersonaExplorerPage() {
  const [activeId, setActiveId] = React.useState(personas[0]?.id ?? "p1");
  const active = personas.find((p) => p.id === activeId) ?? personas[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Persona Explorer"
        subtitle="Understand how simulated personas engage by time, message angle, and channel."
        right={
          <Button variant="secondary">
            <Users size={16} />
            Add persona
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Personas</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              Select a persona to explore.
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {personas.map((p) => {
              const selected = p.id === activeId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "focus-ring w-full rounded-2xl border p-4 text-left transition-all",
                    selected
                      ? "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.55)] shadow-[0_18px_40px_hsl(var(--shadow)/0.18)]"
                      : "border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.35)] hover:-translate-y-px hover:border-[hsl(var(--border))]",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">
                        {p.segment}
                      </div>
                    </div>
                    <Badge tone={p.intent === "High" ? "good" : "neutral"}>
                      {p.intent} intent
                    </Badge>
                  </div>
                  <div className="mt-2 text-sm text-[hsl(var(--muted-fg))]">
                    {p.tagline}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>{active?.name}</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  {active?.tagline}
                </div>
              </div>
              <div className="flex gap-2">
                <Badge tone="accent">{active?.segment}</Badge>
                <Badge tone={active?.intent === "High" ? "good" : "neutral"}>
                  {active?.intent ?? "—"} intent
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Primary channels
                </div>
                <div className="mt-3 space-y-2">
                  {active?.channels.map((c) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[hsl(var(--muted-fg))]">{c.name}</span>
                        <span className="font-medium">
                          {Math.round(c.affinity * 100)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted)/0.9)]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent-2))]"
                          style={{ width: `${Math.round(c.affinity * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Message angles that convert
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="neutral">Clear ROI</Badge>
                  <Badge tone="neutral">Social proof</Badge>
                  <Badge tone="neutral">Speed</Badge>
                  <Badge tone="neutral">Security</Badge>
                  <Badge tone="neutral">Templates</Badge>
                </div>
                <div className="mt-3 text-sm text-[hsl(var(--muted-fg))]">
                  These tags are derived from historic calibration distributions and
                  similar-campaign embeddings.
                </div>
              </div>
            </CardContent>
          </Card>

          <ChartShell
            title="Persona engagement heatmap"
            description="Engagement intensity by day and time slot (normalized)."
            right={<Badge tone="neutral">Interactive</Badge>}
          >
            <PersonaEngagementHeatmap />
          </ChartShell>
        </div>
      </div>
    </div>
  );
}

