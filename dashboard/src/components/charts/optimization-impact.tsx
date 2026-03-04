"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMounted } from "@/lib/use-mounted";

const data = [
  { lever: "Creative angle", lift: 0.18 },
  { lever: "Landing speed", lift: 0.12 },
  { lever: "Audience lookalike", lift: 0.1 },
  { lever: "Bid strategy", lift: 0.07 },
  { lever: "Frequency cap", lift: 0.05 },
];

export function OptimizationImpactChart() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[280px] w-full animate-pulse rounded-2xl bg-[hsl(var(--muted)/0.6)]" />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 10, bottom: 8, left: 10 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `+${Math.round(v * 100)}%`}
          />
          <YAxis
            type="category"
            dataKey="lever"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={110}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted)/0.5)" }}
            contentStyle={{
              background: "hsl(var(--card)/0.85)",
              border: "1px solid hsl(var(--border)/0.7)",
              borderRadius: 12,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "hsl(var(--card-fg))",
            }}
            labelStyle={{ color: "hsl(var(--muted-fg))" }}
            formatter={(value) => {
              const v = typeof value === "number" ? value : Number(value ?? 0);
              return [`+${Math.round(v * 100)}%`, "ROI lift"] as const;
            }}
          />
          <Bar dataKey="lift" fill="hsl(var(--accent))" radius={[10, 10, 10, 10]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

