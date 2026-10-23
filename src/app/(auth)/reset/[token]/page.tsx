import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPasswordResetByToken } from "@/lib/services/invites";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await getPasswordResetByToken(token);
  const t = await getTranslations("auth");

  if (!row) {
    return (
      <EmptyState
        icon={KeyRound}
        title={t("resetUnavailableTitle")}
        description={t("resetUnavailableDescription")}
        action={
          <Button asChild variant="outline">
            <Link href="/login">{t("goToSignIn")}</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{t("passwordReset")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("resetTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t.rich("resetDescription", {
            email: row.user.email,
            b: (chunks) => <span className="font-medium">{chunks}</span>,
          })}
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
