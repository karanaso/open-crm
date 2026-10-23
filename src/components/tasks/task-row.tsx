import Link from "next/link";
import { Check, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { completeTaskAction, deleteTaskAction, reopenTaskAction } from "@/actions/engagement";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { DateDisplay } from "@/components/ui/local-time";
import { PriorityBadge } from "@/components/ui/badges";
import { cn } from "@/lib/utils";
import type { TaskListItem } from "@/lib/services/tasks";

export function TaskRow({
  task,
  returnTo,
  showLinks = true,
}: {
  task: TaskListItem;
  returnTo: string;
  showLinks?: boolean;
}) {
  return (
    <li className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={cn("font-medium", task.status === "completed" && "text-muted-foreground line-through")}>
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground">
            Due <DateDisplay value={task.dueDate} />
            {task.assigneeName ? ` · ${task.assigneeName}` : " · Unassigned"}
          </p>
          {showLinks && task.links.length > 0 ? (
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
          {task.isOverdue ? <Badge variant="destructive">Overdue</Badge> : null}
        </div>
      </div>
      {task.description ? (
        <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{task.description}</p>
      ) : null}
      <div className="mt-2 flex items-center justify-end gap-1">
        {task.status === "open" ? (
          <form action={completeTaskAction.bind(null, task.id, returnTo)}>
            <Button type="submit" variant="ghost" size="sm">
              <Check className="size-3.5" /> Complete
            </Button>
          </form>
        ) : (
          <form action={reopenTaskAction.bind(null, task.id, returnTo)}>
            <Button type="submit" variant="ghost" size="sm">
              <RotateCcw className="size-3.5" /> Reopen
            </Button>
          </form>
        )}
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/tasks/${task.id}/edit?returnTo=${encodeURIComponent(returnTo)}`}>
            <Pencil className="size-3.5" /> Edit
          </Link>
        </Button>
        <form action={deleteTaskAction.bind(null, task.id, returnTo)}>
          <ConfirmSubmit
            message="Delete this task?"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
          >
            <Trash2 className="size-3.5" /> Delete
          </ConfirmSubmit>
        </form>
      </div>
    </li>
  );
}
