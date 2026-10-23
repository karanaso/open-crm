"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/i18n/format";

type PipelineOption = {
  id: string;
  name: string;
  isDefault: boolean;
  stages: Array<{ id: string; name: string; outcome: "open" | "won" | "lost"; position: number }>;
};

type CompanyOption = { id: string; name: string; archived?: boolean };

type ContactOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyId: string | null;
  archived?: boolean;
};

export type ListingOption = {
  id: string;
  reference: string;
  title: string;
  transaction: "sale" | "rent";
  price: string;
  pricePeriod?: "month" | null;
  currency: string;
  commissionAmount?: string | null;
  status?: "active" | "inactive";
};

type DealInitial = {
  name: string;
  companyId: string | null;
  contactId: string;
  listingId: string | null;
  pipelineId: string;
  stageId: string;
  ownerId: string;
  propertyPrice: string | null;
  amount: string;
  currency: string;
  expectedCloseDate: string | null;
  description: string | null;
  lostReason: string | null;
  updatedAt: string;
};

const FALLBACK_CURRENCIES = ["EUR", "GBP", "USD"];

type SalesTranslator = (key: string, values?: Record<string, string | number>) => string;

function currencyCodes(current: string) {
  let codes: string[] = FALLBACK_CURRENCIES;
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      codes = Intl.supportedValuesOf("currency");
    } catch {
      codes = FALLBACK_CURRENCIES;
    }
  }
  const sorted = [...codes].sort();
  return current && !sorted.includes(current) ? [current, ...sorted] : sorted;
}

export function DealForm({
  action,
  pipelines,
  companies,
  contacts,
  listings,
  owners,
  defaultOwnerId,
  defaultCurrency,
  defaultListingId,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  pipelines: PipelineOption[];
  companies: CompanyOption[];
  contacts: ContactOption[];
  listings: ListingOption[];
  owners: Array<{ id: string; name: string; status: "active" | "inactive" }>;
  defaultOwnerId: string;
  defaultCurrency: string;
  defaultListingId?: string;
  initial?: DealInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useTranslations("sales") as unknown as SalesTranslator;
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const defaultPipeline =
    pipelines.find((pipeline) => pipeline.id === initial?.pipelineId) ??
    pipelines.find((pipeline) => pipeline.isDefault) ??
    pipelines[0];
  const [pipelineId, setPipelineId] = useState(defaultPipeline?.id ?? "");
  const [stageId, setStageId] = useState(initial?.stageId ?? defaultPipeline?.stages[0]?.id ?? "");
  const [companyId, setCompanyId] = useState(initial?.companyId ?? "none");
  const [contactId, setContactId] = useState(initial?.contactId ?? "");
  const initialListingId = initial?.listingId ?? defaultListingId ?? "none";
  const presetListing = listings.find((listing) => listing.id === initialListingId);
  const [listingId, setListingId] = useState(initialListingId);
  const [currency, setCurrency] = useState(
    initial?.currency ?? presetListing?.currency ?? defaultCurrency,
  );
  const [propertyPrice, setPropertyPrice] = useState(
    initial?.propertyPrice ?? presetListing?.price ?? "",
  );
  const [amount, setAmount] = useState(initial?.amount ?? presetListing?.commissionAmount ?? "0");

  const selectedPipeline = pipelines.find((pipeline) => pipeline.id === pipelineId);
  const selectedStage = selectedPipeline?.stages.find((stage) => stage.id === stageId);
  const selectedListing = listings.find((listing) => listing.id === listingId);
  const companyFilter = companyId === "none" ? null : companyId;
  const availableContacts = useMemo(
    () => contacts.filter((contact) => !companyFilter || contact.companyId === companyFilter),
    [companyFilter, contacts],
  );
  const currencies = useMemo(() => currencyCodes(currency), [currency]);

  function handleListingChange(value: string) {
    setListingId(value);
    const listing = listings.find((item) => item.id === value);
    if (!listing) return;
    setCurrency(listing.currency);
    setPropertyPrice(listing.price);
    setAmount(listing.commissionAmount ?? "");
  }

  return (
    <form action={formAction} className="space-y-6">
      {initial ? <input type="hidden" name="expectedUpdatedAt" value={initial.updatedAt} /> : null}
      <FormError message={state?.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t("dealName")}
          htmlFor="name"
          error={state?.fieldErrors?.name?.[0]}
          className="sm:col-span-2"
          required
        >
          <Input id="name" name="name" defaultValue={initial?.name ?? ""} required autoFocus />
        </FormField>

        <FormField
          label={tCommon("company")}
          htmlFor="companyId"
          error={state?.fieldErrors?.companyId?.[0]}
        >
          <select
            id="companyId"
            name="companyId"
            value={companyId}
            onChange={(event) => {
              setCompanyId(event.target.value);
              setContactId("");
            }}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="none">{t("noCompanyOption")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
                {company.archived ? tCommon("archivedSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("primaryContact")}
          htmlFor="contactId"
          error={state?.fieldErrors?.contactId?.[0]}
          required
        >
          <select
            id="contactId"
            name="contactId"
            value={contactId}
            onChange={(event) => setContactId(event.target.value)}
            required
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="" disabled>
              {t("selectContact")}
            </option>
            {availableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.firstName} {contact.lastName}
                {contact.archived ? tCommon("archivedSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("listing")}
          htmlFor="listingId"
          error={state?.fieldErrors?.listingId?.[0]}
          className="sm:col-span-2"
        >
          <select
            id="listingId"
            name="listingId"
            value={listingId}
            onChange={(event) => handleListingChange(event.target.value)}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            <option value="none">{t("noListing")}</option>
            {listings.map((listing) => (
              <option key={listing.id} value={listing.id}>
                {[
                  listing.reference,
                  listing.title,
                  formatCurrency(Number(listing.price), locale, listing.currency),
                  listing.status === "inactive" ? tCommon("inactiveSuffix") : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("pipeline")}
          htmlFor="pipelineId"
          error={state?.fieldErrors?.pipelineId?.[0]}
          required
        >
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
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
                {pipeline.isDefault ? t("defaultSuffix") : ""}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("stage")}
          htmlFor="stageId"
          error={state?.fieldErrors?.stageId?.[0]}
          required
        >
          <select
            id="stageId"
            name="stageId"
            value={stageId}
            onChange={(event) => setStageId(event.target.value)}
            required
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {selectedPipeline?.stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("propertyPrice")}
          htmlFor="propertyPrice"
          error={state?.fieldErrors?.propertyPrice?.[0]}
        >
          <Input
            id="propertyPrice"
            name="propertyPrice"
            type="number"
            min={0}
            step="0.01"
            value={propertyPrice}
            onChange={(event) => setPropertyPrice(event.target.value)}
          />
        </FormField>

        <FormField
          label={t("currency")}
          htmlFor="currency"
          error={state?.fieldErrors?.currency?.[0]}
          required
        >
          <select
            id="currency"
            name="currency"
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
            required
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label={t("commission")}
          htmlFor="amount"
          error={state?.fieldErrors?.amount?.[0]}
          required={!selectedListing}
        >
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required={!selectedListing}
          />
        </FormField>

        <FormField
          label={tCommon("owner")}
          htmlFor="ownerId"
          error={state?.fieldErrors?.ownerId?.[0]}
          required
        >
          <select
            id="ownerId"
            name="ownerId"
            defaultValue={initial?.ownerId ?? defaultOwnerId}
            className="border-input bg-background flex h-9 w-full rounded-md border px-3 text-sm"
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
