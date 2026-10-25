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

export function GroupForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  initial?: { name: string; description: string | null };
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("messaging");
  const tCommon = useTranslations("common");

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />
      <FormField
        label={t("groupName")}
        htmlFor="name"
        error={state?.fieldErrors?.name?.[0]}
        required
      >
        <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
      </FormField>
      <FormField
        label={tCommon("description")}
        htmlFor="description"
        error={state?.fieldErrors?.description?.[0]}
      >
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
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
