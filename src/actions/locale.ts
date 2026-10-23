"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/guards";
import { updateUserLocale } from "@/lib/services/users";
import { isLocale } from "@/i18n/config";
import { setLocaleCookie } from "@/i18n/cookie";

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return { error: { key: "errors.INVALID_LOCALE" } } as const;

  await setLocaleCookie(locale);

  const user = await getCurrentUser();
  if (user) {
    await updateUserLocale(user.id, locale);
  }

  revalidatePath("/", "layout");
  return { locale } as const;
}
