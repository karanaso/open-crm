import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, Pencil, UserRound } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealStatusBadge } from "@/components/ui/badges";
import { DateDisplay, LocalTime } from "@/components/ui/local-time";
import { DealStageControl } from "@/components/deals/deal-stage-control";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { getDeal } from "@/lib/services/deals";
import { getPipeline } from "@/lib/services/pipelines";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { formatCurrency } from "@/lib/utils";

export default async function DealDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const deal = await getDeal(id);
  if (!deal) notFound();

  const currentUser = await requireUser();
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);

  const [pipeline, timeline, tasks, team] = await Promise.all([
    getPipeline(deal.pipelineId),
    getTimeline({ dealId: id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ dealId: id }),
    listTeamMembers(),
  ]);

  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={deal.name}
        description={`${deal.pipelineName} · ${deal.stageName}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/deals/${deal.id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Deal overview</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-2xl font-semibold">{formatCurrency(deal.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <DealStatusBadge status={deal.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <Link href={`/companies/${deal.companyId}`} className="flex items-center gap-2 font-medium hover:underline">
                  <Building2 className="size-4" /> {deal.companyName}
                  {deal.companyArchivedAt ? <Badge variant="outline">Archived</Badge> : null}
                </Link>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Primary contact</p>
                {deal.contactId ? (
                  <Link href={`/contacts/${deal.contactId}`} className="font-medium hover:underline">
                    {deal.contactName}
                  </Link>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Owner</p>
                <p className="flex items-center gap-2 font-medium">
                  <UserRound className="size-4" /> {deal.ownerName}
                  {deal.ownerStatus === "inactive" ? <Badge variant="outline">Inactive</Badge> : null}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected close</p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4" /> <DateDisplay value={deal.expectedCloseDate} />
                </p>
              </div>
              {deal.closedAt ? (
                <div>
                  <p className="text-sm text-muted-foreground">Closed</p>
                  <LocalTime value={deal.closedAt} />
                </div>
              ) : null}
              {deal.lostReason ? (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Lost reason</p>
                  <p>{deal.lostReason}</p>
                </div>
              ) : null}
              {deal.description ? (
                <div className="sm:col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="whitespace-pre-wrap">{deal.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline stage</CardTitle>
            </CardHeader>
            <CardContent>
              {pipeline ? (
                <DealStageControl
                  dealId={deal.id}
                  currentStageId={deal.stageId}
                  stages={pipeline.stages}
                  expectedUpdatedAt={deal.updatedAt.toISOString()}
                />
              ) : (
                <p className="text-sm text-muted-foreground">Pipeline not available.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{ dealId: deal.id, companyId: deal.companyId, contactId: deal.contactId }}
        returnTo={`/deals/${deal.id}`}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
