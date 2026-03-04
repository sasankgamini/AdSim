"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { makePlatformComparison } from "@/lib/demo-data";
import { useMounted } from "@/lib/use-mounted";

const data = makePlatformComparison();

export function PlatformComparisonChart() {
  const mounted = useMounted();
  if (!mounted) return <div className="h-[280px] w-full animate-pulse rounded-2xl bg-[hsl(var(--muted)/0.6)]" />;

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 10, bottom: 8, left: -2 }}>
          <CartesianGrid strokeDasharray="4 8" stroke="hsl(var(--border)/0.5)" />
          <XAxis
            dataKey="platform"
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-fg))", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
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
          />
          <Legend
            verticalAlign="top"
            height={24}
            iconType="circle"
            wrapperStyle={{ color: "hsl(var(--muted-fg))", fontSize: 12 }}
          />
          <Bar dataKey="ctr" name="CTR (%)" fill="hsl(var(--accent))" radius={[8, 8, 6, 6]} />
          <Bar
            dataKey="cvr"
            name="CVR (%)"
            fill="hsl(var(--accent-2))"
            radius={[8, 8, 6, 6]}
            opacity={0.9}
          />
          <Bar
            dataKey="roi"
            name="ROI (x)"
            fill="hsl(224 85% 55%)"
            radius={[8, 8, 6, 6]}
            opacity={0.85}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

