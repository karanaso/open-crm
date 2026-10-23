"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { scheduleViewingAction } from "@/actions/listing-viewings";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { wallTimeToUtc } from "@/components/listings/zoned-datetime";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";

type ContactOption = { id: string; firstName: string; lastName: string };
type AgentOption = { id: string; name: string; status: "active" | "inactive" };

export function ViewingForm({
  listingId,
  returnTo,
  contacts,
  agents,
  timeZone,
}: {
  listingId: string;
  returnTo: string;
  contacts: ContactOption[];
  agents: AgentOption[];
  timeZone: string;
}) {
  const t = useListingsTranslator();
  const tCommon = useTranslations("common");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    scheduleViewingAction,
    null,
  );
  const [wallTime, setWallTime] = useState("");
  const scheduledAt = wallTime ? wallTimeToUtc(wallTime, timeZone) : null;

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <input type="hidden" name="scheduledAt" value={scheduledAt?.toISOString() ?? ""} />
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("viewings.contact")}
          htmlFor="viewing-contact"
          error={state?.fieldErrors?.contactId?.[0]}
          required
        >
          <select
            id="viewing-contact"
            name="contactId"
            defaultValue=""
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            required
          >
            <option value="" disabled>
              {t("viewings.selectContact")}
            </option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("viewings.agent")}
          htmlFor="viewing-agent"
          error={state?.fieldErrors?.agentId?.[0]}
          hint={t("viewings.agentHint")}
        >
          <select
            id="viewing-agent"
            name="agentId"
            defaultValue="none"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="none">{t("viewings.currentUserAgent")}</option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
                {agent.status === "inactive" ? tCommon("inactiveSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("viewings.dateTime")}
          htmlFor="viewing-scheduled-at"
          error={state?.fieldErrors?.scheduledAt?.[0]}
          hint={t("viewings.timeZoneHint", { timeZone })}
          required
        >
          <Input
            id="viewing-scheduled-at"
            type="datetime-local"
            value={wallTime}
            onChange={(event) => setWallTime(event.target.value)}
            aria-invalid={wallTime !== "" && !scheduledAt}
            required
          />
        </FormField>

        <FormField
          label={t("viewings.duration")}
          htmlFor="viewing-duration"
          error={state?.fieldErrors?.durationMinutes?.[0]}
          required
        >
          <Input
            id="viewing-duration"
            name="durationMinutes"
            type="number"
            min={1}
            max={480}
            step={1}
            defaultValue={30}
            required
          />
        </FormField>
      </div>

      {wallTime !== "" && !scheduledAt ? (
        <p className="text-xs text-destructive">{t("viewings.invalidTime")}</p>
      ) : null}

      <FormField
        label={t("viewings.notes")}
        htmlFor="viewing-notes"
        error={state?.fieldErrors?.notes?.[0]}
      >
        <Textarea id="viewing-notes" name="notes" maxLength={2000} />
      </FormField>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || !scheduledAt}>
          {pending ? tCommon("saving") : t("viewings.schedule")}
        </Button>
      </div>
    </form>
  );
}