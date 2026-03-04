"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  },
) {
  const {
    className,
    variant = "primary",
    size = "md",
    type = "button",
    ...rest
  } = props;

  return (
    <button
      type={type}
      className={cn(
        "focus-ring inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
        "disabled:pointer-events-none disabled:opacity-60",
        size === "sm" ? "h-9 px-3" : "h-10",
        variant === "primary" &&
          "bg-[hsl(var(--accent))] text-white shadow-[0_12px_30px_hsl(var(--accent)/0.25)] hover:brightness-110 active:translate-y-px",
        variant === "secondary" &&
          "glass text-[hsl(var(--card-fg))] hover:brightness-110 active:translate-y-px",
        variant === "ghost" &&
          "text-[hsl(var(--fg))] hover:bg-[hsl(var(--muted)/0.8)] active:translate-y-px",
        className,
      )}
      {...rest}
    />
  );
}

