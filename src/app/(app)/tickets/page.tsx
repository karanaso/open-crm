import Link from "next/link";
import { LifeBuoy, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PriorityBadge, TicketStatusBadge } from "@/components/ui/badges";
import { LocalTime } from "@/components/ui/local-time";
import { buildHref, getParam } from "@/lib/search-params";
import { ticketListParamsSchema } from "@/lib/validation/ticket";
import { listTickets } from "@/lib/services/tickets";
import { listTeamMembers } from "@/lib/services/users";
import { getCompanyPickerOptions } from "@/lib/services/companies";

export const dynamic = "force-dynamic";

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = ticketListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    status: getParam(raw, "status") || "active",
    priority: getParam(raw, "priority") || undefined,
    assigneeId: getParam(raw, "assigneeId") || undefined,
    unassigned: getParam(raw, "unassigned") === "1",
    overdue: getParam(raw, "overdue") === "1",
    sort: getParam(raw, "sort") || "updated",
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success
    ? parsed.data
    : {
        q: "",
        status: "active" as const,
        sort: "updated" as const,
        page: 1,
        pageSize: 20,
        companyId: undefined,
      };
  const [data, team, companies] = await Promise.all([
    listTickets(params),
    listTeamMembers(),
    getCompanyPickerOptions(),
  ]);
  const activeMembers = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Support requests with clear ownership, priority, and response targets."
        actions={
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="size-4" /> New ticket
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input name="q" defaultValue={params.q} placeholder="Search subject or requester…" aria-label="Search tickets" />
            <select
              name="status"
              defaultValue={params.status}
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">Active (open, in progress, pending)</option>
              <option value="open">Open</option>
              <option value="in_progress">In progress</option>
              <option value="pending">Pending</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select
              name="priority"
              defaultValue={params.priority ?? ""}
              aria-label="Filter by priority"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select
              name="assigneeId"
              defaultValue={params.assigneeId ?? ""}
              aria-label="Filter by assignee"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All assignees</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              name="companyId"
              defaultValue={params.companyId ?? ""}
              aria-label="Filter by company"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All companies</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="unassigned" value="1" defaultChecked={Boolean(params.unassigned)} />
                Unassigned
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="overdue" value="1" defaultChecked={Boolean(params.overdue)} />
                Overdue
              </label>
            </div>
            <select
              name="sort"
              defaultValue={params.sort}
              aria-label="Sort tickets"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="updated">Recently updated</option>
              <option value="created">Newest</option>
              <option value="priority">Priority</option>
              <option value="sla">SLA due time</option>
            </select>
            <div className="lg:col-span-2">
              <Button type="submit" variant="secondary">Apply filters</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="No tickets match those filters"
          description="Try the active view or clear a filter to see more requests."
          action={<Button asChild><Link href="/tickets/new">New ticket</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Requester</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assignee</TableHead>
                <TableHead>SLA</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                      {ticket.subject}
                    </Link>
                    {ticket.companyName ? (
                      <p className="text-xs text-muted-foreground">{ticket.companyName}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {ticket.requesterName}
                    <p className="text-xs text-muted-foreground">{ticket.requesterEmail}</p>
                  </TableCell>
                  <TableCell>
                    <PriorityBadge priority={ticket.priority} />
                  </TableCell>
                  <TableCell>
                    <TicketStatusBadge status={ticket.status} />
                  </TableCell>
                  <TableCell>
                    {ticket.assigneeName ?? <span className="text-muted-foreground">Unassigned</span>}
                  </TableCell>
                  <TableCell>
                    {ticket.sla.isOverdue ? (
                      <Badge variant="destructive">Overdue</Badge>
                    ) : !ticket.firstResponseAt ? (
                      <span className="text-xs text-muted-foreground">
                        Reply by <LocalTime value={ticket.sla.firstResponseDue} />
                      </span>
                    ) : !ticket.resolvedAt ? (
                      <span className="text-xs text-muted-foreground">
                        Resolve by <LocalTime value={ticket.sla.resolutionDue} />
                      </span>
                    ) : (
                      <Badge variant={ticket.sla.resolutionMet ? "success" : "warning"}>
                        {ticket.sla.resolutionMet ? "Met" : "Breached"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={ticket.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              pageSize={data.pageSize}
              buildHref={(page) => buildHref("/tickets", raw, { page: String(page) })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
