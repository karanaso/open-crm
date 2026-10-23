import Link from "next/link";
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
    { key: "overdue", label: "Overdue", items: open.filter((task) => task.dueDate < today) },
    { key: "today", label: "Due today", items: open.filter((task) => task.dueDate === today) },
    {
      key: "upcoming",
      label: "Next 7 days",
      items: open.filter((task) => task.dueDate > today && task.dueDate <= upcomingLimit),
    },
    {
      key: "later",
      label: "Later",
      items: open.filter((task) => task.dueDate > upcomingLimit),
    },
  ];

  const returnTo = "/tasks";
  const activeMembers = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Follow-up work across every record, grouped by what needs attention next."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={params.view === "mine" ? "default" : "outline"} size="sm">
          <Link href="/tasks?view=mine">My tasks</Link>
        </Button>
        <Button asChild variant={params.view === "all" ? "default" : "outline"} size="sm">
          <Link href="/tasks?view=all">All tasks</Link>
        </Button>
      </div>

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input type="hidden" name="view" value={params.view} />
            <select
              name="assigneeId"
              defaultValue={params.assigneeId ?? ""}
              aria-label="Filter by assignee"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All assignees</option>
              {activeMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
            <select
              name="priority"
              defaultValue={params.priority ?? ""}
              aria-label="Filter by priority"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All priorities</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
            <select
              name="status"
              defaultValue={params.status ?? ""}
              aria-label="Filter by status"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Open and completed</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
            </select>
            <select
              name="recordType"
              defaultValue={params.recordType ?? ""}
              aria-label="Filter by linked record type"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Any record</option>
              <option value="company">Company</option>
              <option value="contact">Contact</option>
              <option value="deal">Deal</option>
              <option value="ticket">Ticket</option>
              <option value="campaign">Campaign</option>
            </select>
            <Button type="submit" variant="secondary">
              Apply filters
            </Button>
          </form>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks match these filters"
          description="Create tasks from a company, contact, deal, ticket, or campaign to see them here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <Card key={group.key}>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{group.label}</CardTitle>
                <Badge variant={group.key === "overdue" && group.items.length > 0 ? "destructive" : "outline"}>
                  {group.items.length}
                </Badge>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing here.</p>
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
                <CardTitle>Completed</CardTitle>
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
