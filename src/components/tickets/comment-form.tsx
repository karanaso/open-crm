"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addCommentAction } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ ticketId, returnTo }: { ticketId: string; returnTo: string }) {
  const [state, action, pending] = useActionState(addCommentAction.bind(null, ticketId), null);
  const t = useTranslations("support");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <FormError message={state?.error} />
      <FormField label={t("addComment")} htmlFor="comment-body" error={state?.fieldErrors?.body?.[0]} required>
        <Textarea
          id="comment-body"
          name="body"
          placeholder={t("commentPlaceholder")}
          required
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          name="visibility"
          defaultValue="reply"
          aria-label={t("commentVisibility")}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="reply">{t("replyVisibility")}</option>
          <option value="internal">{t("internalVisibility")}</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? t("posting") : t("postComment")}
        </Button>
      </div>
    </form>
  );
}
