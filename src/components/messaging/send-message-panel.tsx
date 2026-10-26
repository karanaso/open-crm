"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormError } from "@/components/ui/form-field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type AudiencePreview = {
  total: number;
  eligible: number;
  skipped: { archived: number; missingEmail: number; optedOut: number };
};

export function SendMessagePanel({
  messageId,
  action,
  preview,
  cap,
  configured,
}: {
  messageId: string;
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  preview: AudiencePreview;
  cap: number;
  configured: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [open, setOpen] = useState(false);
  const t = useTranslations("messaging");
  const formId = `send-message-${messageId}`;

  const blockedReason = !configured
    ? t("transportNotConfigured")
    : preview.eligible === 0
      ? t("sendBlockedEmpty")
      : preview.eligible > cap
        ? t("sendBlockedLimit", { limit: cap })
        : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("reviewAndSend")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">{t("totalAudience")}</dt>
            <dd className="text-xl font-semibold">{preview.total}</dd>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">{t("eligibleRecipients")}</dt>
            <dd className="text-xl font-semibold">{preview.eligible}</dd>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <dt className="text-muted-foreground text-xs">{t("ineligibleRecipients")}</dt>
            <dd className="text-xl font-semibold">
              {preview.skipped.archived + preview.skipped.missingEmail + preview.skipped.optedOut}
            </dd>
          </div>
        </dl>

        <div className="text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>{t("skippedArchived", { count: preview.skipped.archived })}</span>
          <span>{t("skippedOptedOut", { count: preview.skipped.optedOut })}</span>
          <span>{t("skippedMissingEmail", { count: preview.skipped.missingEmail })}</span>
        </div>

        <p className="text-xs text-muted-foreground">{t("recipientLimit", { limit: cap })}</p>

        {!configured ? (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
            {t("transportNotConfiguredDescription")}
          </p>
        ) : null}
        {configured && blockedReason ? (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {blockedReason}
          </p>
        ) : null}

        <FormError message={state?.error} />

        <form id={formId} action={formAction}>
          {blockedReason ? (
            <Button type="button" disabled className="w-full">
              {t("send")}
            </Button>
          ) : (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="w-full" disabled={pending}>
                  {pending ? t("sending") : t("reviewAndSend")}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t("sendConfirmTitle")}</DialogTitle>
                  <DialogDescription>{t("sendConfirmDescription")}</DialogDescription>
                </DialogHeader>
                <p className="text-sm">
                  {t("audienceSummary", { eligible: preview.eligible, total: preview.total })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("recipientLimit", { limit: cap })}
                </p>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {t("cancelMessage")}
                    </Button>
                  </DialogClose>
                  <Button
                    type="submit"
                    form={formId}
                    disabled={pending}
                    onClick={() => setOpen(false)}
                  >
                    {pending ? t("sending") : t("send")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
