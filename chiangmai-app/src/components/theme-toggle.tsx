"use client";

import { useEffect, useState } from "react";
import { useTheme } from "@/components/providers/theme-provider";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const { dict } = useLocale();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount flag required to avoid SSR/client theme mismatch
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground transition-colors duration-200 hover:border-accent hover:text-accent-text"
      aria-label={dict.footer.theme}
    >
      {mounted ? (
        isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
      ) : (
        <span className="h-4 w-4" />
      )}
    </button>
  );
}
