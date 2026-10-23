"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type OwnerOption = { id: string; name: string; status: "active" | "inactive" };
type CompanyOption = { id: string; name: string; archivedAt?: Date | string | null };

type ContactInitial = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  jobTitle?: string | null;
  companyId?: string | null;
  ownerId?: string;
  notes?: string | null;
  tagNames?: string[];
};

export function ContactForm({
  action,
  initial,
  owners,
  companies,
  defaultOwnerId,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: ContactInitial;
  owners: OwnerOption[];
  companies: CompanyOption[];
  defaultOwnerId: string;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("directory");
  const tCommon = useTranslations("common");

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("firstName")}
          htmlFor="firstName"
          error={state?.fieldErrors?.firstName?.[0]}
          required
        >
          <Input id="firstName" name="firstName" defaultValue={initial?.firstName ?? ""} required autoFocus />
        </FormField>
        <FormField label={t("lastName")} htmlFor="lastName" error={state?.fieldErrors?.lastName?.[0]} required>
          <Input id="lastName" name="lastName" defaultValue={initial?.lastName ?? ""} required />
        </FormField>
        <FormField label={tCommon("email")} htmlFor="email" error={state?.fieldErrors?.email?.[0]} required>
          <Input id="email" name="email" type="email" defaultValue={initial?.email ?? ""} required />
        </FormField>
        <FormField label={tCommon("phone")} htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
          <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone ?? ""} />
        </FormField>
        <FormField label={t("jobTitle")} htmlFor="jobTitle" error={state?.fieldErrors?.jobTitle?.[0]}>
          <Input id="jobTitle" name="jobTitle" defaultValue={initial?.jobTitle ?? ""} />
        </FormField>
        <FormField label={tCommon("company")} htmlFor="companyId" error={state?.fieldErrors?.companyId?.[0]}>
          <select
            id="companyId"
            name="companyId"
            defaultValue={initial?.companyId ?? "none"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <option value="none">{t("noCompany")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.archivedAt ? tCommon("archivedSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label={tCommon("owner")} htmlFor="ownerId" error={state?.fieldErrors?.ownerId?.[0]} required>
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.ownerId ?? defaultOwnerId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
                {owner.status === "inactive" ? tCommon("inactiveSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField label={tCommon("tags")} htmlFor="tags" hint={t("tagsHint")}>
        <Input
          id="tags"
          name="tags"
          defaultValue={initial?.tagNames?.join(", ") ?? ""}
          placeholder={t("contactTagsPlaceholder")}
        />
      </FormField>

      <FormField label={t("notes")} htmlFor="notes" error={state?.fieldErrors?.notes?.[0]}>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </FormField>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/contacts">{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
