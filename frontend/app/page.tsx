"use client";

import Link from "next/link";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const sampleCtrData = [
  { iteration: 1, ctr: 0.018 },
  { iteration: 20, ctr: 0.022 },
  { iteration: 40, ctr: 0.024 },
  { iteration: 60, ctr: 0.027 },
  { iteration: 80, ctr: 0.029 }
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            AdSim — Agent-Based Advertising Simulation
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Simulate campaign performance, explore personas, and optimize your media mix before
            spending budget.
          </p>
        </div>
        <nav className="flex gap-3 text-sm">
          <Link href="/campaign-builder" className="glass-card px-4 py-2 hover:border-slate-500">
            Campaign Builder
          </Link>
          <Link href="/simulation-results" className="glass-card px-4 py-2 hover:border-slate-500">
            Simulation Results
          </Link>
          <Link href="/persona-explorer" className="glass-card px-4 py-2 hover:border-slate-500">
            Persona Explorer
          </Link>
          <Link href="/optimization-insights" className="glass-card px-4 py-2 hover:border-slate-500">
            Optimization Insights
          </Link>
        </nav>
      </header>

      <section className="grid md:grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Predicted CTR</p>
          <p className="text-3xl font-semibold mt-2">2.9%</p>
          <p className="text-xs text-emerald-400 mt-1">+0.7% vs. benchmark</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Predicted CPA</p>
          <p className="text-3xl font-semibold mt-2">$24.10</p>
          <p className="text-xs text-emerald-400 mt-1">-12% vs. benchmark</p>
        </div>
        <div className="glass-card p-4">
          <p className="text-xs uppercase tracking-widest text-slate-400">Simulated ROI</p>
          <p className="text-3xl font-semibold mt-2">1.8x</p>
          <p className="text-xs text-slate-400 mt-1">Median across 1,000 iterations</p>
        </div>
      </section>

      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-100">CTR Distribution (sample)</h2>
          <span className="text-xs text-slate-400">Monte Carlo iterations</span>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sampleCtrData}>
              <defs>
                <linearGradient id="ctrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <XAxis dataKey="iteration" tickLine={false} axisLine={false} tickMargin={8} />
              <YAxis
                tickFormatter={(v) => `${(v * 100).toFixed(1)}%`}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
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
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#ctrGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}

