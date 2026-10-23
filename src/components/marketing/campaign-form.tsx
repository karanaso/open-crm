"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SegmentOption = { id: string; name: string; audienceCount: number; archivedAt: Date | string | null };

type CampaignInitial = {
  name: string;
  channel: "email" | "phone" | "event" | "social" | "other";
  segmentId: string;
  ownerId: string;
  budget: string;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export function CampaignForm({
  action,
  segments,
  owners,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  segments: SegmentOption[];
  owners: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  initial?: CampaignInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [segmentId, setSegmentId] = useState(initial?.segmentId ?? segments[0]?.id ?? "");
  const selectedSegment = segments.find((segment) => segment.id === segmentId);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />
      <FormField label="Campaign name" htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Channel" htmlFor="channel" error={state?.fieldErrors?.channel?.[0]} required>
          <select
            id="channel"
            name="channel"
            defaultValue={initial?.channel ?? "email"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="email">Email</option>
            <option value="phone">Phone</option>
            <option value="event">Event</option>
            <option value="social">Social</option>
            <option value="other">Other</option>
          </select>
        </FormField>
        <FormField label="Owner" htmlFor="ownerId" error={state?.fieldErrors?.ownerId?.[0]} required>
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.ownerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
                {owner.status === "inactive" ? " (inactive)" : ""}
              </option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Audience segment"
          htmlFor="segmentId"
          error={state?.fieldErrors?.segmentId?.[0]}
          hint={selectedSegment ? `${selectedSegment.audienceCount} contacts currently match` : undefined}
          className="sm:col-span-2"
          required
        >
          <select
            id="segmentId"
            name="segmentId"
            value={segmentId}
            onChange={(event) => setSegmentId(event.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {segments.map((segment) => (
              <option key={segment.id} value={segment.id}>
                {segment.name} ({segment.audienceCount})
                {segment.archivedAt ? " (archived)" : ""}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Budget (USD)" htmlFor="budget" error={state?.fieldErrors?.budget?.[0]}>
          <Input id="budget" name="budget" type="number" min={0} step="0.01" defaultValue={initial?.budget ?? "0"} />
        </FormField>
        <div />
        <FormField label="Start date" htmlFor="startDate" error={state?.fieldErrors?.startDate?.[0]}>
          <Input id="startDate" name="startDate" type="date" defaultValue={initial?.startDate ?? ""} />
        </FormField>
        <FormField label="End date" htmlFor="endDate" error={state?.fieldErrors?.endDate?.[0]}>
          <Input id="endDate" name="endDate" type="date" defaultValue={initial?.endDate ?? ""} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
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
