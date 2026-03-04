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
import { makeCtrHistogram } from "@/lib/demo-data";
import { useMounted } from "@/lib/use-mounted";

const data = makeCtrHistogram();

export function CtrDistributionChart() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[280px] w-full animate-pulse rounded-2xl bg-[hsl(var(--muted)/0.6)]" />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 8, left: -8 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis
            dataKey="bucket"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={1}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={32}
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
              return [`${v} sims`, "Count"] as const;
            }}
          />
          <Bar
            dataKey="count"
            radius={[10, 10, 6, 6]}
            fill="hsl(var(--accent))"
            opacity={0.9}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

