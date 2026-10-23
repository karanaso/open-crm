"use client";

import { useActionState } from "react";
import { Check, CircleSlash, UserX } from "lucide-react";
import { updateViewingStatusAction } from "@/actions/listing-viewings";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";

export function ViewingStatusActions({
  viewingId,
  returnTo,
}: {
  viewingId: string;
  returnTo: string;
}) {
  const t = useListingsTranslator();
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    async (previousState, formData) =>
      updateViewingStatusAction(viewingId, previousState, formData),
    null,
  );

  return (
    <div className="space-y-2">
      <form action={formAction} className="flex flex-wrap gap-1">
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button
          type="submit"
          name="status"
          value="completed"
          variant="outline"
          size="sm"
          disabled={pending}
        >
          <Check className="size-3.5" /> {t("viewings.markCompleted")}
        </Button>
        <Button
          type="submit"
          name="status"
          value="cancelled"
          variant="outline"
          size="sm"
          disabled={pending}
        >
          <CircleSlash className="size-3.5" /> {t("viewings.markCancelled")}
        </Button>
        <Button
          type="submit"
          name="status"
          value="no_show"
          variant="outline"
          size="sm"
          disabled={pending}
        >
          <UserX className="size-3.5" /> {t("viewings.markNoShow")}
        </Button>
      </form>
      <div aria-live="polite">
        <FormError message={state?.error} />
        <FormError message={state?.fieldErrors?.status?.[0]} />
      </div>
    </div>
  );
}