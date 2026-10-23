import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Building2,
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
import { DealStatusBadge, PriorityBadge, TagList, TicketStatusBadge } from "@/components/ui/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn, formatCurrency } from "@/lib/utils";
import { getContact, getContactRelations } from "@/lib/services/contacts";
import { archiveContactAction, restoreContactAction } from "@/actions/contacts";

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
  const tSales = await getTranslations("sales");
  const tSupport = await getTranslations("support");
  const tMarketing = await getTranslations("marketing");
  const tEnums = await getTranslations("enums");
  const locale = await getLocale();

  const [relations, timeline, tasks, team] = await Promise.all([
    getContactRelations(id),
    getTimeline({ contactId: id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ contactId: id }),
    listTeamMembers(),
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
              <CardTitle>{tSales("deals")}</CardTitle>
            </CardHeader>
            <CardContent>
              {relations.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("contactDealsEmpty")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tSales("deal")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                      <TableHead>{tSales("amount")}</TableHead>
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
                <p className="text-sm text-muted-foreground">{t("contactTicketsEmpty")}</p>
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
                          <Link href={`/tickets/${ticket.id}`} className="font-medium hover:underline">
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
                <p className="text-sm text-muted-foreground">{t("contactCampaignsEmpty")}</p>
              ) : (
                <ul className="space-y-2">
                  {relations.campaigns.map((campaign) => (
                    <li
                      key={campaign.campaignId}
                      className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm"
                    >
                      <Link href={`/campaigns/${campaign.campaignId}`} className="font-medium hover:underline">
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
                  <Link href={`/companies/${contact.companyId}`} className="flex items-center gap-2 font-medium hover:underline">
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
                <Mail className="size-3.5 text-muted-foreground" /> {contact.email}
              </p>
              {contact.phone ? (
                <p className="flex items-center gap-2">
                  <Phone className="size-3.5 text-muted-foreground" /> {contact.phone}
                </p>
              ) : null}
              <TagList tags={contact.tagNames} />
              {contact.notes ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{contact.notes}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("atAGlance")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.deals.length}</p>
                <p className="text-xs text-muted-foreground">{tSales("deals")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.tickets.length}</p>
                <p className="text-xs text-muted-foreground">{tSupport("tickets")}</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-semibold">{relations.campaigns.length}</p>
                <p className="text-xs text-muted-foreground">{tMarketing("campaigns")}</p>
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
