import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Nav } from "@/components/nav";
import { PageTransition } from "@/components/page-transition";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-surface min-h-screen">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[280px_1fr] md:gap-6 md:p-6">
        <aside className="glass sticky top-4 hidden h-[calc(100vh-2rem)] flex-col justify-between rounded-3xl p-4 md:flex">
          <div className="space-y-4">
            <Link
              href="/campaign-builder"
              className="focus-ring flex items-center gap-3 rounded-2xl p-3"
            >
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-white shadow-[0_18px_42px_hsl(var(--accent)/0.35)]">
                A
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold tracking-tight">AdSim</div>
                <div className="text-xs text-[hsl(var(--muted-fg))]">
                  AI Simulation Suite
                </div>
              </div>
            </Link>
            <Nav />
          </div>

          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[hsl(var(--border)/0.6)] bg-[hsl(var(--card)/0.35)] p-3">
            <div className="space-y-0.5">
              <div className="text-xs font-medium">Workspace</div>
              <div className="text-xs text-[hsl(var(--muted-fg))]">
                Live simulation
              </div>
            </div>
            <ThemeToggle />
          </div>
        </aside>

        <main className="min-w-0">
          <header className="glass mb-4 flex items-center justify-between rounded-3xl p-4 md:hidden">
            <Link href="/campaign-builder" className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-white">
                A
              </div>
              <div className="text-sm font-semibold tracking-tight">AdSim</div>
            </Link>
            <ThemeToggle />
          </header>
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

