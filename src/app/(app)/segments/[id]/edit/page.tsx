import { notFound } from "next/navigation";
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
  const team = await listTeamMembers();
  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit ${segment.name}`} description="Update the segment criteria. Campaign audiences already activated do not change." />
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
            submitLabel="Save changes"
            cancelHref={`/segments/${segment.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
