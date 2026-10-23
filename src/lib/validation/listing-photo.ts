import { z } from "zod";
import { AppError } from "@/lib/errors";
import { uuidSchema } from "@/lib/validation/common";

/** Accepted upload MIME types. Content is verified again with sharp before writing. */
export const LISTING_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ListingPhotoMimeType = (typeof LISTING_PHOTO_MIME_TYPES)[number];

/** Matches the Server Action body limit so the action never needs a larger payload. */
export const LISTING_PHOTO_MAX_BYTES = 8 * 1024 * 1024;

export const LISTING_PHOTO_MAX_COUNT = 20;

/** Reject absurd source images before decoding them. */
export const LISTING_PHOTO_MAX_DIMENSION = 8000;

/** The long edge of the stored WebP derivative. */
export const LISTING_PHOTO_MAX_LONG_EDGE = 2000;

export const LISTING_PHOTO_OUTPUT_MIME = "image/webp";

export const LISTING_PHOTO_WEBP_QUALITY = 82;

export const LISTING_PHOTO_ACCEPT = LISTING_PHOTO_MIME_TYPES.join(",");

/**
 * Message descriptors used by the photo actions. The catalogs are owned by the
 * localization tasks; keep the keys stable so the UI and translators can share them.
 */
export const LISTING_PHOTO_MESSAGE_KEYS = {
  uploaded: "listings.photos.uploaded",
  reordered: "listings.photos.reordered",
  deleted: "listings.photos.deleted",
  empty: "listings.photos.errors.empty",
  type: "listings.photos.errors.type",
  size: "listings.photos.errors.size",
  count: "listings.photos.errors.count",
  dimensions: "listings.photos.errors.dimensions",
  unreadable: "listings.photos.errors.unreadable",
} as const;

export type ListingPhotoValidationFailure = "empty" | "type" | "size";

export type ListingPhotoFailureReason =
  ListingPhotoValidationFailure | "count" | "dimensions" | "unreadable";

/** Upload failures that should be reported on the file field with a specific reason. */
export class ListingPhotoUploadError extends AppError {
  readonly reason: ListingPhotoFailureReason;

  constructor(
    reason: ListingPhotoFailureReason,
    message: string,
    params?: Record<string, string | number>,
  ) {
    super(message, "BAD_REQUEST", params);
    this.name = "ListingPhotoUploadError";
    this.reason = reason;
  }
}

export type ListingPhotoValidationResult =
  { ok: true } | { ok: false; reason: ListingPhotoValidationFailure };

export function isSupportedListingPhotoMimeType(
  value: string | null | undefined,
): value is ListingPhotoMimeType {
  return (LISTING_PHOTO_MIME_TYPES as readonly string[]).includes((value ?? "").toLowerCase());
}

/**
 * Cheap checks that run before the file is read or decoded. Image content and
 * dimensions are validated by the storage service with sharp.
 */
export function validateListingPhotoFile(file: {
  type: string;
  size: number;
}): ListingPhotoValidationResult {
  if (!Number.isFinite(file.size) || file.size <= 0) return { ok: false, reason: "empty" };
  if (!isSupportedListingPhotoMimeType(file.type)) return { ok: false, reason: "type" };
  if (file.size > LISTING_PHOTO_MAX_BYTES) return { ok: false, reason: "size" };
  return { ok: true };
}

/** True when another photo may be added to a listing with `count` photos. */
export function canAddListingPhoto(count: number) {
  return Number.isInteger(count) && count >= 0 && count < LISTING_PHOTO_MAX_COUNT;
}

export function listingPhotoErrorKey(reason: ListingPhotoFailureReason) {
  return LISTING_PHOTO_MESSAGE_KEYS[reason];
}

/**
 * Stable storage identity: one immutable file per photo row. `position` controls
 * display order, so reordering never renames or moves a file.
 */
export function listingPhotoStorageKey(listingId: string, photoId: string) {
  return `listings/${listingId}/${photoId}.webp`;
}

/** Public URL for a stored photo. The image route maps this back to the storage key. */
export function listingPhotoPublicPath(storageKey: string) {
  const normalized = storageKey.replace(/^\/+/, "");
  if (!normalized.startsWith("listings/")) {
    throw new Error("Invalid listing photo storage key");
  }
  return `/images/${normalized}`;
}

/**
 * Rebuild a storage key from the `/images/listings/[...key]` route segments.
 * Returns null for traversal attempts or keys outside the supported layout.
 */
export function listingPhotoStorageKeyFromSegments(segments: readonly string[]): string | null {
  if (segments.length !== 2) return null;
  for (const segment of segments) {
    if (
      segment.length === 0 ||
      segment === "." ||
      segment === ".." ||
      segment.includes("\\") ||
      segment.includes("/") ||
      segment.includes("\0")
    ) {
      return null;
    }
  }
  return `listings/${segments.join("/")}`;
}

/**
 * A reorder request must be a complete, duplicate-free permutation of the
 * listing's current photo ids.
 */
export function isCompletePhotoOrder(
  currentIds: readonly string[],
  requestedIds: readonly string[],
): boolean {
  if (currentIds.length !== requestedIds.length) return false;
  const current = new Set(currentIds);
  if (current.size !== currentIds.length) return false;
  const requested = new Set<string>();
  for (const id of requestedIds) {
    if (!current.has(id) || requested.has(id)) return false;
    requested.add(id);
  }
  return requested.size === current.size;
}

export const listingPhotoReorderSchema = z.array(uuidSchema).max(LISTING_PHOTO_MAX_COUNT);

export const listingPhotoIdSchema = uuidSchema;
