import { z } from "zod";
import { isListingFeatureKey } from "@/lib/listing-features";
import { PROPERTY_TYPES } from "@/lib/validation/listing";

export const PUBLIC_LISTING_TRANSACTIONS = ["sale", "rent"] as const;
export const PUBLIC_LISTING_SORTS = ["newest", "price_asc", "price_desc"] as const;
export const PUBLIC_LISTINGS_PAGE_SIZE_DEFAULT = 20;
export const PUBLIC_LISTINGS_PAGE_SIZE_MAX = 100;
export const PUBLIC_LISTINGS_PAGE_MAX = 10_000;
export const PUBLIC_LISTINGS_BEDROOMS_MAX = 1_000;
export const PUBLIC_LISTINGS_PRICE_MAX = 999_999_999_999.99;

export type PublicListingTransaction = (typeof PUBLIC_LISTING_TRANSACTIONS)[number];
export type PublicListingSort = (typeof PUBLIC_LISTING_SORTS)[number];

const isEmptyInput = (value: unknown) =>
  value === undefined || value === null || (typeof value === "string" && value.trim() === "");

const emptyToUndefined = (value: unknown) => (isEmptyInput(value) ? undefined : value);

const currencySchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{3}$/, "currency must be a three-letter ISO 4217 code"));

const publicListingFeaturesSchema = z
  .array(z.string())
  .max(50, "features must contain at most 50 keys")
  .superRefine((features, ctx) => {
    for (const feature of features) {
      if (!isListingFeatureKey(feature)) {
        ctx.addIssue({
          code: "custom",
          message: `features contains an unknown feature key: ${feature}`,
        });
      }
    }
  })
  .default([])
  .transform((features) => Array.from(new Set(features)));

export const publicListingsQuerySchema = z
  .object({
    page: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number("page must be a number")
        .int("page must be an integer")
        .min(1, "page must be at least 1")
        .max(PUBLIC_LISTINGS_PAGE_MAX, `page must be at most ${PUBLIC_LISTINGS_PAGE_MAX}`)
        .default(1),
    ),
    pageSize: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number("pageSize must be a number")
        .int("pageSize must be an integer")
        .min(1, "pageSize must be at least 1")
        .max(
          PUBLIC_LISTINGS_PAGE_SIZE_MAX,
          `pageSize must be at most ${PUBLIC_LISTINGS_PAGE_SIZE_MAX}`,
        )
        .default(PUBLIC_LISTINGS_PAGE_SIZE_DEFAULT),
    ),
    transaction: z.preprocess(
      emptyToUndefined,
      z
        .enum(PUBLIC_LISTING_TRANSACTIONS, {
          error: "transaction must be one of: sale, rent",
        })
        .optional(),
    ),
    propertyType: z.preprocess(
      emptyToUndefined,
      z
        .enum(PROPERTY_TYPES, {
          error: `propertyType must be one of: ${PROPERTY_TYPES.join(", ")}`,
        })
        .optional(),
    ),
    city: z.preprocess(
      emptyToUndefined,
      z.string().trim().max(120, "city must be at most 120 characters").optional(),
    ),
    bedrooms: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number("bedrooms must be a number")
        .int("bedrooms must be an integer")
        .min(0, "bedrooms must be at least 0")
        .max(
          PUBLIC_LISTINGS_BEDROOMS_MAX,
          `bedrooms must be at most ${PUBLIC_LISTINGS_BEDROOMS_MAX}`,
        )
        .optional(),
    ),
    currency: z.preprocess(emptyToUndefined, currencySchema.optional()),
    minPrice: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number("minPrice must be a number")
        .finite("minPrice must be a finite number")
        .min(0, "minPrice must be at least 0")
        .max(PUBLIC_LISTINGS_PRICE_MAX, `minPrice must be at most ${PUBLIC_LISTINGS_PRICE_MAX}`)
        .optional(),
    ),
    maxPrice: z.preprocess(
      emptyToUndefined,
      z.coerce
        .number("maxPrice must be a number")
        .finite("maxPrice must be a finite number")
        .min(0, "maxPrice must be at least 0")
        .max(PUBLIC_LISTINGS_PRICE_MAX, `maxPrice must be at most ${PUBLIC_LISTINGS_PRICE_MAX}`)
        .optional(),
    ),
    features: publicListingFeaturesSchema,
    sort: z.preprocess(
      emptyToUndefined,
      z
        .enum(PUBLIC_LISTING_SORTS, {
          error: `sort must be one of: ${PUBLIC_LISTING_SORTS.join(", ")}`,
        })
        .default("newest"),
    ),
  })
  .superRefine((params, ctx) => {
    const hasPriceRange = params.minPrice !== undefined || params.maxPrice !== undefined;
    const priceSort = params.sort === "price_asc" || params.sort === "price_desc";
    if ((hasPriceRange || priceSort) && !params.currency) {
      ctx.addIssue({
        code: "custom",
        message: "currency is required when filtering or sorting by price",
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
        message: "maxPrice must be greater than or equal to minPrice",
        path: ["maxPrice"],
      });
    }
  });

export type PublicListingsQuery = z.infer<typeof publicListingsQuerySchema>;

export const publicListingIdSchema = z.string().uuid("id must be a valid UUID");

export type PublicListingsQueryParseResult =
  | { success: true; data: PublicListingsQuery }
  | { success: false; parameter: string; message: string };

function featureValues(searchParams: URLSearchParams) {
  return searchParams
    .getAll("features")
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Parses the public collection query string into the service contract.
 * Unknown parameters are ignored; invalid values return a stable parameter name
 * and message that the route can place in the public error envelope.
 */
export function parsePublicListingsQuery(
  searchParams: URLSearchParams,
): PublicListingsQueryParseResult {
  const parsed = publicListingsQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    transaction: searchParams.get("transaction") ?? undefined,
    propertyType: searchParams.get("propertyType") ?? undefined,
    city: searchParams.get("city") ?? undefined,
    bedrooms: searchParams.get("bedrooms") ?? undefined,
    currency: searchParams.get("currency") ?? undefined,
    minPrice: searchParams.get("minPrice") ?? undefined,
    maxPrice: searchParams.get("maxPrice") ?? undefined,
    features: featureValues(searchParams),
    sort: searchParams.get("sort") ?? undefined,
  });

  if (parsed.success) return parsed;

  const issue = parsed.error.issues[0];
  return {
    success: false,
    parameter: issue && issue.path.length > 0 ? issue.path.join(".") : "query",
    message: issue?.message ?? "Invalid query parameter",
  };
}
