"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ArrowRightLeft,
  CalendarDays,
  CheckSquare,
  Mail,
  Phone,
  StickyNote,
} from "lucide-react";
import { ActivityActions } from "@/components/timeline/activity-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import { buildHref } from "@/lib/search-params";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "@/lib/services/timeline";
import type { User } from "@/db/schema";

const typeIcons = {
  note: StickyNote,
  call: Phone,
  email: Mail,
  meeting: CalendarDays,
  stage_change: ArrowRightLeft,
  task: CheckSquare,
} as const;

const filters = [
  { key: "", labelKey: "all" },
  { key: "note", labelKey: "filterNotes" },
  { key: "call", labelKey: "filterCalls" },
  { key: "email", labelKey: "filterEmails" },
  { key: "meeting", labelKey: "filterMeetings" },
] as const;

export function TimelineList({
  items,
  returnTo,
  filterType,
  page,
  pageCount,
  currentUser,
}: {
  items: TimelineItem[];
  returnTo: string;
  filterType?: string;
  page: number;
  pageCount: number;
  currentUser: Pick<User, "id" | "role">;
}) {
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
  const typeLabels: Record<string, string> = {
    note: tEnums("activityType.note"),
    call: tEnums("activityType.call"),
    email: tEnums("activityType.email"),
    meeting: tEnums("activityType.meeting"),
    stage_change: tEnums("activityType.stage_change"),
    task: t("taskType"),
  };

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>{t("timeline")}</CardTitle>
        <div className="flex flex-wrap gap-1">
          {filters.map((filter) => (
            <Link
              key={filter.key || "all"}
              href={buildHref(returnTo, {}, { activityType: filter.key || undefined, timelinePage: "1" })}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium",
                (filterType ?? "") === filter.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
              )}
            >
              {filter.labelKey === "all" ? tCommon("all") : t(filter.labelKey)}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title={t("emptyTitle")}
            description={t("emptyDescription")}
          />
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const Icon = typeIcons[item.type as keyof typeof typeIcons] ?? StickyNote;
              const typeLabel = typeLabels[item.type] ?? item.type;
              const canEdit =
                item.kind === "activity" &&
                item.type !== "stage_change" &&
                item.authorId === currentUser.id;
              const canDelete =
                item.kind === "activity" &&
                (item.authorId === currentUser.id || currentUser.role === "admin");

              return (
                <li key={`${item.kind}-${item.id}`} className="relative flex gap-3">
                  <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1 rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{item.subject}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabel} · {item.authorName} ·{" "}
                          <LocalTime value={item.occurredAt} />
                        </p>
                      </div>
                      {item.kind === "task" ? <Badge variant="success">{t("completedTask")}</Badge> : null}
                    </div>
                    {item.type === "stage_change" && item.metadata?.fromStageName ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {item.metadata.fromStageName} → {item.metadata.toStageName}
                      </p>
                    ) : null}
                    {item.body ? (
                      <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{item.body}</p>
                    ) : null}
                    {item.links.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.links.map((link) => (
                          <Link
                            key={`${link.type}-${link.id}`}
                            href={link.href}
                            className="rounded-md border bg-muted/40 px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                    {item.kind === "activity" ? (
                      <div className="mt-2 flex justify-end">
                        <ActivityActions
                          activity={{
                            id: item.id,
                            type: item.type as "note" | "call" | "email" | "meeting" | "stage_change",
                            subject: item.subject,
                            body: item.body,
                            occurredAt: item.occurredAt,
                            companyId: item.linkIds.companyId ?? null,
                            contactId: item.linkIds.contactId ?? null,
                            dealId: item.linkIds.dealId ?? null,
                            ticketId: item.linkIds.ticketId ?? null,
                            campaignId: item.linkIds.campaignId ?? null,
                          }}
                          links={item.linkIds}
                          returnTo={returnTo}
                          canEdit={canEdit}
                          canDelete={canDelete}
                        />
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {page < pageCount ? (
          <div className="mt-4 text-center">
            <Link
              href={buildHref(returnTo, {}, { activityType: filterType, timelinePage: String(page + 1) })}
              className="text-sm font-medium text-primary hover:underline"
            >
              {t("loadOlder")}
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
