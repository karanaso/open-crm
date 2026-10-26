"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/guards";
import { updateUserTheme } from "@/lib/services/users";
import { setThemeCookies } from "@/lib/theme/cookie";
import { themePreferenceSchema } from "@/lib/validation/theme";

export async function setThemeAction(theme: string, mode: string) {
  const parsed = themePreferenceSchema.safeParse({ theme, mode });

  if (!parsed.success) {
    return { error: { key: "errors.INVALID_THEME" } } as const;
  }

  await setThemeCookies(parsed.data.theme, parsed.data.mode);

  try {
    const user = await getCurrentUser();
    if (user) {
      await updateUserTheme(user.id, parsed.data.theme, parsed.data.mode);
    }
  } catch (error) {
    console.error(error);
    revalidatePath("/", "layout");
    return { error: { key: "errors.GENERIC" } } as const;
  }

  revalidatePath("/", "layout");
  return { theme: parsed.data.theme, mode: parsed.data.mode } as const;
}
