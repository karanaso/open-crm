import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageForm } from "@/components/messaging/message-form";
import { createMessageAction } from "@/actions/messaging";
import { requireUser } from "@/lib/auth/guards";
import { getMessageGroupOptions } from "@/lib/services/messaging";
import { getSegmentOptions } from "@/lib/services/marketing";

export default async function NewMessagePage() {
  await requireUser();
  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");
  const [groups, segments] = await Promise.all([getMessageGroupOptions(), getSegmentOptions()]);

  const groupOptions = groups.map((group) => ({
    id: group.id,
    name: group.name,
    count: group.memberCount,
    archived: Boolean(group.archivedAt),
  }));
  const segmentOptions = segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    count: segment.audienceCount,
    archived: Boolean(segment.archivedAt),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("newMessage")} description={t("newMessageDescription")} />
      {groupOptions.length === 0 && segmentOptions.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={t("noAudiencesTitle")}
          description={t("noAudiencesDescription")}
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild>
                <Link href="/messages/groups/new">
                  <Plus className="size-4" /> {t("newGroup")}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/segments/new">{t("segment")}</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <Card>
          <CardContent className="pt-5">
            <MessageForm
              action={createMessageAction}
              groups={groupOptions}
              segments={segmentOptions}
              initial={{
                subject: "",
                initialHtml: "",
                groupId: groupOptions[0]?.id ?? null,
                segmentId: null,
              }}
              submitLabel={tCommon("create")}
              cancelHref="/messages"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
