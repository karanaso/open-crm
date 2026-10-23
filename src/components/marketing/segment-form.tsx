"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type SegmentInitial = {
  name: string;
  description: string | null;
  criteria: {
    tags?: string[];
    industry?: string;
    jobTitle?: string;
    ownerId?: string;
    createdFrom?: string;
    createdTo?: string;
  };
};

export function SegmentForm({
  action,
  initial,
  owners,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: SegmentInitial;
  owners: Array<{ id: string; name: string }>;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />
      <FormField label="Segment name" htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Contact tags" htmlFor="tags" hint="Comma-separated. Matches any selected tag.">
          <Input id="tags" name="tags" defaultValue={initial?.criteria.tags?.join(", ") ?? ""} placeholder="vip, renewal" />
        </FormField>
        <FormField label="Company industry" htmlFor="industry">
          <Input id="industry" name="industry" defaultValue={initial?.criteria.industry ?? ""} placeholder="Software" />
        </FormField>
        <FormField label="Job title contains" htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={initial?.criteria.jobTitle ?? ""} placeholder="Director" />
        </FormField>
        <FormField label="Contact owner" htmlFor="ownerId">
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.criteria.ownerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">Any owner</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Created from" htmlFor="createdFrom">
          <Input id="createdFrom" name="createdFrom" type="date" defaultValue={initial?.criteria.createdFrom ?? ""} />
        </FormField>
        <FormField label="Created to" htmlFor="createdTo">
          <Input id="createdTo" name="createdTo" type="date" defaultValue={initial?.criteria.createdTo ?? ""} />
        </FormField>
      </div>

      <FormField label="Description" htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </FormField>

      <p className="text-xs text-muted-foreground">
        Criteria combine with AND across fields. Tags match contacts with any selected tag.
      </p>

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
