"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

const API_BASE = "http://localhost:8000";

export default function SimulationResults() {
  const [data, setData] = useState<any | null>(null);

  useEffect(() => {
    // simple demo: run a default simulation on mount
    const run = async () => {
      try {
        const payload = {
          campaign: {
            name: "Demo",
            objective: "traffic",
            target_platform: "Google",
            creative_type: "image",
            budget: 500,
            ad_copy: "Demo",
            creative_description: "Demo",
            target_keywords: [],
            target_interests: ["fitness"],
            target_age_min: 22,
            target_age_max: 45
          },
          n_personas: 800,
          n_iterations: 150
        };
        const { data } = await axios.post(`${API_BASE}/simulation/run`, payload);
        setData(data);
      } catch {
        // ignore for now
      }
    };
    run();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Simulation Results</h1>
      {!data && <p className="text-sm text-slate-400">Waiting for backend or simulation data…</p>}
      {data && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4">
            <h2 className="text-sm font-medium mb-2">CTR Distribution</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.distribution}>
                  <XAxis dataKey="impressions" hide />
                  <YAxis
                    tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={6}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12
                    }}
                    formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, "CTR"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="ctr"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={0.2}
                    fill="#38bdf8"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="text-sm font-medium mb-2">ROI Distribution</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.distribution}>
                  <CartesianGrid vertical={false} stroke="#1e293b" />
                  <XAxis dataKey="impressions" hide />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)}x`, "ROI"]}
                  />
                  <Bar dataKey="roi" fill="#a855f7" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

