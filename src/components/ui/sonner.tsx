"use client";

import { Toaster as SonnerToaster } from "sonner";
import type { ThemeMode } from "@/lib/theme/config";

export function Toaster({ mode = "system" }: { mode?: ThemeMode }) {
  return (
    <SonnerToaster
      theme={mode}
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "border-border bg-background text-foreground shadow-lg",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
