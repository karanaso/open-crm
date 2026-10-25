import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Building2,
  CalendarClock,
  Home,
  Mail,
  Pencil,
  Phone,
  RotateCcw,
  Trash2,
} from "lucide-react";
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
import { LocalTime } from "@/components/ui/local-time";
import { DealStatusBadge, PriorityBadge, TagList, TicketStatusBadge } from "@/components/ui/badges";
import {
  DeliveryStatusBadge,
  OutcomeReasonBadge,
} from "@/components/messaging/badges";
import { ContactEmailOptOut } from "@/components/messaging/contact-email-opt-out";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/i18n/format";
import { getContact, getContactRelations } from "@/lib/services/contacts";
import { getContactMessageHistory } from "@/lib/services/messaging";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { archiveContactAction, restoreContactAction } from "@/actions/contacts";
import { setContactEmailOptOutAction } from "@/actions/messaging";

type Translator = (key: string, values?: Record<string, string | number>) => string;

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const contact = await getContact(id);
  if (!contact) notFound();

  const currentUser = await requireUser();
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);
  const t = await getTranslations("directory");
  const tCommon = await getTranslations("common");
  const tSales = (await getTranslations("sales")) as unknown as Translator;
  const tSupport = await getTranslations("support");
  const tMarketing = await getTranslations("marketing");
  const tEnums = await getTranslations("enums");
  const tListings = (await getTranslations("listings")) as unknown as Translator;
  const tMessaging = await getTranslations("messaging");
  const locale = await getLocale();

  const [relations, timeline, tasks, team, workspace, messageHistory] = await Promise.all([
    getContactRelations(id),
    getTimeline({ contactId: id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ contactId: id }),
    listTeamMembers(),
    getWorkspaceDefaults(),
    getContactMessageHistory(id),
  ]);

  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${contact.firstName} ${contact.lastName}`}
        description={contact.jobTitle ?? undefined}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/contacts/${contact.id}/edit`}>
                <Pencil className="size-4" /> {tCommon("edit")}
              </Link>
            </Button>
            {contact.archivedAt ? (
              <form action={restoreContactAction.bind(null, contact.id)}>
                <Button type="submit" variant="outline">
                  <RotateCcw className="size-4" /> {tCommon("restore")}
                </Button>
              </form>
            ) : (
              <form action={archiveContactAction.bind(null, contact.id)}>
                <ConfirmSubmit
                  message={t("archiveContactConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Trash2 className="size-4" /> {tCommon("archive")}
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />

      {contact.archivedAt ? <Badge variant="outline">{t("archivedContact")}</Badge> : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{tListings("sellingListings")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.sellingListings.length === 0 ? (
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
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.sellingListings.map((listing) => (
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tListings("buyingDeals")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.deals.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("contactDealsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tSales("deal")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tSales("commission")}</TableHead>
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
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tListings("viewings.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.viewings.length === 0 ? (
                <EmptyState
                  icon={CalendarClock}
                  title={tListings("viewings.noViewings")}
                  description={tListings("viewings.noViewingsDescription")}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tListings("listing")}</TableHead>
                      <TableHead>{tListings("viewings.dateTime")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tListings("viewings.agent")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {relations.viewings.map((viewing) => (
                      <TableRow key={viewing.id}>
                        <TableCell>
                          <Link
                            href={`/listings/${viewing.listingId}`}
                            className="font-medium hover:underline"
                          >
                            {viewing.listingReference} · {viewing.listingTitle}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <LocalTime value={viewing.scheduledAt} timeZone={workspace.timeZone} />
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {tListings(`enums.viewingStatus.${viewing.status}`)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {viewing.agentName ? (
                            <span className="flex flex-wrap items-center gap-2">
                              {viewing.agentName}
                              {viewing.agentStatus === "inactive" ? (
                                <Badge variant="outline">{tCommon("inactive")}</Badge>
                              ) : null}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">{tCommon("unassigned")}</span>
                          )}
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
              <CardTitle>{tSupport("tickets")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.tickets.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("contactTicketsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("subject")}</TableHead>
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

          <Card>
            <CardHeader>
              <CardTitle>{tMarketing("campaigns")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.campaigns.length === 0 ? (
                <p className="text-muted-foreground text-sm">{t("contactCampaignsEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {relations.campaigns.map((campaign) => (
                    <li
                      key={campaign.campaignId}
                      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <Link
                        href={`/campaigns/${campaign.campaignId}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.campaignName}
                      </Link>
                      <Badge variant="outline">
                        {tEnums(`recipientStatus.${campaign.recipientStatus}`)}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{tMessaging("contactMessages")}</CardTitle>
            </CardHeader>
            <CardContent>
              {messageHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  {tMessaging("contactMessagesEmpty")}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tCommon("subject")}</TableHead>
                      <TableHead>{tMessaging("sentAt")}</TableHead>
                      <TableHead>{tMessaging("outcome")}</TableHead>
                      <TableHead>{tCommon("reason")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageHistory.map((entry) => (
                      <TableRow key={entry.messageId}>
                        <TableCell>
                          <Link
                            href={`/messages/${entry.messageId}`}
                            className="font-medium hover:underline"
                          >
                            {entry.subject}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <LocalTime value={entry.sentAt ?? entry.createdAt} />
                        </TableCell>
                        <TableCell>
                          <DeliveryStatusBadge status={entry.status} />
                        </TableCell>
                        <TableCell>
                          <OutcomeReasonBadge reason={entry.reason} />
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
              <CardTitle>{t("contactDetails")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{tCommon("company")}</p>
                {contact.companyId ? (
                  <Link
                    href={`/companies/${contact.companyId}`}
                    className="flex items-center gap-2 font-medium hover:underline"
                  >
                    <Building2 className="size-3.5" /> {contact.companyName}
                    {contact.companyArchivedAt ? (
                      <Badge variant="outline">{tCommon("archived")}</Badge>
                    ) : null}
                  </Link>
                ) : (
                  <p>—</p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">{tCommon("owner")}</p>
                <p className="font-medium">
                  {contact.ownerName}
                  {contact.ownerStatus === "inactive" ? (
                    <Badge variant="outline" className="ml-2">
                      {tCommon("inactive")}
                    </Badge>
                  ) : null}
                </p>
              </div>
              <p className="flex items-center gap-2 break-all">
                <Mail className="text-muted-foreground size-3.5" /> {contact.email}
              </p>
              <ContactEmailOptOut
                action={setContactEmailOptOutAction.bind(
                  null,
                  contact.id,
                  `/contacts/${contact.id}`,
                )}
                optedOut={Boolean(contact.emailOptOutAt)}
              />
              {contact.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="text-muted-foreground size-3.5" /> {contact.phone}
                </p>
              ) : null}
              <TagList tags={contact.tagNames} />
              {contact.notes ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{contact.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("atAGlance")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.deals.length}</p>
                <p className="text-muted-foreground text-xs">{tSales("deals")}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.tickets.length}</p>
                <p className="text-muted-foreground text-xs">{tSupport("tickets")}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xl font-semibold">{relations.campaigns.length}</p>
                <p className="text-muted-foreground text-xs">{tMarketing("campaigns")}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{ contactId: contact.id, companyId: contact.companyId }}
        returnTo={`/contacts/${contact.id}`}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
