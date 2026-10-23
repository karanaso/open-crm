"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tEnums = useTranslations("enums");
  const tCommon = useTranslations("common");

  return (
    <form action={action} className="space-y-4">
      <FormError message={state?.error} />
      <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
        <FormField label={tAuth("email")} htmlFor="invite-email" error={state?.fieldErrors?.email?.[0]} required>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder={t("teammateEmailPlaceholder")}
            required
          />
        </FormField>
        <FormField label={t("role")} htmlFor="invite-role" error={state?.fieldErrors?.role?.[0]} required>
          <select
            id="invite-role"
            name="role"
            defaultValue="member"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="member">{tEnums("role.member")}</option>
            <option value="admin">{tEnums("role.admin")}</option>
          </select>
        </FormField>
        <Button type="submit" disabled={pending}>
          <MailPlus className="size-4" /> {pending ? t("creatingInvitation") : t("createInvitation")}
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
              <Copy className="size-3.5" /> {tCommon("copy")}
            </Button>
          </div>
          <p className="mt-1 text-xs">{t("inviteLinkOnce")}</p>
        </div>
      ) : null}
    </form>
  );
}
