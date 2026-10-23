import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/lib/redirect";
import { getCurrentUser } from "@/lib/auth/guards";
import { countUsers } from "@/db/ensure-default-pipeline";
import { LoginForm } from "@/components/auth/login-form";
import { sanitizeCallbackUrl } from "@/lib/action-state";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const users = await countUsers();
  if (users === 0) redirect("/setup");

  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const rawCallback = params.callbackUrl;
  const callbackUrl = sanitizeCallbackUrl(Array.isArray(rawCallback) ? rawCallback[0] : rawCallback);
  const t = await getTranslations("auth");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("welcomeBack")}</h1>
        <p className="text-sm text-muted-foreground">{t("signInSubtitle")}</p>
      </div>

      {params.reset || params.changed ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {params.changed ? t("passwordChangedSuccess") : t("passwordResetSuccess")}
        </p>
      ) : null}

      <LoginForm callbackUrl={callbackUrl} />

      <p className="text-center text-xs text-muted-foreground">
        {t("needAccess")}{" "}
        <Link href="/" className="underline underline-offset-4">
          {t("backHome")}
        </Link>
      </p>
    </div>
  );
}
