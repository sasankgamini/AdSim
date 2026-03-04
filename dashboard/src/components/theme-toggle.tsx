"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Avoid hydration mismatch by rendering a stable fallback on the server.
  if (!mounted) {
    return (
      <Button variant="secondary" size="sm" aria-label="Toggle theme">
        <Sun size={16} />
        <span className="hidden sm:inline">Theme</span>
      </Button>
    );
  }

  const isDark = theme === "dark";

  return (
    <Button
      variant="secondary"
      size="sm"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span className="hidden sm:inline">{isDark ? "Light" : "Dark"}</span>
    </Button>
  );
}

