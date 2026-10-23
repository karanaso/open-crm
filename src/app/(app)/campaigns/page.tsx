import Link from "next/link";
import { getTranslations } from "next-intl/server";
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

export const dynamic = "force-dynamic";

export default async function CampaignsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
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
        title={t("campaigns")}
        description={t("campaignsDescription")}
        actions={
          <Button asChild>
            <Link href="/campaigns/new">
              <Plus className="size-4" /> {t("newCampaign")}
            </Link>
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input
              name="q"
              defaultValue={params.q}
              placeholder={t("searchCampaignsPlaceholder")}
              aria-label={t("searchCampaigns")}
            />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label={tCommon("filterByStatus")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allStatuses")}</option>
              <option value="draft">{tEnums("campaignStatus.draft")}</option>
              <option value="active">{tEnums("campaignStatus.active")}</option>
              <option value="completed">{tEnums("campaignStatus.completed")}</option>
              <option value="archived">{tEnums("campaignStatus.archived")}</option>
            </select>
            <select
              name="channel"
              defaultValue={params.channel ?? ""}
              aria-label={t("filterByChannel")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("allChannels")}</option>
              <option value="email">{tEnums("campaignChannel.email")}</option>
              <option value="phone">{tEnums("campaignChannel.phone")}</option>
              <option value="event">{tEnums("campaignChannel.event")}</option>
              <option value="social">{tEnums("campaignChannel.social")}</option>
              <option value="other">{tEnums("campaignChannel.other")}</option>
            </select>
            <select
              name="ownerId"
              defaultValue={params.ownerId ?? ""}
              aria-label={tCommon("filterByOwner")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allOwners")}</option>
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
                aria-label={t("sortCampaigns")}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="updated">{t("sortRecentlyUpdated")}</option>
                <option value="name">{tCommon("name")}</option>
                <option value="start_date">{t("startDate")}</option>
              </select>
              <Button type="submit" variant="secondary">{tCommon("filter")}</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title={t("campaignsNoMatchTitle")}
          description={t("campaignsEmptyDescription")}
          action={<Button asChild><Link href="/campaigns/new">{t("newCampaign")}</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("campaign")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("channel")}</TableHead>
                <TableHead>{t("segment")}</TableHead>
                <TableHead>{t("audience")}</TableHead>
                <TableHead>{tCommon("owner")}</TableHead>
                <TableHead>{t("start")}</TableHead>
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
                  <TableCell>{tEnums(`campaignChannel.${campaign.channel}`)}</TableCell>
                  <TableCell>{campaign.segmentName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{campaign.audienceCount}</Badge>
                  </TableCell>
                  <TableCell>
                    {campaign.ownerName}
                    {campaign.ownerStatus === "inactive" ? <Badge variant="outline" className="ml-2">{tCommon("inactive")}</Badge> : null}
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
