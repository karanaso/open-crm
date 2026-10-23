"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type PipelineOption = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{ id: string; name: string; outcome: "open" | "won" | "lost"; position: number }>;
};

type ContactOption = { id: string; firstName: string; lastName: string; companyId: string | null };

type DealInitial = {
  name: string;
  companyId: string;
  contactId: string | null;
  pipelineId: string;
  stageId: string;
  ownerId: string;
  amount: string;
  expectedCloseDate: string | null;
  description: string | null;
  lostReason: string | null;
  updatedAt: string;
};

export function DealForm({
  action,
  pipelines,
  companies,
  contacts,
  owners,
  defaultOwnerId,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  pipelines: PipelineOption[];
  companies: Array<{ id: string; name: string }>;
  contacts: ContactOption[];
  owners: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  defaultOwnerId: string;
  initial?: DealInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const defaultPipeline =
    pipelines.find((pipeline) => pipeline.id === initial?.pipelineId) ??
    pipelines.find((pipeline) => pipeline.isDefault) ??
    pipelines[0];
  const [pipelineId, setPipelineId] = useState(defaultPipeline?.id ?? "");
  const [stageId, setStageId] = useState(
    initial?.stageId ?? defaultPipeline?.stages[0]?.id ?? "",
  );
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "");
  const [contactId, setContactId] = useState(initial?.contactId ?? "none");

  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId);
  const selectedStage = selectedPipeline?.stages.find((stage) => stage.id === stageId);
  const availableContacts = useMemo(
    () => contacts.filter((contact) => !companyId || contact.companyId === companyId),
    [companyId, contacts],
  );

  return (
    <form action={formAction} className="space-y-6">
      {initial ? <input type="hidden" name="expectedUpdatedAt" value={initial.updatedAt} /> : null}
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("dealName")} htmlFor="name" error={state?.fieldErrors?.name?.[0]} className="sm:col-span-2" required>
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
        </FormField>

        <FormField label={tCommon("company")} htmlFor="companyId" error={state?.fieldErrors?.companyId?.[0]} required>
          <select
            id="companyId"
            name="companyId"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              setContactId("none");
            }}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{tCommon("selectCompany")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("primaryContact")} htmlFor="contactId" error={state?.fieldErrors?.contactId?.[0]}>
          <select
            id="contactId"
            name="contactId"
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="none">{t("noPrimaryContact")}</option>
            {availableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("pipeline")} htmlFor="pipelineId" error={state?.fieldErrors?.pipelineId?.[0]} required>
          <select
            id="pipelineId"
            name="pipelineId"
            value={pipelineId}
            onChange={(event) => {
              const nextPipeline = pipelines.find((pipeline) => pipeline.id === event.target.value);
              setPipelineId(event.target.value);
              setStageId(nextPipeline?.stages[0]?.id ?? "");
            }}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
                {pipeline.isDefault ? t("defaultSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("stage")} htmlFor="stageId" error={state?.fieldErrors?.stageId?.[0]} required>
          <select
            id="stageId"
            name="stageId"
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {selectedPipeline?.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("amountUsd")} htmlFor="amount" error={state?.fieldErrors?.amount?.[0]} required>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={initial?.amount ?? "0"}
            required
          />
        </FormField>

        <FormField label={tCommon("owner")} htmlFor="ownerId" error={state?.fieldErrors?.ownerId?.[0]} required>
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.ownerId ?? defaultOwnerId}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.name}
                {owner.status === "inactive" ? tCommon("inactiveSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label={t("expectedCloseDate")} htmlFor="expectedCloseDate">
          <Input
            id="expectedCloseDate"
            name="expectedCloseDate"
            type="date"
            defaultValue={initial?.expectedCloseDate ?? ""}
          />
        </FormField>

        {selectedStage?.outcome === "lost" ? (
          <FormField
            label={t("lostReason")}
            htmlFor="lostReason"
            error={state?.fieldErrors?.lostReason?.[0]}
            className="sm:col-span-2"
            required
          >
            <Input
              id="lostReason"
              name="lostReason"
              defaultValue={initial?.lostReason ?? ""}
              placeholder={t("lostReasonPlaceholder")}
              required
            />
          </FormField>
        ) : (
          <input type="hidden" name="lostReason" value={initial?.lostReason ?? ""} />
        )}
      </div>

      <FormField label={tCommon("description")} htmlFor="description">
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </FormField>

      <div className="flex justify-end gap-2">
        <Button variant="outline" asChild>
          <Link href={cancelHref as Route}>{tCommon("cancel")}</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? tCommon("saving") : submitLabel}
        </Button>
      </div>
    </form>
  );
}
