import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowRight, Settings2, Shield, SlidersHorizontal, UserRound, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

export default async function SettingsPage() {
  const user = await requireUser();
  const t = await getTranslations("settings");
  const tNav = await getTranslations("nav");
  const tEnums = await getTranslations("enums");

  return (
    <div className="space-y-6">
      <PageHeader title={tNav("settings")} description={t("description")} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/profile" className="group">
          <Card className="h-full transition-colors group-hover:border-primary/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" /> {t("profileAndPassword")}
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
                    <Users className="size-4" /> {t("teamAdministration")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("teamDescription")}</span>
                  <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/pipelines" className="group">
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4" /> {t("pipelines")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{t("pipelinesDescription")}</span>
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
            <Shield className="size-4" /> {t("workspaceAccess")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            <Badge variant={user.role === "admin" ? "default" : "outline"}>{tEnums(`role.${user.role}`)}</Badge>
            {user.role === "admin" ? t("workspaceAccessAdmin") : t("workspaceAccessMember")}
          </p>
          <p className="flex items-center gap-2 text-muted-foreground">
            <Settings2 className="size-4" /> {t("sharedWorkspace")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
