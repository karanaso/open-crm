import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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
import { formatCurrency, cn, formatNumber } from "@/lib/utils";
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
  const t = await getTranslations("directory");
  const tCommon = await getTranslations("common");
  const tSales = await getTranslations("sales");
  const tSupport = await getTranslations("support");
  const locale = await getLocale();

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
                <Pencil className="size-4" /> {tCommon("edit")}
              </Link>
            </Button>
            {company.archivedAt ? (
              <form action={restoreCompanyAction.bind(null, company.id)}>
                <Button type="submit" variant="outline">
                  <RotateCcw className="size-4" /> {tCommon("restore")}
                </Button>
              </form>
            ) : (
              <form action={archiveCompanyAction.bind(null, company.id)}>
                <ConfirmSubmit
                  message={t("archiveCompanyConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Trash2 className="size-4" /> {tCommon("archive")}
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />

      {company.archivedAt ? <Badge variant="outline">{t("archivedCompany")}</Badge> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("contacts")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.contacts.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t("companyContactsEmptyTitle")}
                  description={t("companyContactsEmptyDescription")}
                  action={
                    <Button asChild size="sm">
                      <Link href={`/contacts/new?companyId=${company.id}`}>{t("newContact")}</Link>
                    </Button>
                  }
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("name")}</TableHead>
                      <TableHead>{tCommon("email")}</TableHead>
                      <TableHead>{t("title")}</TableHead>
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
              <CardTitle>{tSales("deals")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("companyDealsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tSales("deal")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tSales("amount")}</TableHead>
                      <TableHead>{tSales("closeDate")}</TableHead>
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
                        <TableCell>{formatCurrency(deal.amount, locale)}</TableCell>
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
              <CardTitle>{tSupport("tickets")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.tickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("companyTicketsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("subject")}</TableHead>
                      <TableHead>{tCommon("requester")}</TableHead>
                      <TableHead>{tCommon("priority")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
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
              <CardTitle>{tCommon("details")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{tCommon("owner")}</p>
                <p className="font-medium">
                  {company.ownerName}
                  {company.ownerStatus === "inactive" ? (
                    <Badge variant="outline" className="ml-2">
                      {tCommon("inactive")}
                    </Badge>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("industry")}</p>
                <p>{company.industry ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("employees")}</p>
                <p>{formatNumber(company.employeeCount, locale)}</p>
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
              <CardTitle>{t("atAGlance")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.contacts.length}</p>
                <p className="text-xs text-muted-foreground">{t("contacts")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.deals.length}</p>
                <p className="text-xs text-muted-foreground">{tSales("deals")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.tickets.length}</p>
                <p className="text-xs text-muted-foreground">{tSupport("tickets")}</p>
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
