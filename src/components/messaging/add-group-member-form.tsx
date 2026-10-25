"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";

export function AddGroupMemberForm({
  action,
  contacts,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  contacts: Array<{ id: string; name: string; email: string }>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("messaging");

  if (contacts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noContactsAvailable")}</p>;
  }

  return (
    <form action={formAction} className="space-y-3">
      <FormError message={state?.error} />
      <div className="flex flex-wrap items-end gap-2">
        <FormField
          label={t("addMember")}
          htmlFor="contactId"
          error={state?.fieldErrors?.contactId?.[0]}
          className="min-w-56 flex-1"
          required
        >
          <select
            id="contactId"
            name="contactId"
            required
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              {t("selectContact")}
            </option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} · {contact.email}
              </option>
            ))}
          </select>
        </FormField>
        <Button type="submit" disabled={pending}>
          {t("addMember")}
        </Button>
      </div>
    </form>
  );
}
