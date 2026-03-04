"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FlaskConical,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const items: Array<{
  href: string;
  label: string;
  icon: LucideIcon;
}> = [
  { href: "/campaign-builder", label: "Campaign Builder", icon: Sparkles },
  { href: "/simulation-results", label: "Simulation Results", icon: BarChart3 },
  { href: "/persona-explorer", label: "Persona Explorer", icon: Users },
  { href: "/optimization-insights", label: "Optimization Insights", icon: FlaskConical },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
              "hover:bg-[hsl(var(--muted)/0.75)]",
              active && "bg-[hsl(var(--muted)/0.85)]",
            )}
          >
            <span
              className={cn(
                "grid h-9 w-9 place-items-center rounded-xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)]",
                "transition-all group-hover:border-[hsl(var(--border)/0.9)]",
                active &&
                  "border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.18)] shadow-[0_10px_24px_hsl(var(--shadow)/0.18)]",
              )}
            >
              <Icon size={18} className={cn(active ? "text-[hsl(var(--accent))]" : "text-[hsl(var(--muted-fg))]")} />
            </span>
            <span className="font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

