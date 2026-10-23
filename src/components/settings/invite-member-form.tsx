"use client";

import { useActionState } from "react";
import { Copy, MailPlus } from "lucide-react";
import { toast } from "sonner";
import { createInviteAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/action-state";
import { useMessageTranslator } from "@/i18n/messages";

export function InviteMemberForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createInviteAction, null);
  const translate = useMessageTranslator();

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <FormField label="Email" htmlFor="invite-email" error={state?.fieldErrors?.email?.[0]} required>
          <Input id="invite-email" name="email" type="email" placeholder="teammate@company.com" required />
        </FormField>
        <FormField label="Role" htmlFor="invite-role" error={state?.fieldErrors?.role?.[0]} required>
          <select
            id="invite-role"
            name="role"
            defaultValue="member"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Administrator</option>
          </select>
        </FormField>
        <Button type="submit" disabled={pending}>
          <MailPlus className="size-4" /> {pending ? "Creating…" : "Create invitation"}
        </Button>
      </div>

      {state?.inviteUrl ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <p className="font-medium">
            {state.success ? translate(state.success) : null}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Input readOnly value={state.inviteUrl} className="bg-white font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                await navigator.clipboard.writeText(state.inviteUrl!);
                toast.success(translate("settings.inviteLinkCopied"));
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
          <p className="mt-1 text-xs">This link is shown once. Share it securely.</p>
        </div>
      ) : null}
    </form>
  );
}
