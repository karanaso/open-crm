import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { WorkspaceSettingsForm } from "@/components/settings/workspace-settings-form";
import { requireAdmin } from "@/lib/auth/guards";
import { getWorkspaceSettings } from "@/lib/services/workspace-settings";

type Translator = (key: string, values?: Record<string, string | number>) => string;

export default async function WorkspaceSettingsPage() {
  await requireAdmin();
  const settings = await getWorkspaceSettings();
  const t = (await getTranslations("settings")) as unknown as Translator;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title={t("workspaceDefaults")} description={t("workspaceSettingsDescription")} />
      <Card>
        <CardContent className="pt-5">
          <WorkspaceSettingsForm
            defaultCurrency={settings.defaultCurrency}
            timeZone={settings.timeZone}
          />
        </CardContent>
      </Card>
    </div>
  );
}
