import { getTranslations } from "next-intl/server";
import { isErrorCode } from "@/lib/errors";

export async function PageError({ code }: { code?: string | null }) {
  if (!code) return null;
  const t = await getTranslations("errors");
  const key = isErrorCode(code) ? code : "GENERIC";

  return (
    <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
      {t(key)}
    </p>
  );
}
