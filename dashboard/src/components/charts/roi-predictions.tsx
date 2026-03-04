"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { makeRoiPredictionSeries } from "@/lib/demo-data";
import { useMounted } from "@/lib/use-mounted";

const data = makeRoiPredictionSeries();

export function RoiPredictionsChart() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[280px] w-full animate-pulse rounded-2xl bg-[hsl(var(--muted)/0.6)]" />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 8, left: -8 }}>
          <defs>
            <linearGradient id="roiBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent-2))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--accent-2))" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis
            dataKey="week"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={34}
            tickFormatter={(v) => `${v.toFixed(1)}x`}
          />
          <Tooltip
            cursor={{ stroke: "hsl(var(--border))" }}
            contentStyle={{
              background: "hsl(var(--card)/0.85)",
              border: "1px solid hsl(var(--border)/0.7)",
              borderRadius: 12,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "hsl(var(--card-fg))",
            }}
            labelStyle={{ color: "hsl(var(--muted-fg))" }}
            formatter={(value, name) => {
              const v = typeof value === "number" ? value : Number(value ?? 0);
              const label =
                name === "roi" ? "Predicted ROI" : name === "low" ? "Low" : "High";
              return [`${v.toFixed(2)}x`, label] as const;
            }}
          />
          <Area
            type="monotone"
            dataKey="high"
            stroke="transparent"
            fill="url(#roiBand)"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive
          />
          <Area
            type="monotone"
            dataKey="low"
            stroke="transparent"
            fill="hsl(var(--bg))"
            fillOpacity={1}
            activeDot={false}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="roi"
            stroke="hsl(var(--accent-2))"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

