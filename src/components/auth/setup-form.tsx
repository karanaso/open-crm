"use client";

import { useActionState } from "react";
import { setupAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export function SetupForm() {
  const [state, action, pending] = useActionState(setupAction, null);

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <FormField label="Your name" htmlFor="name" error={state?.fieldErrors?.name?.[0]} required>
        <Input id="name" name="name" autoComplete="name" placeholder="Alex Morgan" required autoFocus />
      </FormField>
      <FormField label="Work email" htmlFor="email" error={state?.fieldErrors?.email?.[0]} required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          required
        />
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
        {pending ? "Creating workspace…" : "Create workspace"}
      </Button>
    </form>
  );
}
