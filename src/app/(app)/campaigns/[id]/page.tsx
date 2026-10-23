import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Archive, CheckCircle2, Megaphone, Pencil, Play, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { CampaignStatusBadge, RecipientStatusBadge, TagList } from "@/components/ui/badges";
import { DateDisplay, LocalTime } from "@/components/ui/local-time";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { getCampaign } from "@/lib/services/marketing";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import {
  transitionCampaignAction,
  updateRecipientStatusAction,
} from "@/actions/marketing";
import { cn, formatCurrency } from "@/lib/utils";
import { formatNumber } from "@/i18n/format";
import type { Locale } from "@/i18n/config";

function percent(value: number, locale: Locale) {
  return `${formatNumber(value, locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
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
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const locale = await getLocale();
  const workspace = await getWorkspaceDefaults();
  const recipientStatusLabels = {
    targeted: tEnums("recipientStatus.targeted"),
    sent: tEnums("recipientStatus.sent"),
    opened: tEnums("recipientStatus.opened"),
    clicked: tEnums("recipientStatus.clicked"),
    responded: tEnums("recipientStatus.responded"),
    converted: tEnums("recipientStatus.converted"),
  };
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
        description={t("campaignDescription", {
          channel: tEnums(`campaignChannel.${campaign.channel}`),
          segment: campaign.segmentSnapshot?.name ?? campaign.segmentName,
        })}
        actions={
          <>
            {campaign.status !== "archived" ? (
              <Button variant="outline" asChild>
                <Link href={`/campaigns/${campaign.id}/edit`}>
                  <Pencil className="size-4" /> {tCommon("edit")}
                </Link>
              </Button>
            ) : null}
            {campaign.status === "draft" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "active")}>
                <Button type="submit">
                  <Play className="size-4" /> {t("activate")}
                </Button>
              </form>
            ) : null}
            {campaign.status === "active" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "completed")}>
                <Button type="submit" variant="outline">
                  <CheckCircle2 className="size-4" /> {t("complete")}
                </Button>
              </form>
            ) : null}
            {campaign.status !== "archived" ? (
              <form action={transitionCampaignAction.bind(null, campaign.id, "archived")}>
                <ConfirmSubmit
                  message={t("archiveCampaignConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Archive className="size-4" /> {tCommon("archive")}
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      <PageError code={error} />

      <div className="flex flex-wrap items-center gap-2">
        <CampaignStatusBadge status={campaign.status} />
        <Badge variant="outline">{tEnums(`campaignChannel.${campaign.channel}`)}</Badge>
        {campaign.status === "archived" ? <Badge variant="outline">{t("readOnly")}</Badge> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("audience")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{formatNumber(campaign.metrics.audience, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("responseRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{percent(campaign.metrics.responseRate, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("conversionRate")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{percent(campaign.metrics.conversionRate, locale)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("budget")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {formatCurrency(campaign.budget, locale, workspace.defaultCurrency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("audienceAndEngagement")}</CardTitle>
            </CardHeader>
            <CardContent>
              {campaign.recipients.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Users className="mx-auto size-6 text-muted-foreground" />
                  <p className="mt-2 text-sm font-medium">{t("noAudienceSnapshotTitle")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("noAudienceSnapshotDescription")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap gap-2">
                    {Object.entries(campaign.metrics.counts).map(([status, count]) => (
                      <Badge key={status} variant="outline">
                        {t("statusCount", {
                          status: recipientStatusLabels[status as keyof typeof recipientStatusLabels],
                          count: formatNumber(count, locale),
                        })}
                      </Badge>
                    ))}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("contact")}</TableHead>
                        <TableHead>{tCommon("status")}</TableHead>
                        <TableHead>{tCommon("updated")}</TableHead>
                        {campaign.status !== "archived" ? <TableHead>{t("update")}</TableHead> : null}
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
                            {row.updatedByName ? <p>{t("updatedBy", { name: row.updatedByName })}</p> : null}
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
                                  aria-label={t("statusFor", { name: `${row.firstName} ${row.lastName}` })}
                                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                >
                                  <option value="targeted">{tEnums("recipientStatus.targeted")}</option>
                                  <option value="sent">{tEnums("recipientStatus.sent")}</option>
                                  <option value="opened">{tEnums("recipientStatus.opened")}</option>
                                  <option value="clicked">{tEnums("recipientStatus.clicked")}</option>
                                  <option value="responded">{tEnums("recipientStatus.responded")}</option>
                                  <option value="converted">{tEnums("recipientStatus.converted")}</option>
                                </select>
                                <Button type="submit" size="sm" variant="secondary">
                                  {tCommon("save")}
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
              <CardTitle>{t("campaignDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{tCommon("owner")}</p>
                <p className="font-medium">
                  {campaign.ownerName}
                  {campaign.ownerStatus === "inactive" ? <Badge variant="outline" className="ml-2">{tCommon("inactive")}</Badge> : null}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("segment")}</p>
                <p>{campaign.segmentSnapshot?.name ?? campaign.segmentName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("dates")}</p>
                <p>
                  <DateDisplay value={campaign.startDate} /> – <DateDisplay value={campaign.endDate} />
                </p>
              </div>
              {campaign.activatedAt ? (
                <div>
                  <p className="text-muted-foreground">{t("activated")}</p>
                  <LocalTime value={campaign.activatedAt} />
                </div>
              ) : null}
              {campaign.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{campaign.description}</p>
              ) : null}
              {snapshotCriteria ? (
                <div className="border-t pt-3">
                  <p className="text-muted-foreground">{t("audienceSnapshotCriteria")}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {snapshotCriteria.tags?.length ? <TagList tags={snapshotCriteria.tags} /> : null}
                    {snapshotCriteria.industry ? <Badge variant="outline">{snapshotCriteria.industry}</Badge> : null}
                    {snapshotCriteria.jobTitle ? <Badge variant="outline">{snapshotCriteria.jobTitle}</Badge> : null}
                  </div>
                </div>
              ) : null}
              <p className="border-t pt-3 text-xs text-muted-foreground">
                <Megaphone className="mr-1 inline size-3.5" /> {t("noMessagesNote")}
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
