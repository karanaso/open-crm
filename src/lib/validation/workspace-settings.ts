import { z } from "zod";
import { currencyCodeSchema } from "@/lib/validation/listing";

export function isValidTimeZone(value: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const workspaceSettingsSchema = z.object({
  defaultCurrency: currencyCodeSchema,
  timeZone: z
    .string()
    .trim()
    .min(1, "validation.required")
    .max(100, "validation.maxLength")
    .refine(isValidTimeZone, "validation.invalid"),
});

export type WorkspaceSettingsInput = z.infer<typeof workspaceSettingsSchema>;
