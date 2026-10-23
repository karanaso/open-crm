import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CampaignStatusBadge } from "@/components/ui/badges";
import { DateDisplay } from "@/components/ui/local-time";
import { buildHref, getParam } from "@/lib/search-params";
import { campaignListParamsSchema } from "@/lib/validation/marketing";
import { listCampaigns } from "@/lib/services/marketing";
import { listTeamMembers } from "@/lib/services/users";
import { titleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = campaignListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    status: getParam(raw, "status") || undefined,
    channel: getParam(raw, "channel") || undefined,
    ownerId: getParam(raw, "ownerId") || undefined,
    sort: getParam(raw, "sort") || "updated",
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success ? parsed.data : { q: "", sort: "updated" as const, page: 1, pageSize: 20 };
  const [data, team] = await Promise.all([listCampaigns(params), listTeamMembers()]);
  const activeMembers = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaigns"
        description="Plan outreach by segment and track responses manually. Sending happens in your external tools."
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" /> New campaign
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input name="q" defaultValue={params.q} placeholder="Search campaign name…" aria-label="Search campaigns" />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
            <select
              name="channel"
              defaultValue={params.channel ?? ""}
              aria-label="Filter by channel"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All channels</option>
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="event">Event</option>
              <option value="social">Social</option>
              <option value="other">Other</option>
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
            <div className="flex gap-2">
              <select
                name="sort"
                defaultValue={params.sort}
                aria-label="Sort campaigns"
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="updated">Recently updated</option>
                <option value="name">Name</option>
                <option value="start_date">Start date</option>
              </select>
              <Button type="submit" variant="secondary">Filter</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns match those filters"
          description="Create a campaign from a contact segment to get started."
          action={<Button asChild><Link href="/campaigns/new">New campaign</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Segment</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Start</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell>
                    <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                      {campaign.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <CampaignStatusBadge status={campaign.status} />
                  </TableCell>
                  <TableCell>{titleCase(campaign.channel)}</TableCell>
                  <TableCell>{campaign.segmentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.audienceCount}</Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.ownerName}
                    {campaign.ownerStatus === "inactive" ? <Badge variant="outline" className="ml-2">Inactive</Badge> : null}
                  </TableCell>
                  <TableCell>
                    <DateDisplay value={campaign.startDate} />
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
              buildHref={(page) => buildHref("/campaigns", raw, { page: String(page) })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
