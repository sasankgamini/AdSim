"use client";

import * as React from "react";
import { Loader2, Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartShell } from "@/components/charts/chart-shell";
import { Input } from "@/components/ui/input";
import { type Persona, generatePersonas } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--accent-2))",
  "hsl(224 85% 55%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
  "hsl(280 60% 55%)",
];

function groupBy<T>(items: T[], key: (item: T) => string) {
  const map: Record<string, number> = {};
  for (const item of items) {
    const k = key(item);
    map[k] = (map[k] ?? 0) + 1;
  }
  return Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function interestFrequency(personas: Persona[]) {
  const counts: Record<string, number> = {};
  for (const p of personas) {
    for (const i of p.interests) {
      counts[i] = (counts[i] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([interest, count]) => ({ interest, count }))
    .sort((a, b) => b.count - a.count);
}

export default function PersonaExplorerPage() {
  const mounted = useMounted();
  const [personas, setPersonas] = React.useState<Persona[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [nPersonas, setNPersonas] = React.useState(500);
  const [activeIdx, setActiveIdx] = React.useState(0);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const p = await generatePersonas(nPersonas);
      setPersonas(p);
      setActiveIdx(0);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  const platformData = groupBy(personas, (p) => p.platform);
  const deviceData = groupBy(personas, (p) => p.device);
  const regionData = groupBy(personas, (p) => p.location_region);
  const interestData = interestFrequency(personas);
  const active = personas[activeIdx];

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
        title="Persona Explorer"
        subtitle="Generate synthetic personas with realistic demographic and behavioral distributions, then explore them."
        right={
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={nPersonas}
              onChange={(e) => setNPersonas(Number(e.target.value) || 500)}
              className="w-24"
            />
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Users size={16} />}
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        }
      />

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {!personas.length && !error && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-fg))]">
              Click &ldquo;Generate&rdquo; to create {nPersonas.toLocaleString()} synthetic personas.
              Each persona has age, gender, income, interests, platform preference, device,
              region, purchase intent, ad fatigue, and attention span — sampled from realistic
              demographic distributions. These are the same personas used in Monte Carlo simulations.
            </p>
          </CardContent>
        </Card>
      )}

      {personas.length > 0 && (
        <>
          {/* Distribution charts */}
          {mounted && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ChartShell
                title="Platform Preference"
                description={`Distribution across ${personas.length} personas`}
                right={<Badge tone="good">Live</Badge>}
              >
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {platformData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>

              <ChartShell
                title="Interest Frequency"
                description="How many personas have each interest tag"
                right={<Badge tone="neutral">{interestData.length} tags</Badge>}
              >
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={interestData} layout="vertical" margin={{ top: 4, right: 10, bottom: 4, left: 10 }}>
                      <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="interest" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} personas`, "Count"]} />
                      <Bar dataKey="count" fill="hsl(var(--accent))" radius={[6, 6, 6, 6]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartShell>
            </div>
          )}

          {/* Persona list + detail */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Personas ({personas.length})</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  Scroll and click to inspect individual personas.
                </div>
              </CardHeader>
              <CardContent className="max-h-[420px] space-y-2 overflow-auto">
                {personas.slice(0, 50).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveIdx(idx)}
                    className={cn(
                      "focus-ring w-full rounded-2xl border px-4 py-3 text-left transition-all",
                      idx === activeIdx
                        ? "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.55)]"
                        : "border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.35)] hover:-translate-y-px",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {p.age}y · {p.gender} · {p.platform}
                      </span>
                      <Badge tone={p.purchase_intent > 0.5 ? "good" : "neutral"}>
                        PI {(p.purchase_intent * 100).toFixed(0)}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-fg))]">
                      ${Math.round(p.income).toLocaleString()} · {p.device} · {p.location_region} · {p.interests.join(", ")}
                    </div>
                  </button>
                ))}
                {personas.length > 50 && (
                  <div className="py-2 text-center text-xs text-[hsl(var(--muted-fg))]">
                    Showing 50 of {personas.length} — all {personas.length} are used in simulations.
                  </div>
                )}
              </CardContent>
            </Card>

            {active && (
              <Card>
                <CardHeader>
                  <CardTitle>Persona Detail</CardTitle>
                  <div className="text-sm text-[hsl(var(--muted-fg))]">
                    This persona&apos;s attributes determine how they respond to ads in the Monte Carlo simulation.
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                    <Stat label="Age" value={`${active.age}`} />
                    <Stat label="Gender" value={active.gender} />
                    <Stat label="Income" value={`$${Math.round(active.income).toLocaleString()}`} />
                    <Stat label="Platform" value={active.platform} />
                    <Stat label="Device" value={active.device} />
                    <Stat label="Region" value={active.location_region} />
                    <Stat label="Purchase Intent" value={`${(active.purchase_intent * 100).toFixed(0)}%`} />
                    <Stat label="Ad Fatigue" value={`${(active.ad_fatigue * 100).toFixed(0)}%`} />
                    <Stat label="Attention Span" value={`${(active.attention_span * 100).toFixed(0)}%`} />
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Interests</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {active.interests.map((i) => (
                        <Badge key={i} tone="accent">{i}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
                    <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">How this persona interacts with ads</div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-fg))]">
                      When this persona sees an ad in a simulation iteration, their click probability is computed
                      from base CTR + interest overlap ({"+" + active.interests.join(", ")}) + platform match
                      ({active.platform}) + attention boost ({(active.attention_span * 100).toFixed(0)}%)
                      − fatigue penalty ({(active.ad_fatigue * 100).toFixed(0)}%).
                      If they click, conversion probability uses purchase intent ({(active.purchase_intent * 100).toFixed(0)}%)
                      and income (${Math.round(active.income).toLocaleString()}).
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
      <div className="text-xs text-[hsl(var(--muted-fg))]">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}
