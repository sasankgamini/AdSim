import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "AdSim - Agent-Based Advertising Simulation",
  description: "Simulate and optimize ad campaigns before spending budget."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-background text-slate-100 min-h-screen">
        <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
          <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}

