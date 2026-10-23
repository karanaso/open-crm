import Link from "next/link";
import { notFound } from "next/navigation";
import { Archive, CheckCircle2, Megaphone, Pencil, Play, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { CampaignStatusBadge, RecipientStatusBadge, TagList } from "@/components/ui/badges";
import { LocalTime } from "@/components/ui/local-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { getCampaign } from "@/lib/services/marketing";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import {
  transitionCampaignAction,
  updateRecipientStatusAction,
} from "@/actions/marketing";
import { cn, formatCurrency, titleCase } from "@/lib/utils";

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const currentUser = await requireUser();
  const error = getParam(raw, "error");
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);
  const returnTo = `/campaigns/${campaign.id}`;

  const [timeline, tasks, team] = await Promise.all([
    getTimeline({ campaignId: campaign.id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ campaignId: campaign.id }),
    listTeamMembers(),
  ]);

  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const snapshotCriteria = campaign.segmentSnapshot?.criteria ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name}
        description={`${titleCase(campaign.channel)} campaign · ${campaign.segmentSnapshot?.name ?? campaign.segmentName}`}
        actions={
          <>
            {campaign.status !== "archived" ? (
              <Button variant="outline" asChild>
                <Link href={`/campaigns/${campaign.id}/edit`}>
                  <Pencil className="size-4" /> Edit
                </Link>
              </Button>
            ) : null}
            {campaign.status === "draft" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "active")}>
                <Button type="submit">
                  <Play className="size-4" /> Activate
                </Button>
              </form>
            ) : null}
            {campaign.status === "active" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "completed")}>
                <Button type="submit" variant="outline">
                  <CheckCircle2 className="size-4" /> Complete
                </Button>
              </form>
            ) : null}
            {campaign.status !== "archived" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "archived")}>
                <ConfirmSubmit
                  message="Archive this campaign? It becomes read-only."
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Archive className="size-4" /> Archive
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      {error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <CampaignStatusBadge status={campaign.status} />
        <Badge variant="outline">{titleCase(campaign.channel)}</Badge>
        {campaign.status === "archived" ? <Badge variant="outline">Read-only</Badge> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Audience</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{campaign.metrics.audience}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Response rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{percent(campaign.metrics.responseRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Conversion rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{percent(campaign.metrics.conversionRate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatCurrency(campaign.budget)}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audience and engagement</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.recipients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Users className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">No audience snapshot yet</p>
                  <p className="text-xs text-muted-foreground">
                    Activate the campaign to snapshot the current segment members.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(campaign.metrics.counts).map(([status, count]) => (
                      <Badge key={status} variant="outline">
                        {titleCase(status)}: {count}
                      </Badge>
                    ))}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Updated</TableHead>
                        {campaign.status !== "archived" ? <TableHead>Update</TableHead> : null}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaign.recipients.map((row) => (
                        <TableRow key={row.recipient.id}>
                          <TableCell>
                            <Link href={`/contacts/${row.recipient.contactId}`} className="font-medium hover:underline">
                              {row.firstName} {row.lastName}
                            </Link>
                            <p className="text-xs text-muted-foreground">{row.email}</p>
                          </TableCell>
                          <TableCell>
                            <RecipientStatusBadge status={row.recipient.status} />
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <LocalTime value={row.recipient.statusUpdatedAt} />
                            {row.updatedByName ? <p>by {row.updatedByName}</p> : null}
                          </TableCell>
                          {campaign.status !== "archived" ? (
                            <TableCell>
                              <form
                                action={updateRecipientStatusAction.bind(null, row.recipient.id, returnTo)}
                                className="flex items-center gap-1"
                              >
                                <select
                                  name="status"
                                  defaultValue={row.recipient.status}
                                  aria-label={`Status for ${row.firstName} ${row.lastName}`}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                >
                                  <option value="targeted">Targeted</option>
                                  <option value="sent">Sent</option>
                                  <option value="opened">Opened</option>
                                  <option value="clicked">Clicked</option>
                                  <option value="responded">Responded</option>
                                  <option value="converted">Converted</option>
                                </select>
                                <Button type="submit" size="sm" variant="secondary">
                                  Save
                                </Button>
                              </form>
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Owner</p>
                <p className="font-medium">
                  {campaign.ownerName}
                  {campaign.ownerStatus === "inactive" ? <Badge variant="outline" className="ml-2">Inactive</Badge> : null}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Segment</p>
                <p>{campaign.segmentSnapshot?.name ?? campaign.segmentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Dates</p>
                <p>
                  {campaign.startDate ?? "—"} – {campaign.endDate ?? "—"}
                </p>
              </div>
              {campaign.activatedAt ? (
                <div>
                  <p className="text-muted-foreground">Activated</p>
                  <LocalTime value={campaign.activatedAt} />
                </div>
              ) : null}
              {campaign.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{campaign.description}</p>
              ) : null}
              {snapshotCriteria ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">Audience snapshot criteria</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {snapshotCriteria.tags?.length ? <TagList tags={snapshotCriteria.tags} /> : null}
                    {snapshotCriteria.industry ? <Badge variant="outline">{snapshotCriteria.industry}</Badge> : null}
                    {snapshotCriteria.jobTitle ? <Badge variant="outline">{snapshotCriteria.jobTitle}</Badge> : null}
                  </div>
                </div>
              ) : null}
              <p className="border-t pt-3 text-xs text-muted-foreground">
                <Megaphone className="mr-1 inline size-3.5" /> No messages are sent from this CRM. Update
                engagement statuses as outreach happens.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{ campaignId: campaign.id }}
        returnTo={returnTo}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
