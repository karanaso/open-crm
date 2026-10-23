"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), null);
  const t = useTranslations("auth");

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField
        label={t("newPassword")}
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
          autoFocus
        />
      </FormField>
      <FormField
        label={t("confirmNewPassword")}
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword?.[0]}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder={t("repeatPassword")}
          required
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("updatingPassword") : t("updatePassword")}
      </Button>
    </form>
  );
}
