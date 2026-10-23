import Link from "next/link";
import { getPasswordResetByToken } from "@/lib/services/invites";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const row = await getPasswordResetByToken(token);

  if (!row) {
    return (
      <EmptyState
        icon={KeyRound}
        title="This reset link is not available"
        description="The link may have expired or already been used. Ask an administrator to generate a new one."
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
        <p className="text-xs font-medium tracking-wide text-primary uppercase">Password reset</p>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="text-sm text-muted-foreground">
          Updating the password for <span className="font-medium">{row.user.email}</span> will sign out other
          sessions.
        </p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
