import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CheckSquare } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { getParam } from "@/lib/search-params";
import { addDays, todayUtc } from "@/lib/dates";
import { taskListParamsSchema } from "@/lib/validation/engagement";
import { listTasks } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const user = await requireUser();
  const t = await getTranslations("timeline");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const parsed = taskListParamsSchema.safeParse({
    view: getParam(raw, "view") || "mine",
    assigneeId: getParam(raw, "assigneeId") || undefined,
    priority: getParam(raw, "priority") || undefined,
    status: getParam(raw, "status") || undefined,
    recordType: getParam(raw, "recordType") || undefined,
  });
  const params = parsed.success
    ? parsed.data
    : {
        view: "mine" as const,
        assigneeId: undefined,
        priority: undefined,
        status: undefined,
        recordType: undefined,
      };

  const [tasks, team] = await Promise.all([
    listTasks({
      view: params.view,
      userId: user.id,
      assigneeId: params.assigneeId,
      priority: params.priority,
      status: params.status,
      recordType: params.recordType,
    }),
    listTeamMembers(),
  ]);

  const open = tasks.filter((task) => task.status === "open");
  const completed = tasks.filter((task) => task.status === "completed");
  const today = todayUtc();
  const upcomingLimit = addDays(new Date(), 7).toISOString().slice(0, 10);

  const groups = [
    {
      key: "overdue",
      label: tCommon("overdue"),
      items: open.filter((task) => task.dueDate < today),
    },
    { key: "today", label: t("dueToday"), items: open.filter((task) => task.dueDate === today) },
    {
      key: "upcoming",
      label: t("next7Days"),
      items: open.filter((task) => task.dueDate > today && task.dueDate <= upcomingLimit),
    },
    {
      key: "later",
      label: t("later"),
      items: open.filter((task) => task.dueDate > upcomingLimit),
    },
  ];

  const returnTo = "/tasks";
  const activeMembers = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="space-y-6">
      <PageHeader title={t("tasks")} description={t("tasksDescription")} />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={params.view === "mine" ? "default" : "outline"} size="sm">
          <Link href="/tasks?view=mine">{t("myTasks")}</Link>
        </Button>
        <Button asChild variant={params.view === "all" ? "default" : "outline"} size="sm">
          <Link href="/tasks?view=all">{t("allTasks")}</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="view" value={params.view} />
            <select
              name="assigneeId"
              defaultValue={params.assigneeId ?? ""}
              aria-label={tCommon("filterByAssignee")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">{tCommon("allAssignees")}</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue={params.priority ?? ""}
              aria-label={tCommon("filterByPriority")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">{tCommon("allPriorities")}</option>
              <option value="high">{tEnums("taskPriority.high")}</option>
              <option value="normal">{tEnums("taskPriority.normal")}</option>
              <option value="low">{tEnums("taskPriority.low")}</option>
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label={tCommon("filterByStatus")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">{t("allTaskStatuses")}</option>
              <option value="open">{tEnums("taskStatus.open")}</option>
              <option value="completed">{tEnums("taskStatus.completed")}</option>
            </select>
            <select
              name="recordType"
              defaultValue={params.recordType ?? ""}
              aria-label={t("filterByLinkedRecord")}
              className="border-input bg-background h-9 rounded-md border px-3 text-sm"
            >
              <option value="">{t("anyRecord")}</option>
              <option value="company">{t("recordCompany")}</option>
              <option value="contact">{t("recordContact")}</option>
              <option value="deal">{t("recordDeal")}</option>
              <option value="listing">{t("recordListing")}</option>
              <option value="ticket">{t("recordTicket")}</option>
              <option value="campaign">{t("recordCampaign")}</option>
            </select>
            <Button type="submit" variant="secondary">
              {tCommon("applyFilters")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title={t("tasksNoMatchTitle")}
          description={t("tasksNoMatchDescription")}
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.key}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{group.label}</CardTitle>
                <Badge
                  variant={
                    group.key === "overdue" && group.items.length > 0 ? "destructive" : "outline"
                  }
                >
                  {group.items.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t("nothingHere")}</p>
                ) : (
                  <ul className="space-y-2">
                    {group.items.map((task) => (
                      <TaskRow key={task.id} task={task} returnTo={returnTo} />
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}

          {completed.length > 0 ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{tEnums("taskStatus.completed")}</CardTitle>
                <Badge variant="success">{completed.length}</Badge>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {completed.map((task) => (
                    <TaskRow key={task.id} task={task} returnTo={returnTo} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
