import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, MapPin, Pencil, Phone, RotateCcw, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { getParam } from "@/lib/search-params";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { EmptyState } from "@/components/ui/empty-state";
import { TagList, DealStatusBadge, TicketStatusBadge, PriorityBadge } from "@/components/ui/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, cn } from "@/lib/utils";
import { getCompany, getCompanyRelations } from "@/lib/services/companies";
import { archiveCompanyAction, restoreCompanyAction } from "@/actions/companies";

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const company = await getCompany(id);
  if (!company) notFound();

  const currentUser = await requireUser();
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);

  const [relations, timeline, tasks, team] = await Promise.all([
    getCompanyRelations(id),
    getTimeline({ companyId: id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ companyId: id }),
    listTeamMembers(),
  ]);

  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={company.name}
        description={company.domain ?? undefined}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/companies/${company.id}/edit`}>
                <Pencil className="size-4" /> Edit
              </Link>
            </Button>
            {company.archivedAt ? (
              <form action={restoreCompanyAction.bind(null, company.id)}>
                <Button type="submit" variant="outline">
                  <RotateCcw className="size-4" /> Restore
                </Button>
              </form>
            ) : (
              <form action={archiveCompanyAction.bind(null, company.id)}>
                <ConfirmSubmit
                  message="Archive this company? Its existing records stay intact."
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Trash2 className="size-4" /> Archive
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />

      {company.archivedAt ? <Badge variant="outline">Archived company</Badge> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contacts</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No contacts yet"
                  description="Add a contact and link them to this company."
                  action={
                    <Button asChild size="sm">
                      <Link href={`/contacts/new?companyId=${company.id}`}>New contact</Link>
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell>
                          <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>{contact.jobTitle ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Deals</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deals for this company yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Deal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Close date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                            {deal.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <DealStatusBadge status={deal.status} />
                        </TableCell>
                        <TableCell>{formatCurrency(deal.amount)}</TableCell>
                        <TableCell>{deal.expectedCloseDate ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tickets</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">No support tickets from this company yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subject</TableHead>
                      <TableHead>Requester</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.tickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell>
                          <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
                            {ticket.subject}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {ticket.requesterFirst} {ticket.requesterLast}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell>
                          <TicketStatusBadge status={ticket.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Owner</p>
                <p className="font-medium">
                  {company.ownerName}
                  {company.ownerStatus === "inactive" ? (
                    <Badge variant="outline" className="ml-2">
                      Inactive
                    </Badge>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Industry</p>
                <p>{company.industry ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Employees</p>
                <p>{company.employeeCount?.toLocaleString() ?? "—"}</p>
              </div>
              {company.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" /> {company.phone}
                </p>
              ) : null}
              {company.website ? (
                <p className="flex items-center gap-2 break-all">
                  <Building2 className="size-3.5 text-muted-foreground" /> {company.website}
                </p>
              ) : null}
              {company.addressLine1 ? (
                <p className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-3.5 text-muted-foreground" />
                  <span>
                    {company.addressLine1}
                    {company.addressLine2 ? <br /> : null}
                    {company.addressLine2}
                    <br />
                    {[company.city, company.region, company.postalCode].filter(Boolean).join(", ")}
                    {company.country ? <br /> : null}
                    {company.country}
                  </span>
                </p>
              ) : null}
              <TagList tags={company.tagNames} />
              {company.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{company.description}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>At a glance</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.contacts.length}</p>
                <p className="text-xs text-muted-foreground">Contacts</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.deals.length}</p>
                <p className="text-xs text-muted-foreground">Deals</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.tickets.length}</p>
                <p className="text-xs text-muted-foreground">Tickets</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{ companyId: company.id }}
        returnTo={`/companies/${company.id}`}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
