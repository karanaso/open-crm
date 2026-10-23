"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField, FormSuccess } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfileAction, null);
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormSuccess message={state?.success} />
      <FormField label={t("displayName")} htmlFor="profile-name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="profile-name" name="name" defaultValue={name} required />
      </FormField>
      <FormField label={tAuth("email")} htmlFor="profile-email">
        <Input id="profile-email" value={email} readOnly disabled />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("saveProfile")}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, null);
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField
        label={tAuth("currentPassword")}
        htmlFor="currentPassword"
        error={state?.fieldErrors?.currentPassword?.[0]}
        required
      >
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField
        label={tAuth("newPassword")}
        htmlFor="newPassword"
        error={state?.fieldErrors?.newPassword?.[0]}
        hint={t("currentPasswordHint")}
        required
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField
        label={tAuth("confirmNewPassword")}
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword?.[0]}
        required
      >
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? tAuth("updatingPassword") : tAuth("updatePassword")}
      </Button>
    </form>
  );
}
