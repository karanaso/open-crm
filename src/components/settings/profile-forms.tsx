"use client";

import { useActionState } from "react";
import { changePasswordAction, updateProfileAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateProfileAction, null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      {state?.success ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
      <FormField label="Display name" htmlFor="profile-name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="profile-name" name="name" defaultValue={name} required />
      </FormField>
      <FormField label="Email" htmlFor="profile-email">
        <Input id="profile-email" value={email} readOnly disabled />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(changePasswordAction, null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField
        label="Current password"
        htmlFor="currentPassword"
        error={state?.fieldErrors?.currentPassword?.[0]}
        required
      >
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </FormField>
      <FormField
        label="New password"
        htmlFor="newPassword"
        error={state?.fieldErrors?.newPassword?.[0]}
        hint="12–128 characters. Other sessions will be signed out."
        required
      >
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword?.[0]}
        required
      >
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </FormField>
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
