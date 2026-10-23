"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signInAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(signInAction, null);
  const t = useTranslations("auth");

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <FormError message={state?.error} />
      <FormField label={t("email")} htmlFor="email" error={state?.fieldErrors?.email?.[0]} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          required
          autoFocus
        />
      </FormField>
      <FormField label={t("password")} htmlFor="password" error={state?.fieldErrors?.password?.[0]} required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder={t("signInPasswordPlaceholder")}
          required
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t("signingIn") : t("signIn")}
      </Button>
    </form>
  );
}
