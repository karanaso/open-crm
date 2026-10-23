import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  CalendarDays,
  MapPin,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { DealStatusBadge } from "@/components/ui/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListingFeatures } from "@/components/listings/listing-features";
import { ListingPhotoManager } from "@/components/listings/listing-photo-manager";
import { ListingStatusBadge, ListingTransactionBadge } from "@/components/listings/listing-badges";
import { ListingViewings } from "@/components/listings/listing-viewings";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";
import { RecordEngagement } from "@/components/timeline/record-engagement";
import { deactivateListingAction, restoreListingAction } from "@/actions/listings";
import { requireUser } from "@/lib/auth/guards";
import { formatDate, formatDateTime } from "@/i18n/format";
import { getParam } from "@/lib/search-params";
import { getListing } from "@/lib/services/listings";
import { listListingViewings } from "@/lib/services/listing-viewings";
import { getTimeline } from "@/lib/services/timeline";
import { getTasksForRecord } from "@/lib/services/tasks";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

function addressLines(listing: {
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
}) {
  return [
    listing.addressLine1,
    [listing.postalCode, listing.city].filter(Boolean).join(" "),
    listing.region,
    listing.country,
  ].filter((line): line is string => Boolean(line && line.trim()));
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

export default async function ListingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const listing = await getListing(id);
  if (!listing) notFound();

  const currentUser = await requireUser();
  const t = await getListingsTranslator();
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const error = getParam(raw, "error");
  const filterType = getParam(raw, "activityType");
  const timelinePage = Math.max(1, Number(getParam(raw, "timelinePage") ?? 1) || 1);
  const returnTo = `/listings/${listing.id}`;

  const [viewings, timeline, tasks, team, contacts, defaults] = await Promise.all([
    listListingViewings(listing.id),
    getTimeline({ listingId: listing.id }, { type: filterType, page: timelinePage }),
    getTasksForRecord({ listingId: listing.id }),
    listTeamMembers(),
    getContactPickerOptions(),
    getWorkspaceDefaults(),
  ]);

  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const lines = addressLines(listing);
  const address = lines.join(", ");

  return (
    <div className="space-y-6">
      <PageHeader
        title={listing.title}
        description={address || listing.reference}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/listings/${listing.id}/edit`}>
                <Pencil className="size-4" /> {tCommon("edit")}
              </Link>
            </Button>
            {listing.status === "active" ? (
              <form action={deactivateListingAction.bind(null, listing.id)}>
                <ConfirmSubmit
                  message={t("deactivateConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Trash2 className="size-4" /> {t("deactivate")}
                </ConfirmSubmit>
              </form>
            ) : (
              <form action={restoreListingAction.bind(null, listing.id)}>
                <ConfirmSubmit
                  message={t("restoreConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <RotateCcw className="size-4" /> {tCommon("restore")}
                </ConfirmSubmit>
              </form>
            )}
          </>
        }
      />

      <PageError code={error} />

      <div className="flex flex-wrap items-center gap-2">
        <ListingTransactionBadge transaction={listing.transaction} />
        <ListingStatusBadge status={listing.status} />
        {listing.status === "inactive" ? (
          <Badge variant="warning">{t("inactiveListing")}</Badge>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("listingOverview")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">{t("price")}</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(listing.price, locale, listing.currency)}
                    {listing.transaction === "rent" ? (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        {t("perMonth")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t("commissionAmount")}</p>
                  <p className="text-2xl font-semibold">
                    {formatCurrency(listing.commissionAmount, locale, listing.currency)}
                  </p>
                </div>
              </div>

              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Fact
                  label={t("propertyType")}
                  value={t(`enums.propertyType.${listing.propertyType}`)}
                />
                <Fact
                  label={t("bedrooms")}
                  value={listing.bedrooms === null ? "—" : formatNumber(listing.bedrooms, locale)}
                />
                <Fact label={t("bathrooms")} value={listing.bathrooms ?? "—"} />
                <Fact
                  label={t("sizeSqm")}
                  value={
                    listing.sizeSqm === null
                      ? "—"
                      : `${formatNumber(listing.sizeSqm, locale)} m²`
                  }
                />
                <Fact
                  label={t("lotSqm")}
                  value={
                    listing.lotSqm === null
                      ? "—"
                      : `${formatNumber(listing.lotSqm, locale)} m²`
                  }
                />
                <Fact
                  label={t("yearBuilt")}
                  value={listing.yearBuilt === null ? "—" : String(listing.yearBuilt)}
                />
                <Fact
                  label={t("floors")}
                  value={listing.floors === null ? "—" : String(listing.floors)}
                />
                <Fact
                  label={t("parking")}
                  value={listing.parking === null ? "—" : String(listing.parking)}
                />
                <Fact
                  label={t("energyClass")}
                  value={
                    listing.energyClass
                      ? t(`enums.energyClass.${listing.energyClass}`)
                      : "—"
                  }
                />
                <Fact label={t("reference")} value={listing.reference} />
                <Fact
                  label={t("listedAt")}
                  value={formatDate(listing.listedAt, locale, defaults.timeZone)}
                />
                <Fact
                  label={tCommon("updated")}
                  value={formatDateTime(listing.updatedAt, locale, defaults.timeZone)}
                />
                {listing.deactivatedAt ? (
                  <Fact
                    label={t("deactivatedAt")}
                    value={formatDateTime(listing.deactivatedAt, locale, defaults.timeZone)}
                  />
                ) : null}
              </dl>

              <div className="grid gap-4 border-t pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-muted-foreground">{t("address")}</p>
                  {lines.length > 0 ? (
                    <address className="flex items-start gap-2 font-medium not-italic">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      <span>
                        {lines.map((line) => (
                          <span key={line} className="block">
                            {line}
                          </span>
                        ))}
                      </span>
                    </address>
                  ) : (
                    <p>—</p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground">{t("seller")}</p>
                  <Link
                    href={`/contacts/${listing.sellerContactId}`}
                    className="flex flex-wrap items-center gap-2 font-medium hover:underline"
                  >
                    <UserRound className="size-4" /> {listing.sellerName}
                    {listing.sellerArchivedAt ? (
                      <Badge variant="outline">{tCommon("archived")}</Badge>
                    ) : null}
                  </Link>
                  <p className="text-xs text-muted-foreground">{listing.sellerEmail}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t("agent")}</p>
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    <UserRound className="size-4" /> {listing.ownerName}
                    {listing.ownerStatus === "inactive" ? (
                      <Badge variant="outline">{tCommon("inactive")}</Badge>
                    ) : null}
                  </p>
                </div>
                {listing.description ? (
                  <div className="sm:col-span-2">
                    <p className="text-muted-foreground">{tCommon("description")}</p>
                    <p className="whitespace-pre-wrap">{listing.description}</p>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("photos.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ListingPhotoManager listingId={listing.id} photos={listing.photos} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("featuresLabel")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ListingFeatures features={listing.features} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle>{t("linkedDeals")}</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/deals/new?listingId=${listing.id}`}>
                  <Plus className="size-4" /> {t("createDeal")}
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {listing.deals.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noLinkedDeals")}</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("deal")}</TableHead>
                      <TableHead>{t("buyer")}</TableHead>
                      <TableHead>{t("propertyPrice")}</TableHead>
                      <TableHead>{t("commission")}</TableHead>
                      <TableHead>{tCommon("status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {listing.deals.map((deal) => (
                      <TableRow key={deal.id}>
                        <TableCell>
                          <Link
                            href={`/deals/${deal.id}`}
                            className="font-medium hover:underline"
                          >
                            {deal.name}
                          </Link>
                        </TableCell>
                        <TableCell>{deal.contactName ?? "—"}</TableCell>
                        <TableCell>
                          {deal.propertyPrice === null
                            ? "—"
                            : formatCurrency(deal.propertyPrice, locale, deal.currency)}
                        </TableCell>
                        <TableCell>
                          {formatCurrency(deal.amount, locale, deal.currency)}
                        </TableCell>
                        <TableCell>
                          <DealStatusBadge status={deal.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <ListingViewings
            listingId={listing.id}
            returnTo={returnTo}
            viewings={viewings}
            contacts={contacts.map((contact) => ({
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
            }))}
            team={team}
            timeZone={defaults.timeZone}
          />
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <CalendarDays className="size-4" /> {t("quickFacts")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">{t("reference")}</p>
                <p className="font-medium">{listing.reference}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("photos.title")}</p>
                <p className="font-medium">
                  {t("photos.shortCount", { count: listing.photos.length })}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("viewings.title")}</p>
                <p className="font-medium">
                  {t("viewings.upcomingCount", { count: viewings.upcoming.length })}
                </p>
              </div>
              {listing.description ? (
                <div>
                  <p className="text-muted-foreground">{tCommon("description")}</p>
                  <p className="whitespace-pre-wrap">{listing.description}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <RecordEngagement
        currentUser={currentUser}
        links={{ listingId: listing.id }}
        returnTo={returnTo}
        timeline={timeline}
        filterType={filterType}
        timelinePage={timelinePage}
        tasks={tasks}
        assignees={assignees}
      />
    </div>
  );
}
