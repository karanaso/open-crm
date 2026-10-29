import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LifeBuoy, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowEditLink } from "@/components/ui/row-edit-link";
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
  const t = await getTranslations("support");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
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
        title={t("tickets")}
        description={t("ticketsDescription")}
        actions={
          <Button asChild>
            <Link href="/tickets/new">
              <Plus className="size-4" /> {t("newTicket")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              name="q"
              defaultValue={params.q}
              placeholder={t("searchTicketsPlaceholder")}
              aria-label={t("searchTickets")}
            />
            <select
              name="status"
              defaultValue={params.status}
              aria-label={tCommon("filterByStatus")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="active">{t("activeStatusOption")}</option>
              <option value="open">{tEnums("ticketStatus.open")}</option>
              <option value="in_progress">{tEnums("ticketStatus.in_progress")}</option>
              <option value="pending">{tEnums("ticketStatus.pending")}</option>
              <option value="resolved">{tEnums("ticketStatus.resolved")}</option>
              <option value="closed">{tEnums("ticketStatus.closed")}</option>
            </select>
            <select
              name="priority"
              defaultValue={params.priority ?? ""}
              aria-label={tCommon("filterByPriority")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allPriorities")}</option>
              <option value="urgent">{tEnums("ticketPriority.urgent")}</option>
              <option value="high">{tEnums("ticketPriority.high")}</option>
              <option value="normal">{tEnums("ticketPriority.normal")}</option>
              <option value="low">{tEnums("ticketPriority.low")}</option>
            </select>
            <select
              name="assigneeId"
              defaultValue={params.assigneeId ?? ""}
              aria-label={tCommon("filterByAssignee")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allAssignees")}</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              name="companyId"
              defaultValue={params.companyId ?? ""}
              aria-label={tCommon("filterByCompany")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allCompanies")}</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" name="unassigned" value="1" defaultChecked={Boolean(params.unassigned)} />
                {tCommon("unassigned")}
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" name="overdue" value="1" defaultChecked={Boolean(params.overdue)} />
                {tCommon("overdue")}
              </label>
            </div>
            <select
              name="sort"
              defaultValue={params.sort}
              aria-label={t("sortTickets")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="updated">{t("sortRecentlyUpdated")}</option>
              <option value="created">{t("sortNewest")}</option>
              <option value="priority">{t("sortPriority")}</option>
              <option value="sla">{t("sortSlaDue")}</option>
            </select>
            <div className="lg:col-span-2">
              <Button type="submit" variant="secondary">{tCommon("applyFilters")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title={t("ticketsNoMatchTitle")}
          description={t("ticketsNoMatchDescription")}
          action={<Button asChild><Link href="/tickets/new">{t("newTicket")}</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("subject")}</TableHead>
                <TableHead>{tCommon("requester")}</TableHead>
                <TableHead>{tCommon("priority")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{tCommon("assignee")}</TableHead>
                <TableHead>{t("sla")}</TableHead>
                <TableHead>{tCommon("updated")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{tCommon("actions")}</span>
                </TableHead>
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
                    {ticket.assigneeName ?? <span className="text-muted-foreground">{tCommon("unassigned")}</span>}
                  </TableCell>
                  <TableCell>
                    {ticket.sla.isOverdue ? (
                      <Badge variant="destructive">{tCommon("overdue")}</Badge>
                    ) : !ticket.firstResponseAt ? (
                      <span className="text-xs text-muted-foreground">
                        {t("replyBy")} <LocalTime value={ticket.sla.firstResponseDue} />
                      </span>
                    ) : !ticket.resolvedAt ? (
                      <span className="text-xs text-muted-foreground">
                        {t("resolveBy")} <LocalTime value={ticket.sla.resolutionDue} />
                      </span>
                    ) : (
                      <Badge variant={ticket.sla.resolutionMet ? "success" : "warning"}>
                        {ticket.sla.resolutionMet ? t("met") : t("breached")}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={ticket.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowEditLink
                      href={`/tickets/${ticket.id}/edit`}
                      label={tCommon("editFor", { name: ticket.subject })}
                    />
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
