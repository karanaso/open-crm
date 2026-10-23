"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("support");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");
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

      <FormField label={tCommon("subject")} htmlFor="subject" error={state?.fieldErrors?.subject?.[0]} required>
        <Input id="subject" name="subject" defaultValue={initial?.subject ?? ""} required autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={tCommon("requester")}
          htmlFor="requesterContactId"
          error={state?.fieldErrors?.requesterContactId?.[0]}
          className="sm:col-span-2"
          required
        >
          <div className="space-y-2">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("searchRequestersPlaceholder")}
              aria-label={t("searchRequesters")}
            />
            <select
              id="requesterContactId"
              name="requesterContactId"
              value={requesterId}
              onChange={(event) => setRequesterId(event.target.value)}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("selectRequester")}</option>
              {filteredContacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.firstName} {contact.lastName} · {contact.email}
                  {contact.companyName ? ` · ${contact.companyName}` : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {selectedContact?.companyName
                ? t("contactCompany", { company: selectedContact.companyName })
                : t("noCompanyLinked")}
            </p>
          </div>
        </FormField>

        <FormField label={tCommon("priority")} htmlFor="priority" error={state?.fieldErrors?.priority?.[0]} required>
          <select
            id="priority"
            name="priority"
            defaultValue={initial?.priority ?? "normal"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="urgent">{tEnums("ticketPriority.urgent")}</option>
            <option value="high">{tEnums("ticketPriority.high")}</option>
            <option value="normal">{tEnums("ticketPriority.normal")}</option>
            <option value="low">{tEnums("ticketPriority.low")}</option>
          </select>
        </FormField>

        <FormField label={tCommon("assignee")} htmlFor="assigneeId" error={state?.fieldErrors?.assigneeId?.[0]}>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={initial?.assigneeId ?? "none"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">{tCommon("unassigned")}</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
                {assignee.status === "inactive" ? tCommon("inactiveSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label={tCommon("description")} htmlFor="description" error={state?.fieldErrors?.description?.[0]} required>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} className="min-h-40" required />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref as Route}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
