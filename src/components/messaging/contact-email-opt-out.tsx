"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/ui/form-field";

export function ContactEmailOptOut({
  action,
  optedOut,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  optedOut: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("messaging");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {optedOut ? <Badge variant="warning">{t("doNotEmailStatus")}</Badge> : null}
        <form action={formAction}>
          <input type="hidden" name="optOut" value={optedOut ? "false" : "true"} />
          <Button type="submit" variant="outline" size="sm" disabled={pending}>
            {optedOut ? t("allowEmail") : t("doNotEmail")}
          </Button>
        </form>
      </div>
      <FormError message={state?.error} />
    </div>
  );
}
