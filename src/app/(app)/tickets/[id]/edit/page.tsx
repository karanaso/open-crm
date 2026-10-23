import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TicketForm } from "@/components/tickets/ticket-form";
import { updateTicketAction } from "@/actions/tickets";
import { getTicket } from "@/lib/services/tickets";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const [contacts, team] = await Promise.all([getContactPickerOptions(), listTeamMembers()]);
  const assignees = team
    .filter((member) => member.status === "active" || member.id === ticket.assigneeId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Edit ticket" description="Update the requester, priority, assignment, or details." />
      <Card>
        <CardContent className="pt-5">
          <TicketForm
            action={updateTicketAction.bind(null, ticket.id)}
            contacts={contacts}
            assignees={assignees}
            initial={{
              subject: ticket.subject,
              description: ticket.description,
              requesterContactId: ticket.requesterContactId,
              priority: ticket.priority,
              assigneeId: ticket.assigneeId,
              updatedAt: ticket.updatedAt.toISOString(),
            }}
            submitLabel="Save changes"
            cancelHref={`/tickets/${ticket.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
