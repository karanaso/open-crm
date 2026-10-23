"use client";

import { useActionState } from "react";
import { acceptInviteAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(acceptInviteAction.bind(null, token), null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField label="Email" htmlFor="invite-email">
        <Input id="invite-email" value={email} readOnly disabled />
      </FormField>
      <FormField label="Your name" htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required autoFocus />
      </FormField>
      <FormField
        label="Password"
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
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Joining workspace…" : "Join workspace"}
      </Button>
    </form>
  );
}
