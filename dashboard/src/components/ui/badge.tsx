import * as React from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "accent" | "good" | "warn";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        tone === "neutral" &&
          "border-[hsl(var(--border)/0.65)] bg-[hsl(var(--card)/0.35)] text-[hsl(var(--muted-fg))]",
        tone === "accent" &&
          "border-[hsl(var(--accent)/0.35)] bg-[hsl(var(--accent)/0.14)] text-[hsl(var(--fg))]",
        tone === "good" &&
          "border-[hsl(142_71%_45%/0.35)] bg-[hsl(142_71%_45%/0.12)] text-[hsl(var(--fg))]",
        tone === "warn" &&
          "border-[hsl(39_96%_55%/0.35)] bg-[hsl(39_96%_55%/0.12)] text-[hsl(var(--fg))]",
        className,
      )}
      {...props}
    />
  );
}

