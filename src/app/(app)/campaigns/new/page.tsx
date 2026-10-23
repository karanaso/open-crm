import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignForm } from "@/components/marketing/campaign-form";
import { createCampaignAction } from "@/actions/marketing";
import { requireUser } from "@/lib/auth/guards";
import { getSegmentOptions } from "@/lib/services/marketing";
import { listTeamMembers } from "@/lib/services/users";

export default async function NewCampaignPage() {
  const user = await requireUser();
  const [segments, team] = await Promise.all([getSegmentOptions(), listTeamMembers()]);
  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New campaign" description="Choose a segment and plan the outreach." />
      <Card>
        <CardContent className="pt-5">
          <CampaignForm
            action={createCampaignAction}
            segments={segments.map((segment) => ({
              id: segment.id,
              name: segment.name,
              audienceCount: segment.audienceCount,
              archivedAt: segment.archivedAt,
            }))}
            owners={owners}
            initial={{
              name: "",
              channel: "email",
              segmentId: segments[0]?.id ?? "",
              ownerId: user.id,
              budget: "0",
              startDate: null,
              endDate: null,
              description: null,
            }}
            submitLabel="Create campaign"
            cancelHref="/campaigns"
          />
        </CardContent>
      </Card>
    </div>
  );
}
