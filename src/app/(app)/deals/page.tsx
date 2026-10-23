import Link from "next/link";
import { Handshake, LayoutGrid, List, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DealStatusBadge } from "@/components/ui/badges";
import { DateDisplay } from "@/components/ui/local-time";
import { KanbanBoard } from "@/components/deals/kanban-board";
import { buildHref } from "@/lib/search-params";
import { dealListParamsSchema } from "@/lib/validation/deal";
import { listDeals, getDealsForBoard, getPipelineMetrics } from "@/lib/services/deals";
import { getDefaultPipeline, getPipeline, getPipelineOptions } from "@/lib/services/pipelines";
import { listTeamMembers } from "@/lib/services/users";
import { formatCurrency } from "@/lib/utils";
import { getParam as param } from "@/lib/search-params";

export const dynamic = "force-dynamic";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
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
          title="Deals"
          description="Every opportunity, its stage, owner, and expected close date."
          actions={
            <>
              <Button variant="outline" asChild>
                <Link href={buildHref("/deals", raw, { view: "board" })}>
                  <LayoutGrid className="size-4" /> Board
                </Link>
              </Button>
              <Button asChild>
                <Link href="/deals/new">
                  <Plus className="size-4" /> New deal
                </Link>
              </Button>
            </>
          }
        />
        <Card>
          <CardContent className="pt-5">
            <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <input type="hidden" name="view" value="list" />
              <Input name="q" defaultValue={params.q} placeholder="Search deal or company…" aria-label="Search deals" />
              <select
                name="pipelineId"
                defaultValue={pipelineId ?? ""}
                aria-label="Filter by pipeline"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All pipelines</option>
                {pipelines.map((pipeline) => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
              <select
                name="stageId"
                defaultValue={params.stageId ?? ""}
                aria-label="Filter by stage"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All stages</option>
                {allStages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.pipelineName} · {stage.name}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={params.status ?? ""}
                aria-label="Filter by status"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All statuses</option>
                <option value="open">Open</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
              <select
                name="ownerId"
                defaultValue={params.ownerId ?? ""}
                aria-label="Filter by owner"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">All owners</option>
                {activeMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
              <Input name="closeFrom" type="date" defaultValue={params.closeFrom ?? ""} aria-label="Close date from" />
              <Input name="closeTo" type="date" defaultValue={params.closeTo ?? ""} aria-label="Close date to" />
              <div className="flex gap-2">
                <select
                  name="sort"
                  defaultValue={params.sort}
                  aria-label="Sort deals"
                  className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="updated">Recently updated</option>
                  <option value="amount_desc">Amount: high to low</option>
                  <option value="amount_asc">Amount: low to high</option>
                  <option value="close_date">Close date</option>
                </select>
                <Button type="submit" variant="secondary">
                  Filter
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {data.items.length === 0 ? (
          <EmptyState
            icon={Handshake}
            title="No deals match those filters"
            description="Try clearing a filter or create a new opportunity."
            action={<Button asChild><Link href="/deals/new">New deal</Link></Button>}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Close date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((deal) => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <Link href={`/deals/${deal.id}`} className="font-medium hover:underline">
                        {deal.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{deal.companyName}</p>
                    </TableCell>
                    <TableCell>
                      {deal.stageName}
                      <p className="text-xs text-muted-foreground">{deal.pipelineName}</p>
                    </TableCell>
                    <TableCell>
                      <DealStatusBadge status={deal.status} />
                    </TableCell>
                    <TableCell>{formatCurrency(deal.amount)}</TableCell>
                    <TableCell>
                      {deal.ownerName}
                      {deal.ownerStatus === "inactive" ? (
                        <Badge variant="outline" className="ml-2">Inactive</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <DateDisplay value={deal.expectedCloseDate} />
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
      <EmptyState icon={Handshake} title="No pipeline configured" description="Create a pipeline in settings first." />
    );
  }

  const [boardDeals, metrics] = await Promise.all([
    getDealsForBoard(selectedPipeline.id),
    getPipelineMetrics(selectedPipeline.id),
  ]);

  const openDeals = boardDeals.filter((deal) => deal.status === "open");
  const openValue = openDeals.reduce((sum, deal) => sum + Number(deal.amount), 0);
  const weightedValue = openDeals.reduce((sum, deal) => {
    const stage = metrics.find((item) => item.id === deal.stageId);
    return sum + (Number(deal.amount) * (stage?.probability ?? 0)) / 100;
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deals"
        description="Drag deals between stages or use the move menu on each card."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={buildHref("/deals", raw, { view: "list" })}>
                <List className="size-4" /> List
              </Link>
            </Button>
            <Button asChild>
              <Link href="/deals/new">
                <Plus className="size-4" /> New deal
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
              aria-label="Select pipeline"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                  {pipeline.isDefault ? " (default)" : ""}
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">Switch</Button>
          </form>
          <div className="flex flex-wrap gap-4 text-sm">
            <span><span className="text-muted-foreground">Open:</span> {openDeals.length}</span>
            <span><span className="text-muted-foreground">Value:</span> {formatCurrency(openValue)}</span>
            <span><span className="text-muted-foreground">Weighted:</span> {formatCurrency(weightedValue)}</span>
          </div>
        </CardContent>
      </Card>

      <KanbanBoard
        pipeline={{ id: selectedPipeline.id, name: selectedPipeline.name }}
        stages={selectedPipeline.stages}
        initialDeals={boardDeals.map((deal) => ({
          id: deal.id,
          name: deal.name,
          companyName: deal.companyName,
          amount: deal.amount,
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
