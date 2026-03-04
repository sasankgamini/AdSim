"use client";

import * as React from "react";
import { heatmapDays, heatmapSlots, makePersonaHeatmap } from "@/lib/demo-data";
import { cn } from "@/lib/utils";

const palette = (v: number) => {
  // 0..1 -> alpha on accent2
  const a = 0.08 + v * 0.7;
  return `hsl(var(--accent-2) / ${a})`;
};

export function PersonaEngagementHeatmap(props: { className?: string }) {
  const { className } = props;
  const [hover, setHover] = React.useState<{
    day: string;
    slot: string;
    value: number;
  } | null>(null);

  const grid = React.useMemo(() => makePersonaHeatmap(), []);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="text-xs text-[hsl(var(--muted-fg))]">
          Hover a cell to see engagement intensity.
        </div>
        <div className="text-xs">
          {hover ? (
            <span className="text-[hsl(var(--muted-fg))]">
              {hover.day} · {hover.slot}:{" "}
              <span className="font-medium text-[hsl(var(--fg))]">
                {Math.round(hover.value * 100)}%
              </span>
            </span>
          ) : (
            <span className="text-[hsl(var(--muted-fg))]">—</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[52px_repeat(4,minmax(0,1fr))] gap-2">
        <div />
        {heatmapSlots.map((slot) => (
          <div key={slot} className="text-xs text-[hsl(var(--muted-fg))]">
            {slot}
          </div>
        ))}

        {heatmapDays.map((day, di) => (
          <React.Fragment key={day}>
            <div className="flex items-center text-xs text-[hsl(var(--muted-fg))]">
              {day}
            </div>
            {heatmapSlots.map((slot, si) => {
              const value = grid[di]?.[si] ?? 0;
              return (
                <button
                  key={`${day}-${slot}`}
                  type="button"
                  className={cn(
                    "focus-ring h-10 w-full rounded-xl border border-[hsl(var(--border)/0.55)] transition-all",
                    "hover:-translate-y-px hover:border-[hsl(var(--border))]",
                  )}
                  style={{ background: palette(value) }}
                  onMouseEnter={() => setHover({ day, slot, value })}
                  onMouseLeave={() => setHover(null)}
                />
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

