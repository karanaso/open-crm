import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Pencil, ShieldAlert, Timer } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CommentVisibilityBadge, PriorityBadge, TicketStatusBadge } from "@/components/ui/badges";
import { LocalTime } from "@/components/ui/local-time";
import { CommentForm } from "@/components/tickets/comment-form";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { getTicket, getTicketComments } from "@/lib/services/tickets";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { SLA_HOURS } from "@/lib/constants";
import { formatDurationHours } from "@/lib/dates";
import { TICKET_TRANSITIONS } from "@/lib/ticket-status";
import {
  assignTicketAction,
  changeTicketPriorityAction,
  changeTicketStatusAction,
} from "@/actions/tickets";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const currentUser = await requireUser();
  const t = await getTranslations("support");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const locale = await getLocale();
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);
  const error = getParam(raw, "error");
  const returnTo = `/tickets/${ticket.id}`;

  const [comments, timeline, tasks, team] = await Promise.all([
    getTicketComments(ticket.id, currentUser),
    getTimeline({ ticketId: ticket.id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ ticketId: ticket.id }),
    listTeamMembers(),
  ]);

  const assignees = team
    .filter((member) => member.status === "active" || member.id === ticket.assigneeId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const allowedStatuses = TICKET_TRANSITIONS[ticket.status].filter((status) => status !== ticket.status);
  const slaTargets = (targets: { urgent: number; high: number; normal: number; low: number }) =>
    t("slaTarget", {
      urgent: `${tEnums("ticketPriority.urgent")} ${formatDurationHours(targets.urgent, locale)}`,
      high: `${tEnums("ticketPriority.high")} ${formatDurationHours(targets.high, locale)}`,
      normal: `${tEnums("ticketPriority.normal")} ${formatDurationHours(targets.normal, locale)}`,
      low: `${tEnums("ticketPriority.low")} ${formatDurationHours(targets.low, locale)}`,
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`${t("requesterDescription", { name: ticket.requesterName })}${ticket.companyName ? ` · ${ticket.companyName}` : ""}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/tickets/${ticket.id}/edit`}>
              <Pencil className="size-4" /> {tCommon("edit")}
            </Link>
          </Button>
        }
      />

      <PageError code={error} />

      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        {ticket.sla.isOverdue ? <Badge variant="destructive">{t("slaOverdue")}</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{tCommon("description")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Timer className="size-4" /> {t("firstResponse")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  {slaTargets({
                    urgent: SLA_HOURS.urgent.firstResponse,
                    high: SLA_HOURS.high.firstResponse,
                    normal: SLA_HOURS.normal.firstResponse,
                    low: SLA_HOURS.low.firstResponse,
                  })}
                </p>
                <p>
                  {t("due")} <LocalTime value={ticket.sla.firstResponseDue} />
                </p>
                {ticket.firstResponseAt ? (
                  <Badge variant={ticket.sla.firstResponseMet ? "success" : "warning"}>
                    {ticket.sla.firstResponseMet ? t("met") : t("breached")} ·{" "}
                    <LocalTime value={ticket.firstResponseAt} />
                  </Badge>
                ) : ticket.sla.firstResponseOverdue ? (
                  <Badge variant="destructive">{tCommon("overdue")}</Badge>
                ) : (
                  <Badge variant="info">{t("waitingForReply")}</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="size-4" /> {t("resolution")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  {slaTargets({
                    urgent: SLA_HOURS.urgent.resolution,
                    high: SLA_HOURS.high.resolution,
                    normal: SLA_HOURS.normal.resolution,
                    low: SLA_HOURS.low.resolution,
                  })}
                </p>
                <p>
                  {t("due")} <LocalTime value={ticket.sla.resolutionDue} />
                </p>
                {ticket.resolvedAt ? (
                  <Badge variant={ticket.sla.resolutionMet ? "success" : "warning"}>
                    {ticket.sla.resolutionMet ? t("met") : t("breached")} ·{" "}
                    <LocalTime value={ticket.resolvedAt} />
                  </Badge>
                ) : ticket.sla.resolutionOverdue ? (
                  <Badge variant="destructive">{tCommon("overdue")}</Badge>
                ) : (
                  <Badge variant="info">{tEnums("ticketStatus.in_progress")}</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("conversation")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noComments")}</p>
              ) : (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li key={comment.id} className="rounded-lg border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{comment.authorName}</span>
                          <CommentVisibilityBadge visibility={comment.visibility} />
                        </div>
                        <LocalTime value={comment.createdAt} />
                      </div>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="border-t pt-4">
                <CommentForm ticketId={ticket.id} returnTo={returnTo} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("ticketDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">{tCommon("requester")}</p>
                <Link href={`/contacts/${ticket.requesterContactId}`} className="font-medium hover:underline">
                  {ticket.requesterName}
                </Link>
                <p className="text-xs text-muted-foreground">{ticket.requesterEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{tCommon("company")}</p>
                {ticket.companyId ? (
                  <Link href={`/companies/${ticket.companyId}`} className="flex items-center gap-2 hover:underline">
                    <Building2 className="size-3.5" /> {ticket.companyName}
                  </Link>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">{tCommon("created")}</p>
                <LocalTime value={ticket.createdAt} />
              </div>
              <div className="space-y-2 border-t pt-3">
                <p className="font-medium">{tCommon("status")}</p>
                <div className="flex flex-wrap gap-1">
                  {allowedStatuses.map((status) => (
                    <form key={status} action={changeTicketStatusAction.bind(null, ticket.id, status, returnTo)}>
                      <Button type="submit" variant="outline" size="sm">
                        {tEnums(`ticketStatus.${status}`)}
                      </Button>
                    </form>
                  ))}
                </div>
              </div>
              <form
                action={assignTicketAction.bind(null, ticket.id, returnTo)}
                className="space-y-2 border-t pt-3"
              >
                <label htmlFor="ticket-assignee" className="font-medium">
                  {tCommon("assignee")}
                </label>
                <select
                  id="ticket-assignee"
                  name="assigneeId"
                  defaultValue={ticket.assigneeId ?? "none"}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">{tCommon("unassigned")}</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                      {assignee.status === "inactive" ? tCommon("inactiveSuffix") : ""}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" size="sm">
                  {t("saveAssignee")}
                </Button>
              </form>
              <form
                action={changeTicketPriorityAction.bind(null, ticket.id, returnTo)}
                className="space-y-2 border-t pt-3"
              >
                <label htmlFor="ticket-priority" className="font-medium">
                  {tCommon("priority")}
                </label>
                <select
                  id="ticket-priority"
                  name="priority"
                  defaultValue={ticket.priority}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="urgent">{tEnums("ticketPriority.urgent")}</option>
                  <option value="high">{tEnums("ticketPriority.high")}</option>
                  <option value="normal">{tEnums("ticketPriority.normal")}</option>
                  <option value="low">{tEnums("ticketPriority.low")}</option>
                </select>
                <Button type="submit" variant="secondary" size="sm">
                  {t("updatePriority")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{
          ticketId: ticket.id,
          contactId: ticket.requesterContactId,
          companyId: ticket.companyId,
        }}
        returnTo={returnTo}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees.filter((assignee) => assignee.status === "active")}
      />
    </div>
  );
}
