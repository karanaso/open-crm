import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TaskForm } from "@/components/timeline/task-form";
import { getTask } from "@/lib/services/tasks";
import { listTeamMembers } from "@/lib/services/users";
import { getParam } from "@/lib/search-params";

export default async function EditTaskPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  const task = await getTask(id);
  if (!task) notFound();

  const team = await listTeamMembers();
  const assignees = team
    .filter((member) => member.status === "active" || member.id === task.assigneeId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const returnTo = getParam(raw, "returnTo") ?? "/tasks";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edit task" description="Update the task details, assignee, or linked records." />
      <Card>
        <CardContent className="pt-5">
          <TaskForm
            links={{
              companyId: task.companyId,
              contactId: task.contactId,
              dealId: task.dealId,
              ticketId: task.ticketId,
              campaignId: task.campaignId,
            }}
            returnTo={returnTo}
            assignees={assignees}
            initial={{
              id: task.id,
              title: task.title,
              description: task.description,
              dueDate: task.dueDate,
              priority: task.priority,
              assigneeId: task.assigneeId,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
