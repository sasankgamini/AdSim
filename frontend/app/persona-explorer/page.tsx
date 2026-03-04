"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const API_BASE = "http://localhost:8000";

export default function PersonaExplorer() {
  const [personas, setPersonas] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      try {
        const { data } = await axios.post(`${API_BASE}/personas/generate`, {
          n_personas: 500
        });
        setPersonas(data.personas ?? []);
      } catch {
        // ignore
      }
    };
    run();
  }, []);

  const byPlatform = Object.values(
    personas.reduce((acc: any, p: any) => {
      acc[p.platform] = acc[p.platform] || { name: p.platform, value: 0 };
      acc[p.platform].value += 1;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Persona Explorer</h1>
      {!personas.length && (
        <p className="text-sm text-slate-400">Generating a synthetic audience distribution…</p>
      )}
      {personas.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4">
          <div className="glass-card p-4 space-y-3">
            <h2 className="text-sm font-medium">Platform Preference</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byPlatform}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(15,23,42,0.9)",
                      border: "1px solid rgba(51,65,85,0.8)",
                      borderRadius: 12
                    }}
                    formatter={(value: number, name: string) => [
                      value.toString(),
                      `${name} personas`
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card p-4 space-y-3 text-sm">
            <h2 className="text-sm font-medium">Sample Personas</h2>
            <div className="space-y-2 max-h-56 overflow-auto">
              {personas.slice(0, 5).map((p, idx) => (
                <div
                  key={idx}
                  className="border border-slate-700/80 rounded-xl px-3 py-2 bg-slate-900/40"
                >
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-100">
                      {p.age} · {p.platform}
                    </span>
                    <span className="text-xs text-slate-400">
                      PI {(p.purchase_intent * 100).toFixed(0)} · AF{" "}
                      {(p.ad_fatigue * 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {p.gender}, ${Math.round(p.income).toLocaleString()} · {p.device} ·{" "}
                    {p.location_region}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Interests: {(p.interests || []).join(", ")}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

