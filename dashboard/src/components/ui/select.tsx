import * as React from "react";
import { cn } from "@/lib/utils";

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "focus-ring h-10 w-full appearance-none rounded-xl border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--card)/0.4)] px-3 text-sm",
        "placeholder:text-[hsl(var(--muted-fg))] shadow-[inset_0_1px_0_hsl(0_0%_100%/0.05)]",
        className,
      )}
      {...props}
    />
  );
}

