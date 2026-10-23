import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { formatCurrency } from "@/i18n/format";

type SalesTranslator = (key: string, values?: Record<string, string | number>) => string;

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
  const t = (await getTranslations("sales")) as unknown as SalesTranslator;
  const tCommon = await getTranslations("common");
  const locale = await getLocale();

  const [pipeline, timeline, tasks, team, workspace] = await Promise.all([
    getPipeline(deal.pipelineId),
    getTimeline({ dealId: id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ dealId: id }),
    listTeamMembers(),
    getWorkspaceDefaults(),
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
              <Pencil className="size-4" /> {tCommon("edit")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("dealOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground text-sm">{t("commission")}</p>
                <p className="text-2xl font-semibold">
                  {formatCurrency(Number(deal.amount), locale, deal.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t("propertyPrice")}</p>
                <p className="text-2xl font-semibold">
                  {deal.propertyPrice === null
                    ? "—"
                    : formatCurrency(Number(deal.propertyPrice), locale, deal.currency)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{tCommon("status")}</p>
                <DealStatusBadge status={deal.status} />
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t("primaryContact")}</p>
                <Link
                  href={`/contacts/${deal.contactId}`}
                  className="flex items-center gap-2 font-medium hover:underline"
                >
                  <UserRound className="size-4" /> {deal.contactName}
                </Link>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{tCommon("company")}</p>
                {deal.companyId ? (
                  <Link
                    href={`/companies/${deal.companyId}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <Building2 className="size-4" /> {deal.companyName}
                    {deal.companyArchivedAt ? (
                      <Badge variant="outline">{tCommon("archived")}</Badge>
                    ) : null}
                  </Link>
                ) : (
                  <p className="font-medium">{t("individualBuyer")}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t("listing")}</p>
                {deal.listingId ? (
                  <Link
                    href={`/listings/${deal.listingId}`}
                    className="font-medium hover:underline"
                  >
                    {deal.listingReference}
                    {deal.listingTitle ? ` · ${deal.listingTitle}` : ""}
                  </Link>
                ) : (
                  <p>{t("standaloneDeal")}</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{tCommon("owner")}</p>
                <p className="flex items-center gap-2 font-medium">
                  <UserRound className="size-4" /> {deal.ownerName}
                  {deal.ownerStatus === "inactive" ? (
                    <Badge variant="outline">{tCommon("inactive")}</Badge>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">{t("expectedClose")}</p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-4" /> <DateDisplay value={deal.expectedCloseDate} />
                </p>
              </div>
              {deal.closedAt ? (
                <div>
                  <p className="text-muted-foreground text-sm">{t("closed")}</p>
                  <LocalTime value={deal.closedAt} timeZone={workspace.timeZone} />
                </div>
              ) : null}
              {deal.lostReason ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-sm">{t("lostReason")}</p>
                  <p>{deal.lostReason}</p>
                </div>
              ) : null}
              {deal.description ? (
                <div className="sm:col-span-2">
                  <p className="text-muted-foreground text-sm">{tCommon("description")}</p>
                  <p className="whitespace-pre-wrap">{deal.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("pipelineStage")}</CardTitle>
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
                <p className="text-muted-foreground text-sm">{t("pipelineUnavailable")}</p>
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
