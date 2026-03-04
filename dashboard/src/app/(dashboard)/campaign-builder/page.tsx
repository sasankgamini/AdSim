"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Wand2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { type Platform, personas, platforms } from "@/lib/demo-data";

export default function CampaignBuilderPage() {
  const router = useRouter();
  const [name, setName] = React.useState("Spring Launch — AI Writing Tool");
  const [objective, setObjective] = React.useState("Conversions");
  const [platform, setPlatform] = React.useState<Platform>("Meta");
  const [personaId, setPersonaId] = React.useState(personas[0]?.id ?? "p1");
  const [budget, setBudget] = React.useState(12000);
  const selectedPersona = personas.find((p) => p.id === personaId) ?? personas[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Builder"
        subtitle="Draft a campaign spec and run fast simulations across personas and platforms."
        right={
          <Button onClick={() => router.push("/simulation-results")}>
            <Sparkles size={16} />
            Run Simulation
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Campaign spec</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                Structured inputs that the simulator can sample.
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setName("Notion-style landing refresh");
                setObjective("Signups");
                setPlatform("Google");
                setPersonaId("p1");
                setBudget(18000);
              }}
            >
              <Wand2 size={16} />
              Autofill
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Campaign name
                </div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Objective
                </div>
                <Select value={objective} onChange={(e) => setObjective(e.target.value)}>
                  <option>Conversions</option>
                  <option>Signups</option>
                  <option>Leads</option>
                  <option>Awareness</option>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Platform
                </div>
                <Select
                  value={platform}
                  onChange={(e) => {
                    const v = e.target.value as Platform;
                    if (platforms.includes(v)) setPlatform(v);
                  }}
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Primary persona
                </div>
                <Select value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
                  {personas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {p.segment}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Weekly budget
                </div>
                <div className="text-sm font-medium">${budget.toLocaleString()}</div>
              </div>
              <input
                className="w-full accent-[hsl(var(--accent))]"
                type="range"
                min={2000}
                max={50000}
                step={500}
                value={budget}
                onChange={(e) => setBudget(Number(e.target.value))}
              />
              <div className="flex gap-2">
                <Badge tone="accent">AI creative</Badge>
                <Badge tone="neutral">Auto-bidding</Badge>
                <Badge tone="neutral">Holdout 5%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Live preview</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              What the simulator will assume.
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs text-[hsl(var(--muted-fg))]">Summary</div>
              <div className="text-sm font-medium">{name}</div>
              <div className="text-xs text-[hsl(var(--muted-fg))]">
                {objective} on {platform} · ${budget.toLocaleString()}/wk
              </div>
            </div>
            <div className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{selectedPersona?.name}</div>
                <Badge tone={selectedPersona?.intent === "High" ? "good" : "neutral"}>
                  {selectedPersona?.intent ?? "—"} intent
                </Badge>
              </div>
              <div className="mt-2 text-sm text-[hsl(var(--muted-fg))]">
                {selectedPersona?.tagline}
              </div>
              <div className="mt-3 space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                  Channel affinity
                </div>
                <div className="space-y-2">
                  {selectedPersona?.channels.map((c) => (
                    <div key={c.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[hsl(var(--muted-fg))]">{c.name}</span>
                        <span className="font-medium">
                          {Math.round(c.affinity * 100)}%
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[hsl(var(--muted)/0.9)]">
                        <div
                          className="h-full rounded-full bg-[hsl(var(--accent))]"
                          style={{ width: `${Math.round(c.affinity * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button className="w-full" onClick={() => router.push("/simulation-results")}>
              <Sparkles size={16} />
              Simulate now
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

