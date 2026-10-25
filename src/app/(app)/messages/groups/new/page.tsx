import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { GroupForm } from "@/components/messaging/group-form";
import { createMessageGroupAction } from "@/actions/messaging";
import { requireUser } from "@/lib/auth/guards";

export default async function NewMessageGroupPage() {
  await requireUser();
  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("newGroup")} description={t("newGroupDescription")} />
      <Card>
        <CardContent className="pt-5">
          <GroupForm
            action={createMessageGroupAction}
            submitLabel={tCommon("create")}
            cancelHref="/messages/groups"
          />
        </CardContent>
      </Card>
    </div>
  );
}
