import { getTranslations } from "next-intl/server";
import { redirect } from "@/lib/redirect";
import { auth } from "@/auth";
import { countUsers } from "@/db/ensure-default-pipeline";
import { SetupForm } from "@/components/auth/setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const users = await countUsers();
  if (users > 0) redirect("/login");

  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  const t = await getTranslations("auth");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{t("setupEyebrow")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("setupTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("setupDescription")}</p>
      </div>
      <SetupForm />
    </div>
  );
}
