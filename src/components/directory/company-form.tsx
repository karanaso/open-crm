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

type CompanyInitial = {
  name?: string;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  phone?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  description?: string | null;
  ownerId?: string;
  tagNames?: string[];
};

export function CompanyForm({
  action,
  initial,
  owners,
  defaultOwnerId,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: CompanyInitial;
  owners: OwnerOption[];
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
          label={t("companyName")}
          htmlFor="name"
          error={state?.fieldErrors?.name?.[0]}
          className="sm:col-span-2"
          required
        >
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
        </FormField>
        <FormField label={t("domain")} htmlFor="domain" error={state?.fieldErrors?.domain?.[0]}>
          <Input
            id="domain"
            name="domain"
            defaultValue={initial?.domain ?? ""}
            placeholder={t("domainPlaceholder")}
          />
        </FormField>
        <FormField label={t("industry")} htmlFor="industry" error={state?.fieldErrors?.industry?.[0]}>
          <Input id="industry" name="industry" defaultValue={initial?.industry ?? ""} />
        </FormField>
        <FormField label={t("employeeCount")} htmlFor="employeeCount" error={state?.fieldErrors?.employeeCount?.[0]}>
          <Input
            id="employeeCount"
            name="employeeCount"
            type="number"
            min={0}
            defaultValue={initial?.employeeCount ?? ""}
          />
        </FormField>
        <FormField label={tCommon("phone")} htmlFor="phone" error={state?.fieldErrors?.phone?.[0]}>
          <Input id="phone" name="phone" type="tel" defaultValue={initial?.phone ?? ""} />
        </FormField>
        <FormField label={t("website")} htmlFor="website" error={state?.fieldErrors?.website?.[0]}>
          <Input
            id="website"
            name="website"
            defaultValue={initial?.website ?? ""}
            placeholder={t("websitePlaceholder")}
          />
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

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("addressLine1")} htmlFor="addressLine1">
          <Input id="addressLine1" name="addressLine1" defaultValue={initial?.addressLine1 ?? ""} />
        </FormField>
        <FormField label={t("addressLine2")} htmlFor="addressLine2">
          <Input id="addressLine2" name="addressLine2" defaultValue={initial?.addressLine2 ?? ""} />
        </FormField>
        <FormField label={t("city")} htmlFor="city">
          <Input id="city" name="city" defaultValue={initial?.city ?? ""} />
        </FormField>
        <FormField label={t("region")} htmlFor="region">
          <Input id="region" name="region" defaultValue={initial?.region ?? ""} />
        </FormField>
        <FormField label={t("postalCode")} htmlFor="postalCode">
          <Input id="postalCode" name="postalCode" defaultValue={initial?.postalCode ?? ""} />
        </FormField>
        <FormField label={t("country")} htmlFor="country">
          <Input id="country" name="country" defaultValue={initial?.country ?? ""} />
        </FormField>
      </div>

      <FormField label={tCommon("tags")} htmlFor="tags" hint={t("tagsHint")}>
        <Input
          id="tags"
          name="tags"
          defaultValue={initial?.tagNames?.join(", ") ?? ""}
          placeholder={t("companyTagsPlaceholder")}
        />
      </FormField>

      <FormField label={tCommon("description")} htmlFor="description" error={state?.fieldErrors?.description?.[0]}>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </FormField>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href="/companies">{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
