import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { PasswordForm, ProfileForm } from "@/components/settings/profile-forms";
import { requireUser } from "@/lib/auth/guards";

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const t = await getTranslations("settings");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("profile")} description={t("profileDescription")} />

      <Card>
        <CardHeader>
          <CardTitle>{t("profile")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm name={user.name} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("language")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("languageDescription")}</p>
          <LanguageSwitcher className="w-48" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("changePassword")}</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
