"use client";

import { useState } from "react";
import axios from "axios";

const API_BASE = "http://localhost:8000";

export default function CampaignBuilder() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const campaign = {
      name: formData.get("name") as string,
      objective: formData.get("objective") as string,
      target_platform: formData.get("platform") as string,
      creative_type: formData.get("creative_type") as string,
      budget: Number(formData.get("budget")),
      ad_copy: formData.get("ad_copy") as string,
      creative_description: formData.get("creative_description") as string,
      target_keywords: [],
      target_interests: (formData.get("interests") as string)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      target_age_min: Number(formData.get("age_min")) || 18,
      target_age_max: Number(formData.get("age_max")) || 65
    };

    setLoading(true);
    try {
      const payload = {
        campaign,
        n_personas: 1000,
        n_iterations: 200
      };
      const { data } = await axios.post(`${API_BASE}/simulation/run`, payload);
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Campaign Builder</h1>
      <div className="grid lg:grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="glass-card p-4 space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Campaign name</label>
            <input
              name="name"
              required
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Spring fitness launch"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Objective</label>
              <select
                name="objective"
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="awareness">Awareness</option>
                <option value="traffic">Traffic</option>
                <option value="leads">Leads</option>
                <option value="sales">Sales</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Platform</label>
              <select
                name="platform"
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="Google">Google</option>
                <option value="Meta">Meta</option>
                <option value="TikTok">TikTok</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Creative type</label>
              <select
                name="creative_type"
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              >
                <option value="image">Image</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
                <option value="text">Text</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Budget (USD)</label>
            <input
              name="budget"
              type="number"
              min={10}
              defaultValue={1000}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Min age</label>
              <input
                name="age_min"
                type="number"
                defaultValue={22}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Max age</label>
              <input
                name="age_max"
                type="number"
                defaultValue={45}
                className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Interests (comma separated)</label>
            <input
              name="interests"
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              placeholder="fitness, startups"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Ad copy</label>
            <textarea
              name="ad_copy"
              rows={2}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Short performance-focused ad copy..."
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Creative description</label>
            <textarea
              name="creative_description"
              rows={2}
              className="w-full rounded-lg bg-slate-900/60 border border-slate-700 px-3 py-2 text-sm"
              placeholder="Vertical video with founder testimonial..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            {loading ? "Running simulation…" : "Run Monte Carlo Simulation"}
          </button>
        </form>

        <aside className="glass-card p-4">
          <h2 className="text-sm font-medium mb-3">Simulation Summary</h2>
          {!result && (
            <p className="text-sm text-slate-400">
              Configure a campaign on the left and run a simulation to see predicted CTR, CPA, and
              ROI distributions.
            </p>
          )}
          {result && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Mean CTR</span>
                <span className="font-medium">{(result.mean_ctr * 100).toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mean CPC</span>
                <span className="font-medium">${result.mean_cpc.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mean CPA</span>
                <span className="font-medium">
                  {result.mean_cpa === 0 ? "–" : `$${result.mean_cpa.toFixed(2)}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Mean ROI</span>
                <span className="font-medium">{result.mean_roi.toFixed(2)}x</span>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

