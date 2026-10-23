import Link from "next/link";
import { getInviteByToken } from "@/lib/services/invites";
import { AcceptInviteForm } from "@/components/auth/accept-invite-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  if (!invite) {
    return (
      <EmptyState
        icon={UserX}
        title="This invitation is not available"
        description="The link may have expired, been used already, or been revoked. Ask an administrator for a new invitation."
        action={
          <Button asChild variant="outline">
            <Link href="/login">Go to sign in</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Team invitation</p>
        <h1 className="text-2xl font-semibold tracking-tight">Join the workspace</h1>
        <p className="text-sm text-muted-foreground">
          Set your name and password to activate your {invite.role} account.
        </p>
      </div>
      <AcceptInviteForm token={token} email={invite.email} />
    </div>
  );
}
