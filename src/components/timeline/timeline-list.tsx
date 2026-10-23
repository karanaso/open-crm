import Link from "next/link";
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
import { cn, titleCase } from "@/lib/utils";
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
  { key: "", label: "All" },
  { key: "note", label: "Notes" },
  { key: "call", label: "Calls" },
  { key: "email", label: "Emails" },
  { key: "meeting", label: "Meetings" },
];

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
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle>Timeline</CardTitle>
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
              {filter.label}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState
            icon={StickyNote}
            title="Nothing on the timeline yet"
            description="Log a note, call, email, or meeting to start the history."
          />
        ) : (
          <ol className="space-y-4">
            {items.map((item) => {
              const Icon = typeIcons[item.type as keyof typeof typeIcons] ?? StickyNote;
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
                          {titleCase(item.type)} · {item.authorName} ·{" "}
                          <LocalTime value={item.occurredAt} />
                        </p>
                      </div>
                      {item.kind === "task" ? <Badge variant="success">Completed task</Badge> : null}
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
              Load older entries
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
