import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getInviteByToken } from "@/lib/services/invites";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);
  const t = await getTranslations("auth");
  const tEnums = await getTranslations("enums");

  if (!invite) {
    return (
      <EmptyState
        icon={UserX}
        title={t("inviteUnavailableTitle")}
        description={t("inviteUnavailableDescription")}
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
        <p className="text-xs font-medium tracking-wide text-primary uppercase">{t("teamInvitation")}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t("inviteTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("inviteDescription", { role: tEnums(`role.${invite.role}`) })}
        </p>
      </div>
      <AcceptInviteForm token={token} email={invite.email} />
    </div>
  );
}
