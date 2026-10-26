import { z } from "zod";
import { THEMES, THEME_MODES } from "@/lib/theme/config";

export const themePreferenceSchema = z.object({
  theme: z.enum(THEMES),
  mode: z.enum(THEME_MODES),
});

export type ThemePreferenceInput = z.infer<typeof themePreferenceSchema>;
