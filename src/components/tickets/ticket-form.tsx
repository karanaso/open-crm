"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useMemo, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyId: string | null;
  companyName: string | null;
};

type TicketInitial = {
  subject: string;
  description: string;
  requesterContactId: string;
  priority: "urgent" | "high" | "normal" | "low";
  assigneeId: string | null;
  updatedAt: string;
};

export function TicketForm({
  action,
  contacts,
  assignees,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  contacts: ContactOption[];
  assignees: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  initial?: TicketInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [query, setQuery] = useState("");
  const [requesterId, setRequesterId] = useState(initial?.requesterContactId ?? "");
  const selectedContact = contacts.find((contact) => contact.id === requesterId);

  const filteredContacts = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return contacts.slice(0, 100);
    return contacts
      .filter((contact) =>
        `${contact.firstName} ${contact.lastName} ${contact.email} ${contact.companyName ?? ""}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 100);
  }, [contacts, query]);

  return (
    <form action={formAction} className="space-y-6">
      {initial ? <input type="hidden" name="expectedUpdatedAt" value={initial.updatedAt} /> : null}
      <FormError message={state?.error} />

      <FormField label="Subject" htmlFor="subject" error={state?.fieldErrors?.subject?.[0]} required>
        <Input id="subject" name="subject" defaultValue={initial?.subject ?? ""} required autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Requester"
          htmlFor="requesterContactId"
          error={state?.fieldErrors?.requesterContactId?.[0]}
          className="sm:col-span-2"
          required
        >
          <div className="space-y-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search contacts by name, email, or company…"
              aria-label="Search requesters"
            />
            <select
              id="requesterContactId"
              name="requesterContactId"
              value={requesterId}
              onChange={(event) => setRequesterId(event.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a requester</option>
              {filteredContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName} · {contact.email}
                  {contact.companyName ? ` · ${contact.companyName}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Company: {selectedContact?.companyName ?? "No company linked to this contact"}
            </p>
          </div>
        </FormField>

        <FormField label="Priority" htmlFor="priority" error={state?.fieldErrors?.priority?.[0]} required>
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? "normal"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
        </FormField>

        <FormField label="Assignee" htmlFor="assigneeId" error={state?.fieldErrors?.assigneeId?.[0]}>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={initial?.assigneeId ?? "none"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
                {assignee.status === "inactive" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description" error={state?.fieldErrors?.description?.[0]} required>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} className="min-h-40" required />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref as Route}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
