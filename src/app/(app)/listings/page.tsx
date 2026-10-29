/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Building2, Home, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowEditLink } from "@/components/ui/row-edit-link";
import { LocalTime } from "@/components/ui/local-time";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";
import { ListingStatusBadge, ListingTransactionBadge } from "@/components/listings/listing-badges";
import { ListingTabs } from "@/components/listings/listing-tabs";
import { featureMessageKey } from "@/components/listings/feature-catalog";
import { buildHref, getParam } from "@/lib/search-params";
import { LISTING_FEATURE_GROUPS } from "@/lib/listing-features";
import { listingListParamsSchema, PROPERTY_TYPES } from "@/lib/validation/listing";
import { getListing, listListings } from "@/lib/services/listings";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { listingPhotoPublicPath } from "@/lib/validation/listing-photo";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const t = await getListingsTranslator();
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const { timeZone } = await getWorkspaceDefaults();

  const rawCurrency = (getParam(raw, "currency") ?? "").trim().toUpperCase();
  const rawMinPrice = getParam(raw, "minPrice");
  const rawMaxPrice = getParam(raw, "maxPrice");
  const rawSort = getParam(raw, "sort");
  const currencyMissing =
    (Boolean(rawMinPrice) ||
      Boolean(rawMaxPrice) ||
      rawSort === "price_asc" ||
      rawSort === "price_desc") &&
    !rawCurrency;

  const parsed = listingListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    transaction: getParam(raw, "transaction") || undefined,
    status: getParam(raw, "status") || "active",
    propertyType: getParam(raw, "propertyType") || undefined,
    city: getParam(raw, "city") || undefined,
    bedrooms: getParam(raw, "bedrooms") || undefined,
    minPrice: currencyMissing ? undefined : rawMinPrice || undefined,
    maxPrice: currencyMissing ? undefined : rawMaxPrice || undefined,
    currency: rawCurrency || undefined,
    features: getParam(raw, "features") || undefined,
    sort: currencyMissing ? "updated" : rawSort || "updated",
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success
    ? parsed.data
    : {
        q: getParam(raw, "q") ?? "",
        status: "active" as const,
        transaction: undefined,
        propertyType: undefined,
        city: undefined,
        bedrooms: undefined,
        minPrice: undefined,
        maxPrice: undefined,
        currency: undefined,
        features: [] as string[],
        sort: "updated" as const,
        page: 1,
        pageSize: 20,
      };

  const data = await listListings(params);
  const detailRows = await Promise.all(
    data.items.map((item) => getListing(item.id).then((detail) => detail?.photos[0] ?? null)),
  );
  const photoByListing = new Map(
    data.items.map((item, index) => [item.id, detailRows[index] ?? null]),
  );

  const hasFilters =
    Boolean(params.q) ||
    Boolean(params.transaction) ||
    Boolean(params.propertyType) ||
    Boolean(params.city) ||
    params.bedrooms !== undefined ||
    params.minPrice !== undefined ||
    params.maxPrice !== undefined ||
    Boolean(params.currency) ||
    params.features.length > 0 ||
    params.status !== "active";

  const featureOptions = LISTING_FEATURE_GROUPS.flatMap((group) =>
    group.features.map((feature) => ({
      value: `${group.id}.${feature.key}`,
      label: `${t(featureMessageKey(group.labelKey))} · ${t(
        featureMessageKey(feature.labelKey),
      )}`,
    })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/listings/dashboard">
                <Building2 className="size-4" /> {t("overview")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/listings/new">
                <Plus className="size-4" /> {t("newListing")}
              </Link>
            </Button>
          </>
        }
      />

      <ListingTabs active="inventory" />

      <Card>
        <CardContent className="space-y-3 pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <Input
              name="q"
              defaultValue={params.q}
              placeholder={t("filters.searchPlaceholder")}
              aria-label={t("filters.search")}
            />
            <select
              name="transaction"
              defaultValue={params.transaction ?? ""}
              aria-label={t("transaction")}
              className={selectClass}
            >
              <option value="">{t("filters.allTransactions")}</option>
              <option value="sale">{t("enums.transaction.sale")}</option>
              <option value="rent">{t("enums.transaction.rent")}</option>
            </select>
            <select
              name="status"
              defaultValue={params.status}
              aria-label={tCommon("filterByStatus")}
              className={selectClass}
            >
              <option value="active">{t("enums.status.active")}</option>
              <option value="inactive">{t("enums.status.inactive")}</option>
              <option value="all">{tCommon("all")}</option>
            </select>
            <select
              name="propertyType"
              defaultValue={params.propertyType ?? ""}
              aria-label={t("propertyType")}
              className={selectClass}
            >
              <option value="">{t("filters.allPropertyTypes")}</option>
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`enums.propertyType.${type}`)}
                </option>
              ))}
            </select>
            <Input
              name="city"
              defaultValue={params.city ?? ""}
              placeholder={t("filters.cityPlaceholder")}
              aria-label={t("city")}
            />
            <Input
              name="bedrooms"
              type="number"
              min={0}
              step={1}
              defaultValue={params.bedrooms ?? ""}
              placeholder={t("filters.bedroomsPlaceholder")}
              aria-label={t("bedrooms")}
            />
            <Input
              name="minPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={params.minPrice ?? ""}
              placeholder={t("filters.minPrice")}
              aria-label={t("filters.minPrice")}
            />
            <Input
              name="maxPrice"
              type="number"
              min={0}
              step="0.01"
              defaultValue={params.maxPrice ?? ""}
              placeholder={t("filters.maxPrice")}
              aria-label={t("filters.maxPrice")}
            />
            <Input
              name="currency"
              defaultValue={params.currency ?? rawCurrency}
              maxLength={3}
              placeholder={t("filters.currencyPlaceholder")}
              aria-label={t("currency")}
              className="uppercase"
            />
            <Input
              name="features"
              defaultValue={params.features.join(",")}
              placeholder={t("filters.featuresPlaceholder")}
              aria-label={t("featuresLabel")}
              list="listing-feature-options"
            />
            <datalist id="listing-feature-options">
              {featureOptions.map((feature) => (
                <option key={feature.value} value={feature.value}>
                  {feature.label}
                </option>
              ))}
            </datalist>
            <div className="flex gap-2">
              <select
                name="sort"
                defaultValue={params.sort}
                aria-label={t("filters.sort")}
                className={`${selectClass} min-w-0 flex-1`}
              >
                <option value="updated">{t("filters.sortUpdated")}</option>
                <option value="listed_at">{t("filters.sortListedAt")}</option>
                <option value="price_asc">{t("filters.sortPriceAsc")}</option>
                <option value="price_desc">{t("filters.sortPriceDesc")}</option>
              </select>
              <Button type="submit" variant="secondary">
                {tCommon("filter")}
              </Button>
            </div>
          </form>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>{t("filters.featuresHint")}</p>
            <p>{t("filters.priceCurrencyHint")}</p>
            <Link href="/listings" className="font-medium text-primary hover:underline">
              {t("filters.clear")}
            </Link>
          </div>
          {currencyMissing ? (
            <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
              {t("filters.currencyRequired")}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Home}
          title={hasFilters ? t("listingsNoMatchTitle") : t("listingsEmptyTitle")}
          description={
            hasFilters ? tCommon("tryClearingFilters") : t("listingsEmptyDescription")
          }
          action={
            <Button asChild>
              <Link href="/listings/new">{t("newListing")}</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("listing")}</TableHead>
                <TableHead>{t("transaction")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("price")}</TableHead>
                <TableHead>{t("commission")}</TableHead>
                <TableHead>{t("seller")}</TableHead>
                <TableHead>{t("agent")}</TableHead>
                <TableHead>{tCommon("updated")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{tCommon("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((listing) => {
                const photo = photoByListing.get(listing.id);
                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {photo ? (
                          <img
                            src={listingPhotoPublicPath(photo.storageKey)}
                            alt={photo.alt ?? listing.title}
                            width={64}
                            height={48}
                            loading="lazy"
                            className="h-12 w-16 rounded-md border object-cover"
                          />
                        ) : (
                          <span className="flex h-12 w-16 items-center justify-center rounded-md border bg-muted text-muted-foreground">
                            <Home className="size-4" />
                          </span>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/listings/${listing.id}`}
                            className="font-medium hover:underline"
                          >
                            {listing.title}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {listing.reference}
                            {listing.city ? ` · ${listing.city}` : ""}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <ListingTransactionBadge transaction={listing.transaction} />
                    </TableCell>
                    <TableCell>
                      <ListingStatusBadge status={listing.status} />
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(listing.price, locale, listing.currency)}
                      </span>
                      {listing.transaction === "rent" ? (
                        <span className="text-xs text-muted-foreground"> {t("perMonth")}</span>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(listing.commissionAmount, locale, listing.currency)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/contacts/${listing.sellerContactId}`}
                        className="hover:underline"
                      >
                        {listing.sellerName}
                      </Link>
                      {listing.sellerArchivedAt ? (
                        <Badge variant="outline" className="ml-2">
                          {tCommon("archived")}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {listing.ownerName}
                      {listing.ownerStatus === "inactive" ? (
                        <Badge variant="outline" className="ml-2">
                          {tCommon("inactive")}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <LocalTime
                        value={listing.updatedAt}
                        options={{ dateStyle: "medium" }}
                        timeZone={timeZone}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowEditLink
                        href={`/listings/${listing.id}/edit`}
                        label={tCommon("editFor", { name: listing.title })}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              pageSize={data.pageSize}
              buildHref={(page) => buildHref("/listings", raw, { page: String(page) })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
