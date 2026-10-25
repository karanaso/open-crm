import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Mail, Plus, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
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
import { LocalTime } from "@/components/ui/local-time";
import { MessageStatusBadge } from "@/components/messaging/badges";
import { buildHref, getParam } from "@/lib/search-params";
import { messageListParamsSchema } from "@/lib/validation/messaging";
import { listMessages } from "@/lib/services/messaging";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  await requireUser();
  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");

  const parsed = messageListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    status: getParam(raw, "status") || undefined,
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success ? parsed.data : { q: "", status: undefined, page: 1, pageSize: 20 };
  const data = await listMessages(params);
  const hasFilters = Boolean(params.q || params.status);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("messages")}
        description={t("messagesDescription")}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/messages/groups">
                <Settings2 className="size-4" /> {t("manageGroups")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/messages/new">
                <Plus className="size-4" /> {t("newMessage")}
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-3">
            <Input
              name="q"
              defaultValue={params.q}
              placeholder={t("searchMessagesPlaceholder")}
              aria-label={t("searchMessages")}
            />
            <select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label={tCommon("filterByStatus")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allStatuses")}</option>
              <option value="draft">{tEnums("messageStatus.draft")}</option>
              <option value="sending">{tEnums("messageStatus.sending")}</option>
              <option value="completed">{tEnums("messageStatus.completed")}</option>
              <option value="cancelled">{tEnums("messageStatus.cancelled")}</option>
            </select>
            <Button type="submit" variant="secondary">
              {tCommon("filter")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Mail}
          title={hasFilters ? t("noMessagesMatchTitle") : t("noMessagesTitle")}
          description={
            hasFilters ? t("noMessagesMatchDescription") : t("noMessagesDescription")
          }
          action={
            hasFilters ? (
              <Button variant="outline" asChild>
                <Link href="/messages">{tCommon("tryClearingFilters")}</Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/messages/new">{t("newMessage")}</Link>
              </Button>
            )
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("message")}</TableHead>
                <TableHead>{t("audience")}</TableHead>
                <TableHead>{tCommon("status")}</TableHead>
                <TableHead>{t("recipients")}</TableHead>
                <TableHead>{tCommon("created")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <Link href={`/messages/${message.id}`} className="font-medium hover:underline">
                      {message.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{message.audienceName || "—"}</TableCell>
                  <TableCell>
                    <MessageStatusBadge status={message.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {message.counts.total} · {tEnums("deliveryStatus.sent")} {message.counts.sent} ·{" "}
                    {tEnums("deliveryStatus.failed")} {message.counts.failed} ·{" "}
                    {tEnums("deliveryStatus.skipped")} {message.counts.skipped}
                  </TableCell>
                  <TableCell>
                    <LocalTime value={message.createdAt} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Pagination
        page={data.page}
        pageCount={data.pageCount}
        total={data.total}
        pageSize={data.pageSize}
        buildHref={(page) => buildHref("/messages", raw, { page: String(page) })}
      />
    </div>
  );
}
