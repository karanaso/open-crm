import { z } from "zod";
import { isListingFeatureKey } from "@/lib/listing-features";
import {
  optionalText,
  optionalUuidSchema,
  requiredText,
} from "@/lib/validation/common";

export const LISTING_TRANSACTIONS = ["sale", "rent"] as const;
export const LISTING_STATUSES = ["active", "inactive"] as const;
export const LISTING_LIST_STATUSES = ["active", "inactive", "all"] as const;
export const RENT_PERIODS = ["month"] as const;
export const PROPERTY_TYPES = [
  "apartment",
  "house",
  "villa",
  "maisonette",
  "plot",
  "commercial",
  "other",
] as const;
export const ENERGY_CLASSES = ["a_plus", "a", "b", "c", "d", "e", "f", "g"] as const;
export const LISTING_SORTS = ["updated", "price_asc", "price_desc", "listed_at"] as const;

export type ListingTransaction = (typeof LISTING_TRANSACTIONS)[number];
export type ListingStatus = (typeof LISTING_STATUSES)[number];
export type PropertyType = (typeof PROPERTY_TYPES)[number];
export type EnergyClass = (typeof ENERGY_CLASSES)[number];
export type ListingFeaturesInput = Record<string, Record<string, boolean>>;

const CURRENT_YEAR = new Date().getUTCFullYear();
const MAX_MONEY = 999_999_999_999.99;

export function isSupportedCurrency(value: string) {
  if (!/^[A-Z]{3}$/.test(value)) return false;
  try {
    new Intl.NumberFormat("en", { style: "currency", currency: value });
    return true;
  } catch {
    return false;
  }
}

export const currencyCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(
    z
      .string()
      .regex(/^[A-Z]{3}$/, "validation.invalid")
      .refine(isSupportedCurrency, "validation.invalid"),
  );

const isEmptyInput = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === "" ||
  (typeof value === "string" && value.trim() === "");

const emptyToNull = (value: unknown) => (isEmptyInput(value) ? null : value);

const emptyToUndefined = (value: unknown) => (isEmptyInput(value) ? undefined : value);

const moneySchema = z.coerce
  .number()
  .min(0, "validation.amountNonNegative")
  .max(MAX_MONEY, "validation.amountTooLarge")
  .refine((value) => Number(value.toFixed(2)) === value, "validation.amountDecimals");

const requiredMoneySchema = z.preprocess(emptyToUndefined, moneySchema);

function optionalIntegerSchema(min: number, max: number) {
  return z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(min, "validation.min").max(max, "validation.max").nullable(),
  );
}

function optionalNumberSchema(min: number, max: number, decimals: number) {
  return z.preprocess(
    emptyToNull,
    z.coerce
      .number()
      .min(min, "validation.min")
      .max(max, "validation.max")
      .refine((value) => Number(value.toFixed(decimals)) === value, "validation.invalid")
      .nullable(),
  );
}

export function normalizeListingFeatures(features: ListingFeaturesInput): ListingFeaturesInput {
  const normalized: ListingFeaturesInput = {};
  for (const [group, keys] of Object.entries(features)) {
    const selected = Object.entries(keys)
      .filter(([, value]) => value)
      .map(([key]) => [key, true] as const);
    if (selected.length > 0) normalized[group] = Object.fromEntries(selected);
  }
  return normalized;
}

const listingFeaturesSchema = z
  .record(z.string(), z.record(z.string(), z.boolean()))
  .superRefine((features, ctx) => {
    for (const [group, keys] of Object.entries(features)) {
      for (const key of Object.keys(keys)) {
        if (!isListingFeatureKey(`${group}.${key}`)) {
          ctx.addIssue({
            code: "custom",
            message: "validation.invalid",
            path: [group, key],
          });
        }
      }
    }
  })
  .default({})
  .transform((features) => normalizeListingFeatures(features));

export const listingInputSchema = z
  .object({
    reference: requiredText(50),
    title: requiredText(200),
    description: optionalText(5000),
    transaction: z.enum(LISTING_TRANSACTIONS),
    pricePeriod: z.preprocess(emptyToNull, z.enum(RENT_PERIODS).nullable()),
    price: requiredMoneySchema,
    commissionAmount: z.preprocess(
      (value) => (isEmptyInput(value) ? 0 : value),
      moneySchema,
    ),
    currency: currencyCodeSchema,
    addressLine1: optionalText(200),
    city: optionalText(120),
    region: optionalText(120),
    postalCode: optionalText(30),
    country: optionalText(120),
    propertyType: z.enum(PROPERTY_TYPES),
    bedrooms: optionalIntegerSchema(0, 1000),
    bathrooms: optionalNumberSchema(0, 99.9, 1),
    sizeSqm: optionalNumberSchema(0, 99_999_999.99, 2),
    lotSqm: optionalNumberSchema(0, 9_999_999_999.99, 2),
    yearBuilt: optionalIntegerSchema(1000, CURRENT_YEAR),
    floors: optionalIntegerSchema(0, 1000),
    parking: optionalIntegerSchema(0, 10_000),
    energyClass: z.preprocess(emptyToNull, z.enum(ENERGY_CLASSES).nullable()),
    sellerContactId: z.string().uuid("validation.uuid"),
    ownerId: optionalUuidSchema,
    features: listingFeaturesSchema,
  })
  .refine((data) => data.transaction !== "rent" || data.pricePeriod === "month", {
    message: "validation.required",
    path: ["pricePeriod"],
  })
  .refine((data) => data.transaction !== "sale" || data.pricePeriod === null, {
    message: "validation.invalid",
    path: ["pricePeriod"],
  });

export type ListingInput = z.infer<typeof listingInputSchema>;

export const listingStatusSchema = z.object({
  listingId: z.string().uuid("validation.uuid"),
  status: z.enum(LISTING_STATUSES),
});

export type ListingStatusInput = z.infer<typeof listingStatusSchema>;

const featureFilterSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value;
    return String(value)
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
  },
  z.array(z.string()).default([]),
);

export const listingListParamsSchema = z
  .object({
    q: z.string().trim().optional().default(""),
    transaction: z.preprocess(emptyToUndefined, z.enum(LISTING_TRANSACTIONS).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(LISTING_LIST_STATUSES).default("active")),
    propertyType: z.preprocess(emptyToUndefined, z.enum(PROPERTY_TYPES).optional()),
    city: z.preprocess(emptyToUndefined, z.string().trim().optional()),
    bedrooms: z.preprocess(
      emptyToUndefined,
      z.coerce.number().int().min(0, "validation.min").optional(),
    ),
    minPrice: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0, "validation.amountNonNegative").optional(),
    ),
    maxPrice: z.preprocess(
      emptyToUndefined,
      z.coerce.number().min(0, "validation.amountNonNegative").optional(),
    ),
    currency: z.preprocess(emptyToUndefined, currencyCodeSchema.optional()),
    features: featureFilterSchema,
    sort: z.preprocess(emptyToUndefined, z.enum(LISTING_SORTS).default("updated")),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .superRefine((params, ctx) => {
    const hasPriceRange = params.minPrice !== undefined || params.maxPrice !== undefined;
    const priceSort = params.sort === "price_asc" || params.sort === "price_desc";
    if ((hasPriceRange || priceSort) && !params.currency) {
      ctx.addIssue({
        code: "custom",
        message: "validation.invalid",
        path: ["currency"],
      });
    }
    if (
      params.minPrice !== undefined &&
      params.maxPrice !== undefined &&
      params.minPrice > params.maxPrice
    ) {
      ctx.addIssue({
        code: "custom",
        message: "validation.min",
        path: ["maxPrice"],
      });
    }
    for (const feature of params.features) {
      if (!isListingFeatureKey(feature)) {
        ctx.addIssue({
          code: "custom",
          message: "validation.invalid",
          path: ["features"],
        });
      }
    }
  });

export type ListingListParams = z.infer<typeof listingListParamsSchema>;
