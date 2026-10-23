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

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-medium tracking-wide text-primary uppercase">First-run setup</p>
        <h1 className="text-2xl font-semibold tracking-tight">Create your workspace</h1>
        <p className="text-sm text-muted-foreground">
          The first account becomes the workspace administrator. You can invite the rest of the team next.
        </p>
      </div>
      <SetupForm />
    </div>
  );
}
