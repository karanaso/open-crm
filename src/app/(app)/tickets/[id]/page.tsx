import Link from "next/link";
import { notFound } from "next/navigation";
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={ticket.subject}
        description={`Requester: ${ticket.requesterName}${ticket.companyName ? ` · ${ticket.companyName}` : ""}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/tickets/${ticket.id}/edit`}>
              <Pencil className="size-4" /> Edit
            </Link>
          </Button>
        }
      />

      <PageError code={error} />

      <div className="flex flex-wrap items-center gap-2">
        <TicketStatusBadge status={ticket.status} />
        <PriorityBadge priority={ticket.priority} />
        {ticket.sla.isOverdue ? <Badge variant="destructive">SLA overdue</Badge> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Timer className="size-4" /> First response
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Target: urgent 1h · high 4h · normal 8h · low 24h
                </p>
                <p>
                  Due <LocalTime value={ticket.sla.firstResponseDue} />
                </p>
                {ticket.firstResponseAt ? (
                  <Badge variant={ticket.sla.firstResponseMet ? "success" : "warning"}>
                    {ticket.sla.firstResponseMet ? "Met" : "Breached"} ·{" "}
                    <LocalTime value={ticket.firstResponseAt} />
                  </Badge>
                ) : ticket.sla.firstResponseOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="info">Waiting for reply</Badge>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="size-4" /> Resolution
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  Target: urgent 8h · high 24h · normal 48h · low 72h
                </p>
                <p>
                  Due <LocalTime value={ticket.sla.resolutionDue} />
                </p>
                {ticket.resolvedAt ? (
                  <Badge variant={ticket.sla.resolutionMet ? "success" : "warning"}>
                    {ticket.sla.resolutionMet ? "Met" : "Breached"} ·{" "}
                    <LocalTime value={ticket.resolvedAt} />
                  </Badge>
                ) : ticket.sla.resolutionOverdue ? (
                  <Badge variant="destructive">Overdue</Badge>
                ) : (
                  <Badge variant="info">In progress</Badge>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Conversation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet.</p>
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
              <CardTitle>Ticket details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Requester</p>
                <Link href={`/contacts/${ticket.requesterContactId}`} className="font-medium hover:underline">
                  {ticket.requesterName}
                </Link>
                <p className="text-xs text-muted-foreground">{ticket.requesterEmail}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Company</p>
                {ticket.companyId ? (
                  <Link href={`/companies/${ticket.companyId}`} className="flex items-center gap-2 hover:underline">
                    <Building2 className="size-3.5" /> {ticket.companyName}
                  </Link>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <LocalTime value={ticket.createdAt} />
              </div>
              <div className="space-y-2 border-t pt-3">
                <p className="font-medium">Status</p>
                <div className="flex flex-wrap gap-1">
                  {allowedStatuses.map((status) => (
                    <form key={status} action={changeTicketStatusAction.bind(null, ticket.id, status, returnTo)}>
                      <Button type="submit" variant="outline" size="sm">
                        {status.replaceAll("_", " ")}
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
                  Assignee
                </label>
                <select
                  id="ticket-assignee"
                  name="assigneeId"
                  defaultValue={ticket.assigneeId ?? "none"}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="none">Unassigned</option>
                  {assignees.map((assignee) => (
                    <option key={assignee.id} value={assignee.id}>
                      {assignee.name}
                      {assignee.status === "inactive" ? " (inactive)" : ""}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="secondary" size="sm">
                  Save assignee
                </Button>
              </form>
              <form
                action={changeTicketPriorityAction.bind(null, ticket.id, returnTo)}
                className="space-y-2 border-t pt-3"
              >
                <label htmlFor="ticket-priority" className="font-medium">
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  name="priority"
                  defaultValue={ticket.priority}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                </select>
                <Button type="submit" variant="secondary" size="sm">
                  Update priority
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
