"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/messaging/rich-text-editor";

type AudienceOption = { id: string; name: string; count: number; archived?: boolean };

type MessageInitial = {
  subject: string;
  initialHtml: string;
  groupId: string | null;
  segmentId: string | null;
};

export function MessageForm({
  action,
  groups,
  segments,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  groups: AudienceOption[];
  segments: AudienceOption[];
  initial?: MessageInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("messaging");
  const tCommon = useTranslations("common");

  const [kind, setKind] = useState<"group" | "segment">(
    initial?.segmentId ? "segment" : initial?.groupId || groups.length > 0 ? "group" : "segment",
  );
  const [groupId, setGroupId] = useState(initial?.groupId ?? groups[0]?.id ?? "");
  const [segmentId, setSegmentId] = useState(initial?.segmentId ?? segments[0]?.id ?? "");

  const options = kind === "group" ? groups : segments;
  const selected = options.find((option) => option.id === (kind === "group" ? groupId : segmentId));
  const selectionMissing = options.length === 0;
  const bodyError = state?.fieldErrors?.bodyHtml?.[0] ?? state?.fieldErrors?.body?.[0];

  return (
    <form action={formAction} className="space-y-6">
      <FormError message={state?.error} />

      <FormField
        label={tCommon("subject")}
        htmlFor="subject"
        error={state?.fieldErrors?.subject?.[0]}
        required
      >
        <Input
          id="subject"
          name="subject"
          defaultValue={initial?.subject ?? ""}
          maxLength={200}
          required
          autoFocus
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("audienceType")} htmlFor="audienceKind" required>
          <select
            id="audienceKind"
            value={kind}
            onChange={(event) => setKind(event.target.value as "group" | "segment")}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="group">{t("recipientGroup")}</option>
            <option value="segment">{t("segment")}</option>
          </select>
        </FormField>

        {kind === "group" ? (
          <FormField
            label={t("recipientGroup")}
            htmlFor="groupId"
            error={state?.fieldErrors?.groupId?.[0]}
            hint={selected ? t("memberCount", { count: selected.count }) : undefined}
            required
          >
            <select
              id="groupId"
              name="groupId"
              value={groupId}
              onChange={(event) => setGroupId(event.target.value)}
              disabled={selectionMissing}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} ({group.count})
                  {group.archived ? ` · ${t("archivedGroup")}` : ""}
                </option>
              ))}
            </select>
          </FormField>
        ) : (
          <FormField
            label={t("segment")}
            htmlFor="segmentId"
            error={state?.fieldErrors?.segmentId?.[0] ?? state?.fieldErrors?.groupId?.[0]}
            hint={selected ? t("segmentAudienceHint", { count: selected.count }) : undefined}
            required
          >
            <select
              id="segmentId"
              name="segmentId"
              value={segmentId}
              onChange={(event) => setSegmentId(event.target.value)}
              disabled={selectionMissing}
              required
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} ({segment.count})
                  {segment.archived ? ` · ${t("archivedGroup")}` : ""}
                </option>
              ))}
            </select>
          </FormField>
        )}
      </div>

      {selectionMissing ? (
        <p className="rounded-md border border-dashed bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {t("noAudiencesDescription")}{" "}
          <Link href="/messages/groups/new" className="font-medium underline">
            {t("newGroup")}
          </Link>
        </p>
      ) : null}

      <FormField
        label={t("message")}
        htmlFor="body"
        error={bodyError}
        hint={t("richTextHint")}
        required
      >
        <RichTextEditor
          initialHtml={initial?.initialHtml ?? ""}
          label={t("message")}
          invalid={Boolean(bodyError)}
        />
      </FormField>
      <div className="-mt-3 space-y-1">
        <p className="text-xs text-muted-foreground">{t("mergeFieldsHint")}</p>
        <code className="text-xs text-muted-foreground">
          {"{{firstName}} {{lastName}} {{company}}"}
        </code>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref as Route}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending || selectionMissing}>
          {pending ? tCommon("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
