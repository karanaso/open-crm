"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction.bind(null, token), null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField
        label="New password"
        htmlFor="password"
        error={state?.fieldErrors?.password?.[0]}
        hint="Use 12–128 characters."
        required
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Create a strong password"
          required
          autoFocus
        />
      </FormField>
      <FormField
        label="Confirm new password"
        htmlFor="confirmPassword"
        error={state?.fieldErrors?.confirmPassword?.[0]}
        required
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat the password"
          required
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating password…" : "Update password"}
      </Button>
    </form>
  );
}
