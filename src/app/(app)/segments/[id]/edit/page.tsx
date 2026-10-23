import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentForm } from "@/components/marketing/segment-form";
import { updateSegmentAction } from "@/actions/marketing";
import { getSegment } from "@/lib/services/marketing";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditSegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const segment = await getSegment(id);
  if (!segment) notFound();
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const team = await listTeamMembers();
  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("editSegmentTitle", { name: segment.name })} description={t("editSegmentDescription")} />
      <Card>
        <CardContent className="pt-5">
          <SegmentForm
            action={updateSegmentAction.bind(null, segment.id)}
            initial={{
              name: segment.name,
              description: segment.description,
              criteria: segment.criteria,
            }}
            owners={owners}
            submitLabel={tCommon("saveChanges")}
            cancelHref={`/segments/${segment.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
