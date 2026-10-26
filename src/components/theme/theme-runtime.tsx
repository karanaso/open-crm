"use client";

import { useEffect } from "react";
import type { ThemeMode } from "@/lib/theme/config";

export function ThemeRuntime({ mode }: { mode: ThemeMode }) {
  useEffect(() => {
    if (mode !== "system") {
      document.documentElement.classList.toggle("dark", mode === "dark");
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (event?: MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", event ? event.matches : media.matches);
    };

    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [mode]);

  return null;
}
