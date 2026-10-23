import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Check, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { completeTaskAction, deleteTaskAction, reopenTaskAction } from "@/actions/engagement";
import { TaskForm } from "@/components/timeline/task-form";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { DateDisplay } from "@/components/ui/local-time";
import { PriorityBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "@/lib/services/tasks";

export async function TaskSection({
  tasks,
  links,
  returnTo,
  assignees,
  title,
}: {
  tasks: TaskListItem[];
  links: Partial<Record<"companyId" | "contactId" | "dealId" | "ticketId" | "campaignId", string | null>>;
  returnTo: string;
  assignees: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  title?: string;
}) {
  const t = await getTranslations("timeline");
  const tCommon = await getTranslations("common");
  const open = tasks.filter((task) => task.status === "open");
  const completed = tasks.filter((task) => task.status === "completed");

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{title ?? t("tasks")}</CardTitle>
        <Badge variant="outline">{t("openCount", { count: open.length })}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <details className="rounded-lg border bg-muted/20 p-3">
          <summary className="flex cursor-pointer items-center gap-2 text-sm font-medium">
            <Plus className="size-4" /> {t("addTask")}
          </summary>
          <div className="mt-4">
            <TaskForm links={links} returnTo={returnTo} assignees={assignees} />
          </div>
        </details>

        {open.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noOpenTasks")}</p>
        ) : (
          <ul className="space-y-2">
            {open.map((task) => (
              <li key={task.id} className="rounded-lg border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("due")} <DateDisplay value={task.dueDate} />
                      {task.assigneeName ? ` · ${task.assigneeName}` : ` · ${tCommon("unassigned")}`}
                    </p>
                    {task.links.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {task.links.map((link) => (
                          <Link
                            key={`${link.type}-${link.id}`}
                            href={link.href}
                            className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                          >
                            {link.label}
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <PriorityBadge priority={task.priority} />
                    {task.isOverdue ? <Badge variant="destructive">{tCommon("overdue")}</Badge> : null}
                  </div>
                </div>
                {task.description ? (
                  <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{task.description}</p>
                ) : null}
                <div className="mt-2 flex items-center justify-end gap-1">
                  <form action={completeTaskAction.bind(null, task.id, returnTo)}>
                    <Button type="submit" variant="ghost" size="sm">
                      <Check className="size-3.5" /> {t("complete")}
                    </Button>
                  </form>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/tasks/${task.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
                      <Pencil className="size-3.5" /> {tCommon("edit")}
                    </Link>
                  </Button>
                  <form action={deleteTaskAction.bind(null, task.id, returnTo)}>
                    <ConfirmSubmit
                      message={t("deleteTaskConfirm")}
                      className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                    >
                      <Trash2 className="size-3.5" /> {tCommon("delete")}
                    </ConfirmSubmit>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}

        {completed.length > 0 ? (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              {t("completedCount", { count: completed.length })}
            </summary>
            <ul className="mt-2 space-y-1">
              {completed.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
                  <span className="text-sm text-muted-foreground line-through">{task.title}</span>
                  <div className="flex items-center gap-1">
                    <form action={reopenTaskAction.bind(null, task.id, returnTo)}>
                      <Button type="submit" variant="ghost" size="sm">
                        <RotateCcw className="size-3.5" /> {t("reopen")}
                      </Button>
                    </form>
                    <form action={deleteTaskAction.bind(null, task.id, returnTo)}>
                      <ConfirmSubmit
                        message={t("deleteTaskConfirm")}
                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
