import { getTranslations } from "next-intl/server";
import { ActivityForm } from "@/components/timeline/activity-form";
import { TaskSection } from "@/components/timeline/task-section";
import { TimelineList } from "@/components/timeline/timeline-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskListItem } from "@/lib/services/tasks";
import type { TimelineItem } from "@/lib/services/timeline";
import type { User } from "@/db/schema";

export async function RecordEngagement({
  currentUser,
  links,
  returnTo,
  timeline,
  filterType,
  timelinePage,
  tasks,
  assignees,
}: {
  currentUser: Pick<User, "id" | "role">;
  links: Partial<Record<"companyId" | "contactId" | "dealId" | "ticketId" | "campaignId", string | null>>;
  returnTo: string;
  timeline: { items: TimelineItem[]; page: number; pageCount: number };
  filterType?: string;
  timelinePage: number;
  tasks: TaskListItem[];
  assignees: Array<{ id: string; name: string; status: "active" | "inactive" }>;
}) {
  const t = await getTranslations("timeline");

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <TimelineList
        items={timeline.items}
        returnTo={returnTo}
        filterType={filterType}
        page={timelinePage}
        pageCount={timeline.pageCount}
        currentUser={currentUser}
      />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("logActivity")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityForm links={links} returnTo={returnTo} />
          </CardContent>
        </Card>
        <TaskSection tasks={tasks} links={links} returnTo={returnTo} assignees={assignees} />
      </div>
    </div>
  );
}
