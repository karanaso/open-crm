"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createActivityAction, updateActivityAction } from "@/actions/engagement";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField, FieldError } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const linkFields = ["companyId", "contactId", "dealId", "listingId", "ticketId", "campaignId"] as const;

type ActivityInitial = {
  id: string;
  type: "note" | "call" | "email" | "meeting";
  subject: string;
  body: string | null;
  occurredAt: Date | string;
  companyId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  listingId?: string | null;
  ticketId?: string | null;
  campaignId?: string | null;
};

export function ActivityForm({
  links,
  returnTo,
  initial,
  onCancel,
}: {
  links: Partial<Record<(typeof linkFields)[number], string | null>>;
  returnTo: string;
  initial?: ActivityInitial;
  onCancel?: () => void;
}) {
  const action = initial ? updateActivityAction.bind(null, initial.id) : createActivityAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {linkFields.map((field) => (
        <input key={field} type="hidden" name={field} value={links[field] ?? ""} />
      ))}
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("type")} htmlFor="activity-type" error={state?.fieldErrors?.type?.[0]} required>
          <select
            id="activity-type"
            name="type"
            defaultValue={initial?.type ?? "note"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="note">{tEnums("activityType.note")}</option>
            <option value="call">{tEnums("activityType.call")}</option>
            <option value="email">{tEnums("activityType.email")}</option>
            <option value="meeting">{tEnums("activityType.meeting")}</option>
          </select>
        </FormField>
        <FormField
          label={t("occurredAt")}
          htmlFor="occurredAt"
          error={state?.fieldErrors?.occurredAt?.[0]}
          required
        >
          <Input
            id="occurredAt"
            name="occurredAt"
            type="datetime-local"
            defaultValue={
              initial
                ? new Date(initial.occurredAt).toISOString().slice(0, 16)
                : new Date().toISOString().slice(0, 16)
            }
            required
          />
        </FormField>
      </div>

      <FormField label={tCommon("subject")} htmlFor="activity-subject" error={state?.fieldErrors?.subject?.[0]} required>
        <Input
          id="activity-subject"
          name="subject"
          defaultValue={initial?.subject ?? ""}
          placeholder={t("subjectPlaceholder")}
          required
        />
      </FormField>
      <FormField label={tCommon("details")} htmlFor="activity-body" error={state?.fieldErrors?.body?.[0]}>
        <Textarea
          id="activity-body"
          name="body"
          defaultValue={initial?.body ?? ""}
          placeholder={t("bodyPlaceholder")}
        />
      </FormField>
      <FieldError message={state?.fieldErrors?.links?.[0]} />

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : initial ? t("saveActivity") : t("logActivity")}
        </Button>
      </div>
    </form>
  );
}
