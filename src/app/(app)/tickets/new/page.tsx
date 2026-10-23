import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { TicketForm } from "@/components/tickets/ticket-form";
import { createTicketAction } from "@/actions/tickets";
import { requireUser } from "@/lib/auth/guards";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";

export default async function NewTicketPage() {
  await requireUser();
  const [contacts, team] = await Promise.all([getContactPickerOptions(), listTeamMembers()]);
  const assignees = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New ticket" description="Log a support request and set its priority." />
      <Card>
        <CardContent className="pt-5">
          <TicketForm
            action={createTicketAction}
            contacts={contacts}
            assignees={assignees}
            submitLabel="Create ticket"
            cancelHref="/tickets"
          />
        </CardContent>
      </Card>
    </div>
  );
}
