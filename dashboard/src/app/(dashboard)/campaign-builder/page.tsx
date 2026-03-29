"use client";

import * as React from "react";
import { Sparkles, Wand2, Loader2, ChevronDown, ChevronUp, BrainCircuit } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  type CampaignPayload,
  type SimulationResult,
  type CreativeResponse,
  type CreativeVariant,
  runSimulation,
  generateCreative,
} from "@/lib/api";
import { exampleCampaigns } from "@/lib/example-campaigns";
import { cn } from "@/lib/utils";

export default function CampaignBuilderPage() {
  const [campaign, setCampaign] = React.useState<CampaignPayload>(
    exampleCampaigns[0].campaign,
  );
  const [nPersonas, setNPersonas] = React.useState(1000);
  const [nSims, setNSims] = React.useState(10000);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SimulationResult | null>(null);
  const [selectedExample, setSelectedExample] = React.useState(
    exampleCampaigns[0].id,
  );
  const [showExamples, setShowExamples] = React.useState(true);

  // AI creative generation
  const [productName, setProductName] = React.useState("");
  const [productDesc, setProductDesc] = React.useState("");
  const [tone, setTone] = React.useState("professional");
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<CreativeResponse | null>(null);
  const [aiError, setAiError] = React.useState<string | null>(null);

  async function handleGenerateCreative() {
    if (!productName.trim()) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await generateCreative({
        product_name: productName,
        product_description: productDesc,
        objective: campaign.objective,
        target_platform: campaign.target_platform,
        creative_type: campaign.creative_type,
        target_interests: campaign.target_interests,
        budget: campaign.budget,
        tone,
        n_variants: 3,
      });
      setAiResult(res);
      // Auto-load the suggested campaign into the form
      if (res.suggested_campaign) {
        const sc = res.suggested_campaign;
        setCampaign((c) => ({
          ...c,
          name: sc.name ?? c.name,
          ad_copy: sc.ad_copy ?? c.ad_copy,
          creative_description: sc.creative_description ?? c.creative_description,
          target_interests: (sc.target_interests as string[]) ?? c.target_interests,
          target_age_min: sc.target_age_min ?? c.target_age_min,
          target_age_max: sc.target_age_max ?? c.target_age_max,
        }));
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Creative generation failed.");
    } finally {
      setAiLoading(false);
    }
  }

  function applyVariant(v: CreativeVariant) {
    setCampaign((c) => ({
      ...c,
      ad_copy: v.ad_copy,
      creative_description: v.creative_description,
    }));
  }

  function loadExample(id: string) {
    const ex = exampleCampaigns.find((e) => e.id === id);
    if (!ex) return;
    setCampaign(ex.campaign);
    setNPersonas(ex.n_personas);
    setNSims(ex.n_simulations);
    setSelectedExample(id);
    setResult(null);
    setError(null);
  }

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
      setError(
        err instanceof Error ? err.message : "Simulation failed. Is the backend running on localhost:8000?",
      );
    } finally {
      setLoading(false);
    }
  }

  const ex = exampleCampaigns.find((e) => e.id === selectedExample);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign Builder"
        subtitle="Pick an example ad creative or build your own, then run a real Monte Carlo simulation with synthetic personas."
        right={
          <Button onClick={handleRun} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? "Simulating…" : "Run Simulation"}
          </Button>
        }
      />

      {/* Example campaigns */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle>Example Ad Creatives</CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              Pre-built campaigns designed to show how different creatives, platforms, and audiences affect performance.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowExamples((v) => !v)}>
            {showExamples ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            {showExamples ? "Hide" : "Show"}
          </Button>
        </CardHeader>
        {showExamples && (
          <CardContent className="space-y-3">
            {exampleCampaigns.map((ec) => (
              <button
                key={ec.id}
                type="button"
                onClick={() => loadExample(ec.id)}
                className={cn(
                  "focus-ring w-full rounded-2xl border p-4 text-left transition-all",
                  ec.id === selectedExample
                    ? "border-[hsl(var(--border))] bg-[hsl(var(--card)/0.55)] shadow-[0_18px_40px_hsl(var(--shadow)/0.18)]"
                    : "border-[hsl(var(--border)/0.55)] bg-[hsl(var(--card)/0.35)] hover:-translate-y-px hover:border-[hsl(var(--border))]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{ec.label}</div>
                    <div className="mt-1 text-sm text-[hsl(var(--muted-fg))]">{ec.description}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge tone="accent">{ec.campaign.target_platform}</Badge>
                    <Badge tone="neutral">{ec.campaign.creative_type}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-[hsl(var(--muted-fg))]">
                  <span className="font-medium text-[hsl(var(--fg))]">Why it works:</span> {ec.why}
                </div>
              </button>
            ))}
          </CardContent>
        )}
      </Card>

      {/* AI Creative Generator */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <BrainCircuit size={18} />
              Generate Creative with AI
            </CardTitle>
            <div className="text-sm text-[hsl(var(--muted-fg))]">
              Describe your product and Gemini will generate ad copy, creative descriptions, and a campaign spec optimized for the simulation engine.
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Product name</div>
              <Input
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. FitTrack Pro"
              />
            </div>
            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Tone</div>
              <Select value={tone} onChange={(e) => setTone(e.target.value)}>
                <option value="professional">Professional</option>
                <option value="playful">Playful</option>
                <option value="urgent">Urgent</option>
                <option value="minimal">Minimal</option>
                <option value="bold">Bold</option>
              </Select>
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
          <div className="flex items-center gap-3">
            <Button onClick={handleGenerateCreative} disabled={aiLoading || !productName.trim()}>
              {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <BrainCircuit size={16} />}
              {aiLoading ? "Generating with Gemini…" : "Generate Creative"}
            </Button>
            <span className="text-xs text-[hsl(var(--muted-fg))]">
              Uses platform, objective, interests, and budget from the form below.
            </span>
          </div>

          {aiError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{aiError}</div>
          )}

          {aiResult && (
            <div className="space-y-4">
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
                    className="rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-4 transition-all hover:-translate-y-px hover:border-[hsl(var(--border))]"
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
                        <Button size="sm" variant="secondary" onClick={() => applyVariant(v)}>
                          Use this
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Campaign spec form */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Campaign Spec</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                These inputs define what the Monte Carlo simulator tests against {nPersonas.toLocaleString()} synthetic personas.
              </div>
            </div>
            <Button variant="secondary" onClick={() => loadExample(exampleCampaigns[0].id)}>
              <Wand2 size={16} />
              Reset
            </Button>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Campaign name</div>
                <Input value={campaign.name} onChange={(e) => setCampaign((c) => ({ ...c, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Objective</div>
                <Select value={campaign.objective} onChange={(e) => setCampaign((c) => ({ ...c, objective: e.target.value as CampaignPayload["objective"] }))}>
                  <option value="awareness">Awareness</option>
                  <option value="traffic">Traffic</option>
                  <option value="leads">Leads</option>
                  <option value="sales">Sales</option>
                </Select>
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Budget ($)</div>
                <Input type="number" value={campaign.budget} onChange={(e) => setCampaign((c) => ({ ...c, budget: Number(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Min age</div>
                <Input type="number" value={campaign.target_age_min ?? 18} onChange={(e) => setCampaign((c) => ({ ...c, target_age_min: Number(e.target.value) || 18 }))} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Max age</div>
                <Input type="number" value={campaign.target_age_max ?? 65} onChange={(e) => setCampaign((c) => ({ ...c, target_age_max: Number(e.target.value) || 65 }))} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Target interests (comma-separated)</div>
              <Input
                value={(campaign.target_interests ?? []).join(", ")}
                onChange={(e) => setCampaign((c) => ({ ...c, target_interests: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) }))}
                placeholder="fitness, startups, beauty"
              />
              <div className="text-xs text-[hsl(var(--muted-fg))]">
                Available: fitness, gaming, finance, travel, beauty, startups, parenting, education, sports, food
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Ad copy</div>
              <textarea
                className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={campaign.ad_copy}
                onChange={(e) => setCampaign((c) => ({ ...c, ad_copy: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Creative description</div>
              <textarea
                className="focus-ring w-full rounded-xl border border-[hsl(var(--border)/0.7)] bg-transparent px-3 py-2 text-sm"
                rows={2}
                value={campaign.creative_description}
                onChange={(e) => setCampaign((c) => ({ ...c, creative_description: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Synthetic personas</div>
                <Input type="number" value={nPersonas} onChange={(e) => setNPersonas(Number(e.target.value) || 1000)} />
              </div>
              <div className="space-y-2">
                <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">Monte Carlo iterations</div>
                <Input type="number" value={nSims} onChange={(e) => setNSims(Number(e.target.value) || 10000)} />
              </div>
            </div>

            <Button onClick={handleRun} disabled={loading} className="w-full">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {loading
                ? `Running ${nSims.toLocaleString()} simulations across ${nPersonas.toLocaleString()} personas…`
                : `Run Monte Carlo (${nSims.toLocaleString()} sims × ${nPersonas.toLocaleString()} personas)`}
            </Button>
          </CardContent>
        </Card>

        {/* Results panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Simulation Results</CardTitle>
              <div className="text-sm text-[hsl(var(--muted-fg))]">
                {result
                  ? `${result.meta.n_simulations.toLocaleString()} Monte Carlo iterations × ${result.meta.n_personas.toLocaleString()} personas`
                  : "Run a simulation to see predicted performance."}
              </div>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </div>
              )}
              {!result && !error && (
                <p className="text-sm text-[hsl(var(--muted-fg))]">
                  Select an example campaign or define your own, then click &ldquo;Run Simulation&rdquo;.
                  The engine generates {nPersonas.toLocaleString()} synthetic personas with realistic demographics,
                  then each of {nSims.toLocaleString()} Monte Carlo iterations simulates every persona seeing your ad
                  and deciding whether to click and convert based on their attributes.
                </p>
              )}
              {result && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ResultCard
                      label="CTR"
                      value={`${(result.expected.ctr_mean * 100).toFixed(2)}%`}
                      detail={`${(result.distributions.ctr.summary.ci_low * 100).toFixed(2)}% – ${(result.distributions.ctr.summary.ci_high * 100).toFixed(2)}%`}
                    />
                    <ResultCard
                      label="ROI"
                      value={`${result.expected.roi_mean.toFixed(2)}x`}
                      detail={`${result.distributions.roi.summary.ci_low.toFixed(2)}x – ${result.distributions.roi.summary.ci_high.toFixed(2)}x`}
                    />
                    <ResultCard
                      label="Avg Clicks"
                      value={result.expected.avg_clicks.toFixed(0)}
                      detail={`of ${result.meta.impressions_per_sim} impressions`}
                    />
                    <ResultCard
                      label="Avg Conversions"
                      value={result.expected.avg_conversions.toFixed(1)}
                      detail={`CVR ${(result.expected.conversion_rate_mean * 100).toFixed(2)}%`}
                    />
                    <ResultCard
                      label="Avg Spend"
                      value={`$${result.expected.avg_spend.toFixed(0)}`}
                      detail={`CPC $${result.meta.cpc.toFixed(2)}`}
                    />
                    <ResultCard
                      label="Avg Revenue"
                      value={`$${result.expected.avg_revenue.toFixed(0)}`}
                      detail={`per sim iteration`}
                    />
                  </div>
                  <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
                    <div className="text-xs font-medium text-[hsl(var(--muted-fg))]">
                      How this works
                    </div>
                    <div className="mt-1 text-xs text-[hsl(var(--muted-fg))]">
                      Each iteration: {result.meta.n_personas} synthetic personas (with age, income, interests,
                      platform preference, purchase intent, ad fatigue, attention span) each see your ad.
                      Click probability = base CTR + interest overlap + platform match + creative factor
                      + attention boost − fatigue penalty. Conversion probability depends on purchase intent,
                      income, and creative type. Budget caps clicks at {result.meta.max_clicks_by_budget}
                      (${result.meta.budget} ÷ ${result.meta.cpc.toFixed(2)} CPC).
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {ex && (
            <Card>
              <CardHeader>
                <CardTitle>Why this creative works</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-[hsl(var(--muted-fg))]">{ex.why}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="accent">{ex.campaign.target_platform}</Badge>
                  <Badge tone="neutral">{ex.campaign.creative_type}</Badge>
                  <Badge tone="neutral">{ex.campaign.objective}</Badge>
                  {(ex.campaign.target_interests ?? []).map((i) => (
                    <Badge key={i} tone="good">{i}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
      <div className="text-xs text-[hsl(var(--muted-fg))]">{label}</div>
      <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-0.5 text-xs text-[hsl(var(--muted-fg))]">{detail}</div>
    </div>
  );
}
