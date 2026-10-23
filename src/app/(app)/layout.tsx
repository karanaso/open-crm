import { requireUser } from "@/lib/auth/guards";
import { AppShell } from "@/components/layout/app-shell";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [user, workspace] = await Promise.all([requireUser(), getWorkspaceDefaults()]);
  return (
    <AppShell
      user={{ name: user.name, email: user.email, role: user.role }}
      timeZone={workspace.timeZone}
    >
      {children}
    </AppShell>
  );
}
