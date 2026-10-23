"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { acceptInviteAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), null);
  const t = useTranslations("auth");

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField label={t("email")} htmlFor="invite-email">
        <Input id="invite-email" value={email} readOnly disabled />
      </FormField>
      <FormField label={t("yourName")} htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          placeholder={t("namePlaceholder")}
          required
          autoFocus
        />
      </FormField>
      <FormField
        label={t("password")}
        htmlFor="password"
        error={state?.fieldErrors?.password?.[0]}
        hint={t("passwordHint")}
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder={t("newPasswordPlaceholder")}
          required
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("joiningWorkspace") : t("joinWorkspace")}
      </Button>
    </form>
  );
}
