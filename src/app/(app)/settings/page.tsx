import Link from "next/link";
import { ArrowRight, Settings2, Shield, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your profile, team access, and sales pipeline configuration." />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/profile" className="group">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" /> Profile and password
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{user.name} · {user.email}</span>
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>
        </Link>

        {user.role === "admin" ? (
          <>
            <Link href="/settings/team" className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4" /> Team administration
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Invite members, roles, access, and password resets</span>
                  <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/pipelines" className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4" /> Pipelines
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Stages, probabilities, and the default pipeline</span>
                  <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>
          </>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="size-4" /> Workspace access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Badge variant={user.role === "admin" ? "default" : "outline"}>{user.role}</Badge>
            {user.role === "admin"
              ? "You can manage the team and pipeline configuration."
              : "Ask an administrator for team or pipeline changes."}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Settings2 className="size-4" /> This deployment uses one shared workspace. All active members can
            view and edit CRM records.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
