import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentForm } from "@/components/marketing/segment-form";
import { createSegmentAction } from "@/actions/marketing";
import { listTeamMembers } from "@/lib/services/users";
import { requireUser } from "@/lib/auth/guards";

export default async function NewSegmentPage() {
  await requireUser();
  const team = await listTeamMembers();
  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New segment" description="Define contact criteria for a campaign audience." />
      <Card>
        <CardContent className="pt-5">
          <SegmentForm
            action={createSegmentAction}
            owners={owners}
            submitLabel="Create segment"
            cancelHref="/segments"
          />
        </CardContent>
      </Card>
    </div>
  );
}
