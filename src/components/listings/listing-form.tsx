"use client";

import Link from "next/link";
import type { Route } from "next";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { ActionState } from "@/lib/action-state";
import { Button } from "@/components/ui/button";
import { FormError, FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FeaturePicker } from "@/components/listings/listing-feature-picker";
import type { ListingFeaturesValue } from "@/components/listings/feature-catalog";
import { ENERGY_CLASSES, PROPERTY_TYPES } from "@/lib/validation/listing";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";

type SellerOption = {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string | null;
  archivedAt?: Date | string | null;
};

type OwnerOption = { id: string; name: string; status: "active" | "inactive" };

export type ListingFormInitial = {
  reference: string;
  title: string;
  description: string | null;
  transaction: "sale" | "rent";
  price: string;
  currency: string;
  commissionAmount: string;
  propertyType: (typeof PROPERTY_TYPES)[number];
  bedrooms: number | null;
  bathrooms: string | null;
  sizeSqm: string | null;
  lotSqm: string | null;
  yearBuilt: number | null;
  floors: number | null;
  parking: number | null;
  energyClass: (typeof ENERGY_CLASSES)[number] | null;
  addressLine1: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  sellerContactId: string;
  ownerId: string;
  features: ListingFeaturesValue;
};

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";

function SellerLabel({ seller, archivedSuffix }: { seller: SellerOption; archivedSuffix: string }) {
  const name = `${seller.firstName} ${seller.lastName}`.trim();
  return (
    <>
      {name}
      {seller.companyName ? ` · ${seller.companyName}` : ""}
      {seller.archivedAt ? archivedSuffix : ""}
    </>
  );
}

export function ListingForm({
  action,
  sellers,
  owners,
  defaultOwnerId,
  defaultCurrency,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  sellers: SellerOption[];
  owners: OwnerOption[];
  defaultOwnerId: string;
  defaultCurrency: string;
  initial?: ListingFormInitial;
  submitLabel: string;
  cancelHref: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const t = useListingsTranslator();
  const tCommon = useTranslations("common");
  const [transaction, setTransaction] = useState<"sale" | "rent">(
    initial?.transaction ?? "sale",
  );
  const currentYear = new Date().getFullYear();

  return (
    <form action={formAction} className="space-y-8">
      <FormError message={state?.error} />

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("sections.basics")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("reference")}
            htmlFor="reference"
            error={state?.fieldErrors?.reference?.[0]}
            required
          >
            <Input
              id="reference"
              name="reference"
              defaultValue={initial?.reference ?? ""}
              maxLength={50}
              required
              autoFocus
            />
          </FormField>
          <FormField
            label={t("titleField")}
            htmlFor="title"
            error={state?.fieldErrors?.title?.[0]}
            required
          >
            <Input
              id="title"
              name="title"
              defaultValue={initial?.title ?? ""}
              maxLength={200}
              required
            />
          </FormField>
          <FormField
            label={t("transaction")}
            htmlFor="transaction"
            error={state?.fieldErrors?.transaction?.[0]}
            required
          >
            <select
              id="transaction"
              name="transaction"
              value={transaction}
              onChange={(event) => setTransaction(event.target.value as "sale" | "rent")}
              className={selectClass}
              required
            >
              <option value="sale">{t("enums.transaction.sale")}</option>
              <option value="rent">{t("enums.transaction.rent")}</option>
            </select>
          </FormField>
          <FormField
            label={t("seller")}
            htmlFor="sellerContactId"
            error={state?.fieldErrors?.sellerContactId?.[0]}
            required
          >
            <select
              id="sellerContactId"
              name="sellerContactId"
              defaultValue={initial?.sellerContactId ?? ""}
              className={selectClass}
              required
            >
              <option value="" disabled>
                {t("selectSeller")}
              </option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  <SellerLabel seller={seller} archivedSuffix={tCommon("archivedSuffix")} />
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("agent")}
            htmlFor="ownerId"
            error={state?.fieldErrors?.ownerId?.[0]}
            required
          >
            <select
              id="ownerId"
              name="ownerId"
              defaultValue={initial?.ownerId ?? defaultOwnerId}
              className={selectClass}
              required
            >
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                  {owner.status === "inactive" ? tCommon("inactiveSuffix") : ""}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={t("propertyType")}
            htmlFor="propertyType"
            error={state?.fieldErrors?.propertyType?.[0]}
            required
          >
            <select
              id="propertyType"
              name="propertyType"
              defaultValue={initial?.propertyType ?? "apartment"}
              className={selectClass}
              required
            >
              {PROPERTY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(`enums.propertyType.${type}`)}
                </option>
              ))}
            </select>
          </FormField>
          <FormField
            label={tCommon("description")}
            htmlFor="description"
            error={state?.fieldErrors?.description?.[0]}
            className="sm:col-span-2"
          >
            <Textarea
              id="description"
              name="description"
              defaultValue={initial?.description ?? ""}
              maxLength={5000}
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("sections.pricing")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("price")}
            htmlFor="price"
            error={state?.fieldErrors?.price?.[0]}
            hint={t("priceHint")}
            required
          >
            <Input
              id="price"
              name="price"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.price ?? ""}
              required
            />
          </FormField>
          <FormField
            label={t("currency")}
            htmlFor="currency"
            error={state?.fieldErrors?.currency?.[0]}
            hint={t("currencyHint")}
            required
          >
            <Input
              id="currency"
              name="currency"
              defaultValue={initial?.currency ?? defaultCurrency}
              maxLength={3}
              minLength={3}
              pattern="[A-Za-z]{3}"
              className="uppercase"
              required
            />
          </FormField>
          {transaction === "rent" ? (
            <FormField
              label={t("pricePeriod")}
              htmlFor="pricePeriod"
              error={state?.fieldErrors?.pricePeriod?.[0]}
              required
            >
              <select
                id="pricePeriod"
                name="pricePeriod"
                defaultValue="month"
                className={selectClass}
                required
              >
                <option value="month">{t("monthly")}</option>
              </select>
            </FormField>
          ) : null}
          <FormField
            label={t("commissionAmount")}
            htmlFor="commissionAmount"
            error={state?.fieldErrors?.commissionAmount?.[0]}
            hint={t("commissionHint")}
          >
            <Input
              id="commissionAmount"
              name="commissionAmount"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.commissionAmount ?? "0"}
            />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("sections.property")}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FormField label={t("bedrooms")} htmlFor="bedrooms" error={state?.fieldErrors?.bedrooms?.[0]}>
            <Input
              id="bedrooms"
              name="bedrooms"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.bedrooms ?? ""}
            />
          </FormField>
          <FormField label={t("bathrooms")} htmlFor="bathrooms" error={state?.fieldErrors?.bathrooms?.[0]}>
            <Input
              id="bathrooms"
              name="bathrooms"
              type="number"
              min={0}
              step="0.1"
              defaultValue={initial?.bathrooms ?? ""}
            />
          </FormField>
          <FormField label={t("sizeSqm")} htmlFor="sizeSqm" error={state?.fieldErrors?.sizeSqm?.[0]}>
            <Input
              id="sizeSqm"
              name="sizeSqm"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.sizeSqm ?? ""}
            />
          </FormField>
          <FormField label={t("lotSqm")} htmlFor="lotSqm" error={state?.fieldErrors?.lotSqm?.[0]}>
            <Input
              id="lotSqm"
              name="lotSqm"
              type="number"
              min={0}
              step="0.01"
              defaultValue={initial?.lotSqm ?? ""}
            />
          </FormField>
          <FormField label={t("yearBuilt")} htmlFor="yearBuilt" error={state?.fieldErrors?.yearBuilt?.[0]}>
            <Input
              id="yearBuilt"
              name="yearBuilt"
              type="number"
              min={1000}
              max={currentYear}
              step={1}
              defaultValue={initial?.yearBuilt ?? ""}
            />
          </FormField>
          <FormField label={t("floors")} htmlFor="floors" error={state?.fieldErrors?.floors?.[0]}>
            <Input
              id="floors"
              name="floors"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.floors ?? ""}
            />
          </FormField>
          <FormField label={t("parking")} htmlFor="parking" error={state?.fieldErrors?.parking?.[0]}>
            <Input
              id="parking"
              name="parking"
              type="number"
              min={0}
              step={1}
              defaultValue={initial?.parking ?? ""}
            />
          </FormField>
          <FormField
            label={t("energyClass")}
            htmlFor="energyClass"
            error={state?.fieldErrors?.energyClass?.[0]}
          >
            <select
              id="energyClass"
              name="energyClass"
              defaultValue={initial?.energyClass ?? ""}
              className={selectClass}
            >
              <option value="">{t("energyClassNone")}</option>
              {ENERGY_CLASSES.map((energyClass) => (
                <option key={energyClass} value={energyClass}>
                  {t(`enums.energyClass.${energyClass}`)}
                </option>
              ))}
            </select>
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("sections.address")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("addressLine1")}
            htmlFor="addressLine1"
            error={state?.fieldErrors?.addressLine1?.[0]}
            className="sm:col-span-2"
          >
            <Input
              id="addressLine1"
              name="addressLine1"
              defaultValue={initial?.addressLine1 ?? ""}
              maxLength={200}
            />
          </FormField>
          <FormField label={t("city")} htmlFor="city" error={state?.fieldErrors?.city?.[0]}>
            <Input id="city" name="city" defaultValue={initial?.city ?? ""} maxLength={120} />
          </FormField>
          <FormField label={t("region")} htmlFor="region" error={state?.fieldErrors?.region?.[0]}>
            <Input id="region" name="region" defaultValue={initial?.region ?? ""} maxLength={120} />
          </FormField>
          <FormField
            label={t("postalCode")}
            htmlFor="postalCode"
            error={state?.fieldErrors?.postalCode?.[0]}
          >
            <Input
              id="postalCode"
              name="postalCode"
              defaultValue={initial?.postalCode ?? ""}
              maxLength={30}
            />
          </FormField>
          <FormField label={t("country")} htmlFor="country" error={state?.fieldErrors?.country?.[0]}>
            <Input id="country" name="country" defaultValue={initial?.country ?? ""} maxLength={120} />
          </FormField>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-base font-semibold">{t("sections.features")}</h2>
        <FeaturePicker name="features" initialFeatures={initial?.features} />
      </section>

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