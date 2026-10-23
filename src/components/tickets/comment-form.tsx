"use client";

import { useActionState } from "react";
import { addCommentAction } from "@/actions/tickets";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ ticketId, returnTo }: { ticketId: string; returnTo: string }) {
  const [state, action, pending] = useActionState(addCommentAction.bind(null, ticketId), null);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="returnTo" value={returnTo} />
      <FormError message={state?.error} />
      <FormField label="Add a comment" htmlFor="comment-body" error={state?.fieldErrors?.body?.[0]} required>
        <Textarea
          id="comment-body"
          name="body"
          placeholder="Reply to the ticket or capture an internal note…"
          required
        />
      </FormField>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <select
          name="visibility"
          defaultValue="reply"
          aria-label="Comment visibility"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="reply">Reply — visible to everyone</option>
          <option value="internal">Internal note — admins and assignee</option>
        </select>
        <Button type="submit" disabled={pending}>
          {pending ? "Posting…" : "Add comment"}
        </Button>
      </div>
    </form>
  );
}
