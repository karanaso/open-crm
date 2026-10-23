"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("marketing");
  const tCommon = useTranslations("common");

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />
      <FormField label={t("segmentName")} htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("contactTags")} htmlFor="tags" hint={t("contactTagsHint")}>
          <Input id="tags" name="tags" defaultValue={initial?.criteria.tags?.join(", ") ?? ""} placeholder={t("tagsPlaceholder")} />
        </FormField>
        <FormField label={t("companyIndustry")} htmlFor="industry">
          <Input id="industry" name="industry" defaultValue={initial?.criteria.industry ?? ""} placeholder={t("industryPlaceholder")} />
        </FormField>
        <FormField label={t("jobTitleContains")} htmlFor="jobTitle">
          <Input id="jobTitle" name="jobTitle" defaultValue={initial?.criteria.jobTitle ?? ""} placeholder={t("jobTitlePlaceholder")} />
        </FormField>
        <FormField label={t("contactOwner")} htmlFor="ownerId">
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.criteria.ownerId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t("anyOwner")}</option>
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={t("createdFrom")} htmlFor="createdFrom">
          <Input id="createdFrom" name="createdFrom" type="date" defaultValue={initial?.criteria.createdFrom ?? ""} />
        </FormField>
        <FormField label={t("createdTo")} htmlFor="createdTo">
          <Input id="createdTo" name="createdTo" type="date" defaultValue={initial?.criteria.createdTo ?? ""} />
        </FormField>
      </div>

      <FormField label={tCommon("description")} htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </FormField>

      <p className="text-xs text-muted-foreground">{t("criteriaHint")}</p>

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
