import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "@/components/marketing/campaign-form";
import { updateCampaignAction } from "@/actions/marketing";
import { getCampaign, getSegment, getSegmentOptions } from "@/lib/services/marketing";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");

  const [segments, team, currentSegment] = await Promise.all([
    getSegmentOptions(),
    listTeamMembers(),
    getSegment(campaign.segmentId),
  ]);

  const owners = team
    .filter((member) => member.status === "active" || member.id === campaign.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const segmentOptions = segments.map((segment) => ({
    id: segment.id,
    name: segment.name,
    audienceCount: segment.audienceCount,
    archivedAt: segment.archivedAt,
  }));
  if (currentSegment && !segmentOptions.some((segment) => segment.id === currentSegment.id)) {
    segmentOptions.push({
      id: currentSegment.id,
      name: currentSegment.name,
      audienceCount: currentSegment.audienceCount,
      archivedAt: currentSegment.archivedAt,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("editCampaignTitle", { name: campaign.name })} description={t("editCampaignDescription")} />
      <Card>
        <CardContent className="pt-5">
          <CampaignForm
            action={updateCampaignAction.bind(null, campaign.id)}
            segments={segmentOptions}
            owners={owners}
            initial={{
              name: campaign.name,
              channel: campaign.channel,
              segmentId: campaign.segmentId,
              ownerId: campaign.ownerId,
              budget: campaign.budget,
              startDate: campaign.startDate,
              endDate: campaign.endDate,
              description: campaign.description,
            }}
            submitLabel={tCommon("saveChanges")}
            cancelHref={`/campaigns/${campaign.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
