"use client";

import * as React from "react";
import {
  Search,
  BrainCircuit,
  Sparkles,
  Loader2,
  ChevronRight,
  BarChart3,
  Users,
  Zap,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartShell } from "@/components/charts/chart-shell";
import {
  type CampaignPayload,
  type SimulationResult,
  type DiscoveryResult,
  type DiscoveryRanking,
  type CreativeResponse,
  type CreativeVariant,
  runDiscovery,
  runSimulation,
  generateCreative,
  histogramToBuckets,
} from "@/lib/api";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

const INTEREST_OPTIONS = [
  "fitness", "gaming", "finance", "travel", "beauty",
  "startups", "parenting", "education", "sports", "food",
];

const tooltipStyle: React.CSSProperties = {
  background: "hsl(var(--card)/0.85)",
  border: "1px solid hsl(var(--border)/0.7)",
  borderRadius: 12,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  color: "hsl(var(--card-fg))",
};

export default function CampaignBuilderPage() {
  const mounted = useMounted();

  // Step 1: Product input
  const [productName, setProductName] = React.useState("");
  const [productDesc, setProductDesc] = React.useState("");
  const [budget, setBudget] = React.useState(5000);
  const [interests, setInterests] = React.useState<string[]>([]);
  const [ageMin, setAgeMin] = React.useState(18);
  const [ageMax, setAgeMax] = React.useState(65);
  const [nPersonas, setNPersonas] = React.useState(1000);

  // Step 2: Discovery
  const [discovering, setDiscovering] = React.useState(false);
  const [discoveryError, setDiscoveryError] = React.useState<string | null>(null);
  const [discovery, setDiscovery] = React.useState<DiscoveryResult | null>(null);
  const [selectedRank, setSelectedRank] = React.useState<DiscoveryRanking | null>(null);

  // Step 3: Creative generation
  const [tone, setTone] = React.useState("professional");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiError, setAiError] = React.useState<string | null>(null);
  const [aiResult, setAiResult] = React.useState<CreativeResponse | null>(null);
  const [chosenVariant, setChosenVariant] = React.useState<CreativeVariant | null>(null);

  // Step 4: Full simulation
  const [simLoading, setSimLoading] = React.useState(false);
  const [simError, setSimError] = React.useState<string | null>(null);
  const [simResult, setSimResult] = React.useState<SimulationResult | null>(null);

  // Derived state
  const canDiscover = productName.trim().length > 0;
  const currentStep =
    simResult ? 4
    : chosenVariant ? 4
    : aiResult ? 3
    : discovery ? 2
    : 1;

  // ── Step 2: Run Discovery ──
  async function handleDiscover() {
    setDiscovering(true);
    setDiscoveryError(null);
    setDiscovery(null);
    setSelectedRank(null);
    setAiResult(null);
    setChosenVariant(null);
    setSimResult(null);

    try {
      const res = await runDiscovery({
        product_name: productName,
        product_description: productDesc,
        budget,
        target_interests: interests,
        target_age_min: ageMin,
        target_age_max: ageMax,
        n_personas: nPersonas,
        sims_per_combo: 3000,
      });
      setDiscovery(res);
      if (res.best) setSelectedRank(res.best);
    } catch (err: unknown) {
      setDiscoveryError(err instanceof Error ? err.message : "Discovery failed. Is the backend running on localhost:8000?");
    } finally {
      setDiscovering(false);
    }
  }

  // ── Step 3: Generate creatives for the selected winning combo ──
  async function handleGenerateCreatives() {
    if (!selectedRank) return;
    setAiLoading(true);
    setAiError(null);
    setAiResult(null);
    setChosenVariant(null);
    setSimResult(null);

    try {
      const res = await generateCreative({
        product_name: productName,
        product_description: productDesc,
        objective: "sales",
        target_platform: selectedRank.platform,
        creative_type: selectedRank.creative_type,
        target_interests: interests,
        budget,
        tone,
        n_variants: 3,
      });
      setAiResult(res);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Creative generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  // ── Step 4: Run full simulation with chosen creative ──
  async function handleFullSimulation() {
    if (!selectedRank || !chosenVariant) return;
    setSimLoading(true);
    setSimError(null);

    const campaign: CampaignPayload = {
      name: `${productName} — ${selectedRank.platform} ${selectedRank.creative_type}`,
      objective: "sales",
      target_platform: selectedRank.platform as CampaignPayload["target_platform"],
      creative_type: selectedRank.creative_type as CampaignPayload["creative_type"],
      budget,
      ad_copy: chosenVariant.ad_copy,
      creative_description: chosenVariant.creative_description,
      target_interests: interests,
      target_age_min: ageMin,
      target_age_max: ageMax,
    };

    try {
      const res = await runSimulation({
        campaign,
        n_personas: nPersonas,
        n_simulations: 10000,
      });
      setSimResult(res);
    } catch (err: unknown) {
      setSimError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimLoading(false);
    }
  }

  function toggleInterest(tag: string) {
    setInterests((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Builder"
        subtitle="Describe your product, discover what works through simulation, then generate AI-powered creatives for the winning combination."
      />

      {/* ── STEP 1: Product Input ── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <StepBadge n={1} active={currentStep === 1} done={currentStep > 1} />
            <div>
              <CardTitle>Describe Your Product</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                The simulation engine will generate {nPersonas.toLocaleString()} synthetic consumers and test how they respond to your product across every platform and creative format.
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Product / brand name *</div>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. FitTrack Pro"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Budget ($)</div>
              <Input type="number" value={budget} onChange={(e) => setBudget(Number(e.target.value) || 5000)} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">What does it do?</div>
            <textarea
              className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm"
              rows={2}
              value={productDesc}
              onChange={(e) => setProductDesc(e.target.value)}
              placeholder="AI-powered fitness app with personalized 10-minute workouts and nutrition tracking"
            />
          </div>

          <div className="space-y-2">
            <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Target interests (click to select)</div>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleInterest(tag)}
                  className={cn(
                    "rounded-xl border px-3 py-1.5 text-xs font-medium transition-all",
                    interests.includes(tag)
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.15)] text-[hsl(var(--accent))]"
                      : "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] text-[hsl(var(--muted-fg))] hover:border-[hsl(var(--border))]",
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Min age</div>
              <Input type="number" value={ageMin} onChange={(e) => setAgeMin(Number(e.target.value) || 18)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Max age</div>
              <Input type="number" value={ageMax} onChange={(e) => setAgeMax(Number(e.target.value) || 65)} />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Synthetic personas</div>
              <Input type="number" value={nPersonas} onChange={(e) => setNPersonas(Number(e.target.value) || 1000)} />
            </div>
          </div>

          <Button onClick={handleDiscover} disabled={!canDiscover || discovering} className="w-full">
            {discovering ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {discovering
              ? `Testing 12 platform × creative combinations across ${nPersonas.toLocaleString()} personas…`
              : "Discover What Works"}
          </Button>

          {discoveryError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{discoveryError}</div>
          )}
        </CardContent>
      </Card>

      {/* ── STEP 2: Discovery Results ── */}
      {discovery && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepBadge n={2} active={currentStep === 2} done={currentStep > 2} />
              <div>
                <CardTitle>Discovery Results</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  Tested {discovery.combinations_tested} combinations × {discovery.sims_per_combo.toLocaleString()} Monte Carlo iterations × {discovery.n_personas.toLocaleString()} personas = {(discovery.total_simulations * discovery.n_personas).toLocaleString()} simulated ad interactions.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Rankings */}
            <div className="space-y-3">
              {discovery.rankings.map((r) => (
                <button
                  key={`${r.platform}-${r.creative_type}`}
                  type="button"
                  onClick={() => setSelectedRank(r)}
                  className={cn(
                    "focus-ring w-full rounded-2xl border p-4 text-left transition-all",
                    selectedRank?.platform === r.platform && selectedRank?.creative_type === r.creative_type
                      ? "border-[hsl(var(--accent)/0.6)] bg-[hsl(var(--accent)/0.08)] shadow-[0_12px_30px_hsl(var(--shadow)/0.12)]"
                      : "border-[hsl(var(--border)/0.5)] bg-[hsl(var(--card)/0.3)] hover:-translate-y-px hover:border-[hsl(var(--border))]",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "grid h-8 w-8 place-items-center rounded-xl text-xs font-bold",
                        r.rank === 1 ? "bg-[hsl(var(--accent))] text-white" : "bg-[hsl(var(--muted)/0.8)]",
                      )}>
                        #{r.rank}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{r.platform} — {r.creative_type.charAt(0).toUpperCase() + r.creative_type.slice(1)}</div>
                        <div className="mt-0.5 text-xs text-[hsl(var(--muted-fg))]">
                          {r.avg_clicks.toFixed(0)} avg clicks · {r.avg_conversions.toFixed(1)} avg conversions · ${r.avg_spend.toFixed(0)} spend
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">{r.roi_mean.toFixed(2)}x <span className="text-xs font-normal text-[hsl(var(--muted-fg))]">ROI</span></div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">CTR {(r.ctr_mean * 100).toFixed(2)}%</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Charts */}
            {mounted && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartShell
                  title="ROI by Combination"
                  description="Predicted return on ad spend from Monte Carlo simulation."
                  right={<Badge tone="good">Live</Badge>}
                >
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={discovery.rankings.map((r) => ({
                          name: `${r.platform}\n${r.creative_type}`,
                          roi: Number(r.roi_mean.toFixed(3)),
                        }))}
                        margin={{ top: 8, right: 10, bottom: 8, left: -8 }}
                      >
                        <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}x`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0}x`, "ROI"]} />
                        <Bar dataKey="roi" radius={[8, 8, 4, 4]}>
                          {discovery.rankings.map((r, i) => (
                            <Cell key={i} fill={i === 0 ? "hsl(var(--accent))" : "hsl(var(--muted)/0.7)"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartShell>

                <ChartShell
                  title="CTR by Combination"
                  description="Click-through rate — how many synthetic personas clicked."
                  right={<Badge tone="accent">{discovery.n_personas} personas</Badge>}
                >
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={discovery.rankings.map((r) => ({
                          name: `${r.platform}\n${r.creative_type}`,
                          ctr: Number((r.ctr_mean * 100).toFixed(3)),
                        }))}
                        margin={{ top: 8, right: 10, bottom: 8, left: -8 }}
                      >
                        <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
                        <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={50} />
                        <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0}%`, "CTR"]} />
                        <Bar dataKey="ctr" radius={[8, 8, 4, 4]} fill="hsl(var(--accent-2))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartShell>
              </div>
            )}

            {/* Persona insights */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <InsightCard icon={<Users size={16} />} title="Persona Population" items={[
                `${discovery.n_personas.toLocaleString()} synthetic consumers generated`,
                `Avg purchase intent: ${(discovery.persona_summary.avg_purchase_intent * 100).toFixed(0)}%`,
                `Avg ad fatigue: ${(discovery.persona_summary.avg_ad_fatigue * 100).toFixed(0)}%`,
                `Avg attention span: ${(discovery.persona_summary.avg_attention_span * 100).toFixed(0)}%`,
              ]} />
              <InsightCard icon={<BarChart3 size={16} />} title="Interest Distribution" items={
                Object.entries(discovery.persona_summary.interest_distribution).slice(0, 5).map(
                  ([k, v]) => `${k}: ${v} personas (${((v / discovery.n_personas) * 100).toFixed(0)}%)`,
                )
              } />
              <InsightCard icon={<Zap size={16} />} title="Platform Preferences" items={
                Object.entries(discovery.persona_summary.platform_distribution).map(
                  ([k, v]) => `${k}: ${v} personas (${((v / discovery.n_personas) * 100).toFixed(0)}%)`,
                )
              } />
            </div>

            {/* Generate creatives CTA */}
            {selectedRank && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="space-y-2 sm:flex sm:items-center sm:gap-3 sm:space-y-0">
                  <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                    <option value="professional">Professional tone</option>
                    <option value="playful">Playful tone</option>
                    <option value="urgent">Urgent tone</option>
                    <option value="minimal">Minimal tone</option>
                    <option value="bold">Bold tone</option>
                  </Select>
                  <Button onClick={handleGenerateCreatives} disabled={aiLoading}>
                    {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
                    {aiLoading
                      ? "Generating creatives with Gemini…"
                      : `Generate Creatives for #${selectedRank.rank}: ${selectedRank.platform} ${selectedRank.creative_type}`}
                  </Button>
                </div>
              </div>
            )}

            {aiError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{aiError}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 3: AI-Generated Creatives ── */}
      {aiResult && selectedRank && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepBadge n={3} active={currentStep === 3} done={currentStep > 3} />
              <div>
                <CardTitle>AI-Generated Creatives</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  Optimized for {selectedRank.platform} {selectedRank.creative_type} — the combination that scored {selectedRank.roi_mean.toFixed(2)}x ROI with your persona population.
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiResult.strategy_notes && (
              <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Strategy Notes</div>
                <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">{aiResult.strategy_notes}</div>
              </div>
            )}

            <div className="space-y-3">
              {aiResult.variants.map((v, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-2xl border p-4 transition-all",
                    chosenVariant === v
                      ? "border-[hsl(var(--accent)/0.6)] bg-[hsl(var(--accent)/0.08)]"
                      : "border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] hover:-translate-y-px hover:border-[hsl(var(--border))]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">{v.variant_name}</div>
                      <div className="text-sm font-medium text-[hsl(var(--fg))]">&ldquo;{v.headline}&rdquo;</div>
                      <div className="text-sm text-[hsl(var(--muted-fg))]">{v.ad_copy}</div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">
                        <span className="font-medium">Visual:</span> {v.creative_description}
                      </div>
                      <div className="text-xs text-[hsl(var(--muted-fg))]">
                        <span className="font-medium">Why it works:</span> {v.rationale}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone="accent">CTA: {v.cta}</Badge>
                      <Button
                        size="sm"
                        variant={chosenVariant === v ? "primary" : "secondary"}
                        onClick={() => setChosenVariant(v)}
                      >
                        {chosenVariant === v ? "Selected" : "Use this"}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {chosenVariant && (
              <Button onClick={handleFullSimulation} disabled={simLoading} className="w-full">
                {simLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {simLoading
                  ? `Running 10,000 simulations × ${nPersonas.toLocaleString()} personas with selected creative…`
                  : `Run Full Simulation (10,000 × ${nPersonas.toLocaleString()} personas)`}
              </Button>
            )}

            {simError && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{simError}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── STEP 4: Full Simulation Results ── */}
      {simResult && selectedRank && chosenVariant && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <StepBadge n={4} active={currentStep === 4} done={false} />
              <div>
                <CardTitle>Detailed Simulation Results</CardTitle>
                <div className="text-sm text-[hsl(var(--muted-fg))]">
                  {simResult.meta.n_simulations.toLocaleString()} Monte Carlo iterations × {simResult.meta.n_personas.toLocaleString()} personas — {selectedRank.platform} {selectedRank.creative_type}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <MetricCard label="CTR" value={`${(simResult.expected.ctr_mean * 100).toFixed(2)}%`} detail={`95% CI: ${(simResult.distributions.ctr.summary.ci_low * 100).toFixed(2)}% – ${(simResult.distributions.ctr.summary.ci_high * 100).toFixed(2)}%`} />
              <MetricCard label="ROI" value={`${simResult.expected.roi_mean.toFixed(2)}x`} detail={`95% CI: ${simResult.distributions.roi.summary.ci_low.toFixed(2)}x – ${simResult.distributions.roi.summary.ci_high.toFixed(2)}x`} />
              <MetricCard label="CVR" value={`${(simResult.expected.conversion_rate_mean * 100).toFixed(2)}%`} detail={`${simResult.expected.avg_conversions.toFixed(1)} avg conversions`} />
              <MetricCard label="Avg Clicks" value={simResult.expected.avg_clicks.toFixed(0)} detail={`of ${simResult.meta.impressions_per_sim} impressions`} />
              <MetricCard label="Avg Spend" value={`$${simResult.expected.avg_spend.toFixed(0)}`} detail={`CPC $${simResult.meta.cpc.toFixed(2)}`} />
              <MetricCard label="Avg Revenue" value={`$${simResult.expected.avg_revenue.toFixed(0)}`} detail={`${simResult.expected.roi_mean > 1 ? "Profitable" : "Below break-even"}`} />
            </div>

            {mounted && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <ChartShell title="CTR Distribution" description="Click-through rate across all Monte Carlo iterations." right={<Badge tone="good">Live</Badge>}>
                  <DistributionChart
                    data={histogramToBuckets(simResult.distributions.ctr.histogram, (v) => `${(v * 100).toFixed(2)}%`)}
                    color="hsl(var(--accent))"
                  />
                </ChartShell>
                <ChartShell title="ROI Distribution" description="Return on investment spread across iterations." right={<Badge tone="accent">{simResult.meta.n_simulations.toLocaleString()} sims</Badge>}>
                  <DistributionChart
                    data={histogramToBuckets(simResult.distributions.roi.histogram, (v) => `${v.toFixed(2)}x`)}
                    color="hsl(var(--accent-2))"
                  />
                </ChartShell>
              </div>
            )}

            <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">How this simulation works</div>
              <div className="mt-2 space-y-1.5 text-xs text-[hsl(var(--muted-fg))]">
                <p>{simResult.meta.n_personas} synthetic consumers were generated with statistically distributed demographics (age, income, gender, region, device) and behavioral traits (purchase intent, ad fatigue, attention span, interests, platform preference).</p>
                <p>For each of {simResult.meta.n_simulations.toLocaleString()} iterations, every persona sees your ad. Click probability = base CTR + interest overlap + platform match + creative type factor + attention boost − fatigue penalty. Conversion probability depends on purchase intent, interest match, and fatigue.</p>
                <p>Budget caps clicks at {simResult.meta.max_clicks_by_budget} (${simResult.meta.budget} ÷ ${simResult.meta.cpc.toFixed(2)} CPC). The distributions above show uncertainty before spending real money.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StepBadge({ n, active, done }: { n: number; active: boolean; done: boolean }) {
  return (
    <div className={cn(
      "grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold transition-colors",
      done
        ? "bg-[hsl(var(--accent))] text-white"
        : active
          ? "bg-[hsl(var(--accent)/0.2)] text-[hsl(var(--accent))]"
          : "bg-[hsl(var(--muted)/0.6)] text-[hsl(var(--muted-fg))]",
    )}>
      {done ? "✓" : n}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
      <div className="text-xs text-[hsl(var(--muted-fg))]">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-[hsl(var(--muted-fg))]">{detail}</div>
    </div>
  );
}

function InsightCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-[hsl(var(--muted-fg))]">{icon}{title}</div>
      <ul className="mt-2 space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-[hsl(var(--muted-fg))]">• {item}</li>
        ))}
      </ul>
    </div>
  );
}

function DistributionChart({ data, color }: { data: Array<{ bucket: string; count: number }>; color: string }) {
  const filtered = data.filter((_, i) => i % Math.max(1, Math.floor(data.length / 30)) === 0);
  return (
    <div className="h-[250px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filtered} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis dataKey="bucket" tick={{ fill: "hsl(var(--muted-fg))", fontSize: 10 }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(filtered.length / 8))} angle={-30} textAnchor="end" height={50} />
          <YAxis tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip cursor={{ fill: "hsl(var(--muted)/0.5)" }} contentStyle={tooltipStyle} formatter={(v) => [`${v ?? 0} iterations`, "Count"]} />
          <Bar dataKey="count" radius={[6, 6, 2, 2]} fill={color} opacity={0.9} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
