import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Handshake, LayoutGrid, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RowEditLink } from "@/components/ui/row-edit-link";
import { DealStatusBadge } from "@/components/ui/badges";
import { DateDisplay } from "@/components/ui/local-time";
import { KanbanBoard } from "@/components/deals/kanban-board";
import { buildHref } from "@/lib/search-params";
import { dealListParamsSchema } from "@/lib/validation/deal";
import { listDeals, getDealsForBoard, getPipelineMetrics } from "@/lib/services/deals";
import { getDefaultPipeline, getPipeline, getPipelineOptions } from "@/lib/services/pipelines";
import { listTeamMembers } from "@/lib/services/users";
import { formatCurrency } from "@/i18n/format";
import type { Locale } from "@/i18n/config";
import { getParam as param } from "@/lib/search-params";

export const dynamic = "force-dynamic";

const FALLBACK_CURRENCIES = ["EUR", "GBP", "USD"];

type SalesTranslator = (key: string, values?: Record<string, string | number>) => string;

function currencyCodes(current?: string) {
  let codes: string[] = FALLBACK_CURRENCIES;
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      codes = [...Intl.supportedValuesOf("currency")].sort();
    } catch {
      codes = FALLBACK_CURRENCIES;
    }
  }
  return current && !codes.includes(current) ? [current, ...codes] : codes;
}

type CurrencyTotal = { currency: string; total: number };

function sumByCurrency(
  stages: Array<Record<"totalValueByCurrency" | "weightedValueByCurrency", CurrencyTotal[]>>,
  key: "totalValueByCurrency" | "weightedValueByCurrency",
) {
  const totals = new Map<string, number>();
  for (const stage of stages) {
    for (const row of stage[key]) {
      totals.set(row.currency, (totals.get(row.currency) ?? 0) + row.total);
    }
  }
  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, total]) => ({ currency, total }));
}

function CurrencyTotals({
  label,
  totals,
  locale,
}: {
  label: string;
  totals: CurrencyTotal[];
  locale: Locale;
}) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>{" "}
      {totals.length === 0
        ? "—"
        : totals.map((total) => formatCurrency(total.total, locale, total.currency)).join(" · ")}
    </div>
  );
}

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const t = (await getTranslations("sales")) as unknown as SalesTranslator;
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const locale = await getLocale();
  const view = param(raw, "view") === "list" ? "list" : "board";
  const pipelineId = param(raw, "pipelineId");
  const pipelines = await getPipelineOptions();
  const selectedPipeline =
    (pipelineId ? await getPipeline(pipelineId) : null) ??
    (await getDefaultPipeline()) ??
    pipelines[0];

  if (view === "list") {
    const parsed = dealListParamsSchema.safeParse({
      q: param(raw, "q") ?? "",
      pipelineId: pipelineId || undefined,
      stageId: param(raw, "stageId") || undefined,
      status: param(raw, "status") || undefined,
      ownerId: param(raw, "ownerId") || undefined,
      currency: param(raw, "currency") || undefined,
      closeFrom: param(raw, "closeFrom") || undefined,
      closeTo: param(raw, "closeTo") || undefined,
      sort: param(raw, "sort") || "updated",
      page: param(raw, "page") || 1,
      pageSize: param(raw, "pageSize") || 20,
    });
    const params = parsed.success
      ? parsed.data
      : {
          q: "",
          sort: "updated" as const,
          page: 1,
          pageSize: 20,
          stageId: undefined,
          ownerId: undefined,
          currency: undefined,
          closeFrom: undefined,
          closeTo: undefined,
        };
    const [data, team] = await Promise.all([listDeals(params), listTeamMembers()]);
    const allStages = pipelines.flatMap((pipeline) =>
      pipeline.stages.map((stage) => ({ ...stage, pipelineName: pipeline.name })),
    );
    const activeMembers = team
      .filter((member) => member.status === "active")
      .map((member) => ({ id: member.id, name: member.name }));

    return (
      <div className="space-y-6">
        <PageHeader
          title={t("deals")}
          description={t("dealsDescription")}
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href={buildHref("/deals", raw, { view: "board" })}>
                  <LayoutGrid className="size-4" /> {t("boardView")}
                </Link>
              </Button>
              <Button asChild>
                <Link href="/deals/new">
                  <Plus className="size-4" /> {t("newDeal")}
                </Link>
              </Button>
            </>
          }
        />
        <Card>
          <CardContent className="pt-5">
            <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="view" value="list" />
              <Input
                name="q"
                defaultValue={params.q}
                placeholder={t("searchDealsPlaceholder")}
                aria-label={t("searchDeals")}
              />
              <select
                name="pipelineId"
                defaultValue={pipelineId ?? ""}
                aria-label={t("filterByPipeline")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{t("allPipelines")}</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
              <select
                name="stageId"
                defaultValue={params.stageId ?? ""}
                aria-label={t("filterByStage")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{t("allStages")}</option>
                {allStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.pipelineName} · {stage.name}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                aria-label={tCommon("filterByStatus")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{t("allStatuses")}</option>
                <option value="open">{tEnums("dealStatus.open")}</option>
                <option value="won">{tEnums("dealStatus.won")}</option>
                <option value="lost">{tEnums("dealStatus.lost")}</option>
              </select>
              <select
                name="ownerId"
                defaultValue={params.ownerId ?? ""}
                aria-label={tCommon("filterByOwner")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{tCommon("allOwners")}</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <select
                name="currency"
                defaultValue={params.currency ?? ""}
                aria-label={t("filterByCurrency")}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm"
              >
                <option value="">{t("allCurrencies")}</option>
                {currencyCodes(params.currency).map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
              <Input
                name="closeFrom"
                type="date"
                defaultValue={params.closeFrom ?? ""}
                aria-label={t("closeDateFrom")}
              />
              <Input
                name="closeTo"
                type="date"
                defaultValue={params.closeTo ?? ""}
                aria-label={t("closeDateTo")}
              />
              <div className="flex gap-2">
                <select
                  name="sort"
                  defaultValue={params.sort}
                  aria-label={t("sortDeals")}
                  className="border-input bg-background h-9 min-w-0 flex-1 rounded-md border px-3 text-sm"
                >
                  <option value="updated">{t("sortRecentlyUpdated")}</option>
                  <option value="amount_desc">{t("sortCommissionDesc")}</option>
                  <option value="amount_asc">{t("sortCommissionAsc")}</option>
                  <option value="close_date">{t("sortCloseDate")}</option>
                </select>
                <Button type="submit" variant="secondary">
                  {tCommon("filter")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {data.items.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title={t("dealsNoMatchTitle")}
            description={t("dealsEmptyDescription")}
            action={
              <Button asChild>
                <Link href="/deals/new">{t("newDeal")}</Link>
              </Button>
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("deal")}</TableHead>
                  <TableHead>{t("stage")}</TableHead>
                  <TableHead>{tCommon("status")}</TableHead>
                  <TableHead>{t("commission")}</TableHead>
                  <TableHead>{tCommon("owner")}</TableHead>
                  <TableHead>{t("closeDate")}</TableHead>
                  <TableHead className="w-12 text-right">
                    <span className="sr-only">{tCommon("actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                        {deal.name}
                      </Link>
                      <p className="text-muted-foreground text-xs">{deal.contactName}</p>
                      {deal.companyName ? (
                        <p className="text-muted-foreground text-xs">{deal.companyName}</p>
                      ) : null}
                      {deal.listingId && deal.listingReference ? (
                        <Link
                          href={`/listings/${deal.listingId}`}
                          className="text-muted-foreground text-xs hover:underline"
                        >
                          {deal.listingReference}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      {deal.stageName}
                      <p className="text-muted-foreground text-xs">{deal.pipelineName}</p>
                    </TableCell>
                    <TableCell>
                      <DealStatusBadge status={deal.status} />
                    </TableCell>
                    <TableCell>
                      {formatCurrency(Number(deal.amount), locale, deal.currency)}
                    </TableCell>
                    <TableCell>
                      {deal.ownerName}
                      {deal.ownerStatus === "inactive" ? (
                        <Badge variant="outline" className="ml-2">
                          {tCommon("inactive")}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <DateDisplay value={deal.expectedCloseDate} />
                    </TableCell>
                    <TableCell className="text-right">
                      <RowEditLink
                        href={`/deals/${deal.id}/edit`}
                        label={tCommon("editFor", { name: deal.name })}
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
                buildHref={(page) => buildHref("/deals", raw, { page: String(page), view: "list" })}
              />
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (!selectedPipeline) {
    return (
      <EmptyState
        icon={Handshake}
        title={t("noPipelineTitle")}
        description={t("noPipelineDescription")}
      />
    );
  }

  const [boardDeals, metrics] = await Promise.all([
    getDealsForBoard(selectedPipeline.id),
    getPipelineMetrics(selectedPipeline.id),
  ]);

  const openDeals = boardDeals.filter((deal) => deal.status === "open");
  const openTotals = sumByCurrency(metrics, "totalValueByCurrency");
  const weightedTotals = sumByCurrency(metrics, "weightedValueByCurrency");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("deals")}
        description={t("boardDescription")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={buildHref("/deals", raw, { view: "list" })}>
                <List className="size-4" /> {t("listView")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/deals/new">
                <Plus className="size-4" /> {t("newDeal")}
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 pt-5">
          <form method="get" className="flex items-center gap-2">
            <input type="hidden" name="view" value="board" />
            <select
              name="pipelineId"
              defaultValue={selectedPipeline.id}
              aria-label={t("selectPipeline")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.isDefault ? t("defaultSuffix") : ""}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              {t("switchPipeline")}
            </Button>
          </form>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              <span className="text-muted-foreground">{t("openDeals")}</span> {openDeals.length}
            </span>
            <CurrencyTotals label={t("openCommission")} totals={openTotals} locale={locale} />
            <CurrencyTotals
              label={t("weightedCommission")}
              totals={weightedTotals}
              locale={locale}
            />
          </div>
        </CardContent>
      </Card>

      <KanbanBoard
        pipeline={{ id: selectedPipeline.id, name: selectedPipeline.name }}
        stages={selectedPipeline.stages}
        metrics={metrics.map((stage) => ({
          id: stage.id,
          dealCount: stage.dealCount,
          totalValueByCurrency: stage.totalValueByCurrency,
          weightedValueByCurrency: stage.weightedValueByCurrency,
        }))}
        initialDeals={boardDeals.map((deal) => ({
          id: deal.id,
          name: deal.name,
          contactName: deal.contactName,
          companyName: deal.companyName,
          listingReference: deal.listingReference,
          amount: deal.amount,
          currency: deal.currency,
          ownerName: deal.ownerName,
          expectedCloseDate: deal.expectedCloseDate,
          stageId: deal.stageId,
          status: deal.status,
          updatedAt: deal.updatedAt.toISOString(),
        }))}
      />
    </div>
  );
}
