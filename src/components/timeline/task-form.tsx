"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createTaskAction, updateTaskAction } from "@/actions/engagement";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { todayUtc } from "@/lib/dates";

const linkFields = ["companyId", "contactId", "dealId", "ticketId", "campaignId"] as const;

type TaskInitial = {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  priority: "low" | "normal" | "high";
  assigneeId: string | null;
  companyId?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  ticketId?: string | null;
  campaignId?: string | null;
};

export function TaskForm({
  links,
  returnTo,
  assignees,
  initial,
  onCancel,
}: {
  links: Partial<Record<(typeof linkFields)[number], string | null>>;
  returnTo: string;
  assignees: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  initial?: TaskInitial;
  onCancel?: () => void;
}) {
  const action = initial ? updateTaskAction.bind(null, initial.id) : createTaskAction;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(action, null);
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");
  const tEnums = useTranslations("enums");

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="returnTo" value={returnTo} />
      {linkFields.map((field) => (
        <input key={field} type="hidden" name={field} value={links[field] ?? ""} />
      ))}
      <FormError message={state?.error} />

      <FormField label={t("task")} htmlFor="task-title" error={state?.fieldErrors?.title?.[0]} required>
        <Input
          id="task-title"
          name="title"
          defaultValue={initial?.title ?? ""}
          placeholder={t("taskPlaceholder")}
          required
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label={t("dueDate")} htmlFor="dueDate" error={state?.fieldErrors?.dueDate?.[0]} required>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            min={initial ? undefined : todayUtc()}
            defaultValue={initial?.dueDate ?? todayUtc()}
            required
          />
        </FormField>
        <FormField label={tCommon("priority")} htmlFor="task-priority">
          <select
            id="task-priority"
            name="priority"
            defaultValue={initial?.priority ?? "normal"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="low">{tEnums("taskPriority.low")}</option>
            <option value="normal">{tEnums("taskPriority.normal")}</option>
            <option value="high">{tEnums("taskPriority.high")}</option>
          </select>
        </FormField>
        <FormField label={tCommon("assignee")} htmlFor="assigneeId" error={state?.fieldErrors?.assigneeId?.[0]}>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={initial?.assigneeId ?? "none"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">{tCommon("unassigned")}</option>
            {assignees.map((assignee) => (
              <option key={assignee.id} value={assignee.id}>
                {assignee.name}
                {assignee.status === "inactive" ? tCommon("inactiveSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label={tCommon("description")} htmlFor="task-description">
        <Textarea
          id="task-description"
          name="description"
          defaultValue={initial?.description ?? ""}
          placeholder={t("descriptionPlaceholder")}
        />
      </FormField>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : initial ? t("saveTask") : t("createTask")}
        </Button>
      </div>
    </form>
  );
}
