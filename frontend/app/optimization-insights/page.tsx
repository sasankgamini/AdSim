"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const API_BASE = "http://localhost:8000";

export default function OptimizationInsights() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const payload = {
          base_campaign: {
            name: "Optimization base",
            objective: "sales",
            target_platform: "Meta",
            creative_type: "video",
            budget: 1500,
            ad_copy: "Demo",
            creative_description: "Demo",
            target_keywords: [],
            target_interests: ["fitness"],
            target_age_min: 25,
            target_age_max: 45
          },
          exploration_segments: [
            { target_platform: "Meta", creative_type: "video" },
            { target_platform: "Meta", creative_type: "image" },
            { target_platform: "TikTok", creative_type: "video" }
          ],
          n_trials: 12
        };
        const { data } = await axios.post(`${API_BASE}/optimization/run`, payload);
        setData(data);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  const armsChartData =
    data &&
    data.estimated_values.map((v: number, idx: number) => ({
      arm: `Arm ${idx + 1}`,
      roi: v
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Optimization Insights</h1>
      {!data && (
        <p className="text-sm text-slate-400">
          Running a small multi-armed bandit experiment to compare audience/creative variants…
        </p>
      )}
      {data && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-medium">Best Performing Arm</h2>
            <div className="text-sm space-y-1">
              <p className="text-slate-400">
                Selected arm index:{" "}
                <span className="font-mono text-slate-100">{data.best_index}</span>
              </p>
              <pre className="text-xs bg-slate-900/70 rounded-lg p-2 border border-slate-800 overflow-auto">
                {JSON.stringify(data.best_campaign, null, 2)}
              </pre>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-medium">Estimated ROI by Arm</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={armsChartData}>
                  <XAxis dataKey="arm" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}x`, "Estimated ROI"]}
                  />
                  <Bar dataKey="roi" fill="#22c55e" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

