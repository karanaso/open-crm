import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Home, MapPin, Pencil, Phone, RotateCcw, Trash2, Users } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn, formatNumber } from "@/lib/utils";
import { formatCurrency } from "@/i18n/format";
import { getCompany, getCompanyRelations } from "@/lib/services/companies";
import { archiveCompanyAction, restoreCompanyAction } from "@/actions/companies";

type Translator = (key: string, values?: Record<string, string | number>) => string;

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
  const tSales = (await getTranslations("sales")) as unknown as Translator;
  const tSupport = await getTranslations("support");
  const tListings = (await getTranslations("listings")) as unknown as Translator;
  const tNav = (await getTranslations("nav")) as unknown as Translator;
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
                          <Link
                            href={`/contacts/${contact.id}`}
                            className="font-medium hover:underline"
                          >
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
              <CardTitle>{tNav("listings")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.listings.length === 0 ? (
                <EmptyState
                  icon={Home}
                  title={tListings("listingsEmptyTitle")}
                  description={tListings("listingsEmptyDescription")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tListings("reference")}</TableHead>
                      <TableHead>{tCommon("name")}</TableHead>
                      <TableHead>{tListings("transaction")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tListings("price")}</TableHead>
                      <TableHead>{tListings("seller")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.listings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <Link
                            href={`/listings/${listing.id}`}
                            className="font-medium hover:underline"
                          >
                            {listing.reference}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link href={`/listings/${listing.id}`} className="hover:underline">
                            {listing.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {tListings(`enums.transaction.${listing.transaction}`)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={listing.status === "active" ? "success" : "outline"}>
                            {tListings(`enums.status.${listing.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(Number(listing.price), locale, listing.currency)}
                        </TableCell>
                        <TableCell>
                          <span className="flex flex-wrap items-center gap-2">
                            <Link
                              href={`/contacts/${listing.sellerContactId}`}
                              className="hover:underline"
                            >
                              {listing.sellerFirstName} {listing.sellerLastName}
                            </Link>
                            {listing.sellerArchivedAt ? (
                              <Badge variant="outline">{tCommon("archived")}</Badge>
                            ) : null}
                          </span>
                        </TableCell>
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
                <p className="text-muted-foreground text-sm">{t("companyDealsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tSales("deal")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tSales("commission")}</TableHead>
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
                        <TableCell>
                          {formatCurrency(Number(deal.amount), locale, deal.currency)}
                        </TableCell>
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
                <p className="text-muted-foreground text-sm">{t("companyTicketsEmpty")}</p>
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
                          <Link
                            href={`/tickets/${ticket.id}`}
                            className="font-medium hover:underline"
                          >
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
                  <Phone className="text-muted-foreground size-3.5" /> {company.phone}
                </p>
              ) : null}
              {company.website ? (
                <p className="flex items-center gap-2 break-all">
                  <Building2 className="text-muted-foreground size-3.5" /> {company.website}
                </p>
              ) : null}
              {company.addressLine1 ? (
                <p className="flex items-start gap-2">
                  <MapPin className="text-muted-foreground mt-0.5 size-3.5" />
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
                <p className="text-muted-foreground whitespace-pre-wrap">{company.description}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("atAGlance")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.contacts.length}</p>
                <p className="text-muted-foreground text-xs">{t("contacts")}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.listings.length}</p>
                <p className="text-muted-foreground text-xs">{tNav("listings")}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.deals.length}</p>
                <p className="text-muted-foreground text-xs">{tSales("deals")}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.tickets.length}</p>
                <p className="text-muted-foreground text-xs">{tSupport("tickets")}</p>
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
