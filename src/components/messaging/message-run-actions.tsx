"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";

export function MessageRunActions({
  action,
  cancelAction,
  canRetry,
  canCancel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  cancelAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  canRetry: boolean;
  canCancel: boolean;
}) {
  const [retryState, retryAction, retryPending] = useActionState(action, null);
  const [cancelState, cancelActionState, cancelPending] = useActionState(cancelAction, null);
  const t = useTranslations("messaging");

  if (!canRetry && !canCancel) return null;

  return (
    <div className="space-y-3">
      <FormError message={retryState?.error ?? cancelState?.error} />
      <div className="flex flex-wrap gap-2">
        {canRetry ? (
          <form action={retryAction}>
            <Button type="submit" disabled={retryPending}>
              {retryPending ? t("retrying") : t("retryUnsent")}
            </Button>
          </form>
        ) : null}
        {canCancel ? (
          <form
            action={cancelActionState}
            onSubmit={(event) => {
              if (!window.confirm(t("cancelConfirm"))) event.preventDefault();
            }}
          >
            <Button type="submit" variant="outline" disabled={cancelPending}>
              {cancelPending ? t("cancelling") : t("cancelMessage")}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  );
}
