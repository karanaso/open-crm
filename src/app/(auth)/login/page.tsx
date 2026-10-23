import Link from "next/link";
import { redirect } from "@/lib/redirect";
import { auth } from "@/auth";
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

  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  const rawCallback = params.callbackUrl;
  const callbackUrl = sanitizeCallbackUrl(Array.isArray(rawCallback) ? rawCallback[0] : rawCallback);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your team workspace.</p>
      </div>

      {params.reset ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Password updated. Sign in with your new password.
        </p>
      ) : null}

      <LoginForm callbackUrl={callbackUrl} />

      <p className="text-center text-xs text-muted-foreground">
        Need access? Ask an administrator for an invitation link.{" "}
        <Link href="/" className="underline underline-offset-4">
          Back home
        </Link>
      </p>
    </div>
  );
}
