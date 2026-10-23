import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Globe2,
  Settings2,
  Shield,
  SlidersHorizontal,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth/guards";

type Translator = (key: string, values?: Record<string, string | number>) => string;

export default async function SettingsPage() {
  const user = await requireUser();
  const t = (await getTranslations("settings")) as unknown as Translator;
  const tNav = await getTranslations("nav");
  const tEnums = await getTranslations("enums");

  return (
    <div className="space-y-6">
      <PageHeader title={tNav("settings")} description={t("description")} />

      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/settings/profile" className="group">
          <Card className="group-hover:border-primary/40 h-full transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound className="size-4" /> {t("profileAndPassword")}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
              <span>
                {user.name} · {user.email}
              </span>
              <ArrowRight className="size-4" />
            </CardContent>
          </Card>
        </Link>

        {user.role === "admin" ? (
          <>
            <Link href="/settings/team" className="group">
              <Card className="group-hover:border-primary/40 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="size-4" /> {t("teamAdministration")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>{t("teamDescription")}</span>
                  <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/pipelines" className="group">
              <Card className="group-hover:border-primary/40 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SlidersHorizontal className="size-4" /> {t("pipelines")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>{t("pipelinesDescription")}</span>
                  <ArrowRight className="size-4" />
                </CardContent>
              </Card>
            </Link>

            <Link href="/settings/workspace" className="group">
              <Card className="group-hover:border-primary/40 h-full transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe2 className="size-4" /> {t("workspaceDefaults")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground flex items-center justify-between text-sm">
                  <span>{t("workspaceDefaultsDescription")}</span>
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
            <Badge variant={user.role === "admin" ? "default" : "outline"}>
              {tEnums(`role.${user.role}`)}
            </Badge>
            {user.role === "admin" ? t("workspaceAccessAdmin") : t("workspaceAccessMember")}
          </p>
          <p className="text-muted-foreground flex items-center gap-2">
            <Settings2 className="size-4" /> {t("sharedWorkspace")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
