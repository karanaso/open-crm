import { randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, count, eq, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { listingPhotos, listings, type ListingPhoto } from "@/db/schema";
import { imageStorageDir } from "@/lib/env";
import { AppError } from "@/lib/errors";
import {
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MAX_COUNT,
  LISTING_PHOTO_MAX_DIMENSION,
  LISTING_PHOTO_MAX_LONG_EDGE,
  LISTING_PHOTO_OUTPUT_MIME,
  LISTING_PHOTO_WEBP_QUALITY,
  ListingPhotoUploadError,
  canAddListingPhoto,
  isCompletePhotoOrder,
  listingPhotoStorageKey,
  validateListingPhotoFile,
  type ListingPhotoMimeType,
} from "@/lib/validation/listing-photo";

const FORMAT_TO_MIME: Record<string, ListingPhotoMimeType> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ListingPhotoStorageOptions = {
  /**
   * Overrides `IMAGE_STORAGE_DIR`. Tests pass a temporary directory; production
   * code uses the configured persistent volume.
   */
  storageDir?: string;
};

type OptimizedImage = {
  data: Buffer;
  width: number;
  height: number;
};

function storageRoot(storageDir?: string) {
  return path.resolve(storageDir ?? imageStorageDir);
}

/**
 * Resolve a database storage key to an absolute path. Rejects keys outside the
 * `listings/` subtree and any traversal segments. The public route still only
 * serves keys that exist in `listing_photos`.
 */
export function listingPhotoFilePath(
  storageKey: string,
  storageDir: string = imageStorageDir,
): string {
  const normalized = storageKey.replace(/\\/g, "/");
  const segments = normalized.split("/");
  const invalidSegment = segments.some(
    (segment) =>
      segment.length === 0 || segment === "." || segment === ".." || segment.includes("\0"),
  );
  if (segments[0] !== "listings" || segments.length < 2 || invalidSegment) {
    throw new AppError("Invalid listing photo storage key", "BAD_REQUEST");
  }

  const root = storageRoot(storageDir);
  const target = path.resolve(root, normalized);
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new AppError("Invalid listing photo storage key", "BAD_REQUEST");
  }
  return target;
}

function invalidFile(reason: "empty" | "type" | "size"): never {
  if (reason === "empty") throw new ListingPhotoUploadError("empty", "Choose an image to upload");
  if (reason === "type") {
    throw new ListingPhotoUploadError("type", "Choose a JPEG, PNG, or WebP image");
  }
  const megabytes = LISTING_PHOTO_MAX_BYTES / (1024 * 1024);
  throw new ListingPhotoUploadError("size", `Images must be ${megabytes} MB or smaller`);
}

type SharpMetadata = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

async function optimizeListingPhoto(input: Buffer, declaredType: string): Promise<OptimizedImage> {
  let metadata: SharpMetadata;
  try {
    metadata = await sharp(input, {
      failOn: "error",
      limitInputPixels: LISTING_PHOTO_MAX_DIMENSION * LISTING_PHOTO_MAX_DIMENSION,
    }).metadata();
  } catch {
    throw new ListingPhotoUploadError("unreadable", "The uploaded file is not a readable image");
  }

  if (!metadata.width || !metadata.height) {
    throw new ListingPhotoUploadError(
      "unreadable",
      "The uploaded image has no readable dimensions",
    );
  }
  if (
    metadata.width > LISTING_PHOTO_MAX_DIMENSION ||
    metadata.height > LISTING_PHOTO_MAX_DIMENSION
  ) {
    throw new ListingPhotoUploadError(
      "dimensions",
      `Images must not exceed ${LISTING_PHOTO_MAX_DIMENSION} by ${LISTING_PHOTO_MAX_DIMENSION} pixels`,
      { max: LISTING_PHOTO_MAX_DIMENSION },
    );
  }

  const format = metadata.format;
  const actualType = format ? FORMAT_TO_MIME[format] : undefined;
  if (!format || !ACCEPTED_FORMATS.has(format) || !actualType) {
    throw new ListingPhotoUploadError("type", "Choose a JPEG, PNG, or WebP image");
  }
  if (actualType !== declaredType.toLowerCase()) {
    throw new ListingPhotoUploadError("type", "The file content does not match its image type");
  }

  try {
    const { data, info } = await sharp(input, {
      failOn: "error",
      limitInputPixels: LISTING_PHOTO_MAX_DIMENSION * LISTING_PHOTO_MAX_DIMENSION,
    })
      // Apply the EXIF orientation before the metadata is stripped by re-encoding.
      .rotate()
      .resize({
        width: LISTING_PHOTO_MAX_LONG_EDGE,
        height: LISTING_PHOTO_MAX_LONG_EDGE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: LISTING_PHOTO_WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });

    if (!info.width || !info.height) {
      throw new ListingPhotoUploadError(
        "unreadable",
        "The uploaded image has no readable dimensions",
      );
    }
    return { data, width: info.width, height: info.height };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new ListingPhotoUploadError("unreadable", "The uploaded file is not a readable image");
  }
}

async function assertListingExists(listingId: string) {
  const [listing] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);
  if (!listing) throw new AppError("Listing not found", "NOT_FOUND");
}

async function countListingPhotos(listingId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));
  return Number(row?.value ?? 0);
}

/**
 * Validate, re-encode, and store one listing photo.
 *
 * The file is written before the row so a failed insert can remove it; the row
 * insert locks the listing and recomputes the next position to serialize
 * concurrent uploads for the same listing.
 */
export async function uploadListingPhoto(
  listingId: string,
  file: File,
  options: ListingPhotoStorageOptions = {},
): Promise<ListingPhoto> {
  const validation = validateListingPhotoFile(file);
  if (!validation.ok) invalidFile(validation.reason);

  await assertListingExists(listingId);
  if (!canAddListingPhoto(await countListingPhotos(listingId))) {
    throw new ListingPhotoUploadError(
      "count",
      `A listing can have at most ${LISTING_PHOTO_MAX_COUNT} photos`,
      { max: LISTING_PHOTO_MAX_COUNT },
    );
  }

  let input: Buffer;
  try {
    input = Buffer.from(await file.arrayBuffer());
  } catch {
    throw new ListingPhotoUploadError("unreadable", "The uploaded file could not be read");
  }
  if (input.byteLength === 0) invalidFile("empty");
  if (input.byteLength > LISTING_PHOTO_MAX_BYTES) invalidFile("size");

  const optimized = await optimizeListingPhoto(input, file.type);

  const photoId = randomUUID();
  const storageKey = listingPhotoStorageKey(listingId, photoId);
  const filePath = listingPhotoFilePath(storageKey, options.storageDir);

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, optimized.data, { flag: "wx" });

  try {
    return await db.transaction(async (tx) => {
      const [listing] = await tx
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.id, listingId))
        .limit(1)
        .for("update");
      if (!listing) throw new AppError("Listing not found", "NOT_FOUND");

      const [countRow] = await tx
        .select({ value: count() })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, listingId));
      if (!canAddListingPhoto(Number(countRow?.value ?? 0))) {
        throw new ListingPhotoUploadError(
          "count",
          `A listing can have at most ${LISTING_PHOTO_MAX_COUNT} photos`,
          { max: LISTING_PHOTO_MAX_COUNT },
        );
      }

      const [maxRow] = await tx
        .select({
          value: sql<number>`coalesce(max(${listingPhotos.position}), -1)`,
        })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, listingId));
      const position = Number(maxRow?.value ?? -1) + 1;

      const [photo] = await tx
        .insert(listingPhotos)
        .values({
          id: photoId,
          listingId,
          storageKey,
          mimeType: LISTING_PHOTO_OUTPUT_MIME,
          width: optimized.width,
          height: optimized.height,
          byteSize: optimized.data.byteLength,
          position,
        })
        .returning();
      if (!photo) throw new AppError("The photo could not be saved", "GENERIC");
      return photo;
    });
  } catch (error) {
    await unlink(filePath).catch(() => undefined);
    throw error;
  }
}

/**
 * Replace the display order with a complete permutation of the listing's
 * photos. Files are untouched; only `position` changes.
 */
export async function reorderListingPhotos(
  listingId: string,
  photoIds: string[],
): Promise<ListingPhoto[]> {
  return db.transaction(async (tx) => {
    const [listing] = await tx
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1)
      .for("update");
    if (!listing) throw new AppError("Listing not found", "NOT_FOUND");

    const current = await tx
      .select({ id: listingPhotos.id })
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId));
    if (
      !isCompletePhotoOrder(
        current.map((photo) => photo.id),
        photoIds,
      )
    ) {
      throw new AppError("The photo order does not match this listing", "BAD_REQUEST");
    }

    const now = new Date();
    for (const [position, photoId] of photoIds.entries()) {
      await tx
        .update(listingPhotos)
        .set({ position, updatedAt: now })
        .where(and(eq(listingPhotos.id, photoId), eq(listingPhotos.listingId, listingId)));
    }

    return tx
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.listingId, listingId))
      .orderBy(asc(listingPhotos.position));
  });
}

export type DeleteListingPhotoResult = {
  photo: ListingPhoto;
  /** Whether the stored file was removed, already absent, or could not be removed. */
  file: "deleted" | "missing" | "error";
};

/**
 * Delete a photo row first, then its file. A missing file is tolerated so the
 * cleanup script can still report the storage-key gap without failing deletes.
 */
export async function deleteListingPhoto(
  photoId: string,
  options: ListingPhotoStorageOptions = {},
): Promise<DeleteListingPhotoResult> {
  const photo = await db.transaction(async (tx) => {
    const [found] = await tx
      .select()
      .from(listingPhotos)
      .where(eq(listingPhotos.id, photoId))
      .limit(1);
    if (!found) throw new AppError("Photo not found", "NOT_FOUND");

    // Match the upload/reorder lock order so positions cannot change mid-delete.
    await tx
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.id, found.listingId))
      .limit(1)
      .for("update");

    const [deleted] = await tx
      .delete(listingPhotos)
      .where(eq(listingPhotos.id, photoId))
      .returning({ id: listingPhotos.id });
    if (!deleted) throw new AppError("Photo not found", "NOT_FOUND");
    return found;
  });

  try {
    await unlink(listingPhotoFilePath(photo.storageKey, options.storageDir));
    return { photo, file: "deleted" };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { photo, file: "missing" };
    }
    return { photo, file: "error" };
  }
}

export async function getListingPhotoByStorageKey(
  storageKey: string,
): Promise<ListingPhoto | null> {
  const [photo] = await db
    .select()
    .from(listingPhotos)
    .where(eq(listingPhotos.storageKey, storageKey))
    .limit(1);
  return photo ?? null;
}

export type ListingPhotoCleanupReport = {
  rows: number;
  files: number;
  orphanFiles: string[];
  missingFiles: string[];
  /** Files removed when `apply` is true. */
  deleted: number;
  /** Orphan keys that could not be removed. */
  failed: string[];
};

async function listStoredPhotoKeys(storageDir: string): Promise<string[]> {
  const root = storageRoot(storageDir);
  const listingsRoot = path.join(root, "listings");
  const files: string[] = [];

  try {
    const listingsStats = await lstat(listingsRoot);
    // Never follow a replaced/symlinked root outside the configured storage.
    if (!listingsStats.isDirectory() || listingsStats.isSymbolicLink()) return files;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return files;
    throw error;
  }

  async function walk(directory: string) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
      throw error;
    }

    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(absolute);
      } else if (entry.isFile()) {
        files.push(path.relative(root, absolute).split(path.sep).join("/"));
      }
      // Symlinks are deliberately skipped so cleanup cannot follow them outside the root.
    }
  }

  await walk(listingsRoot);
  return files;
}

/**
 * Compare `IMAGE_STORAGE_DIR/listings` with `listing_photos.storage_key`.
 *
 * Dry-run by default. `apply` removes orphan files only; rows whose files are
 * missing are reported and left untouched.
 */
export async function cleanupListingPhotoStorage(
  options: ListingPhotoStorageOptions & { apply?: boolean } = {},
): Promise<ListingPhotoCleanupReport> {
  const rows = await db.select({ storageKey: listingPhotos.storageKey }).from(listingPhotos);
  const rowKeys = new Set(rows.map((row) => row.storageKey));
  const files = await listStoredPhotoKeys(storageRoot(options.storageDir));
  const fileKeys = new Set(files);

  const orphanFiles = files.filter((key) => !rowKeys.has(key));
  const missingFiles = [...rowKeys].filter((key) => !fileKeys.has(key)).sort();
  const failed: string[] = [];
  let deleted = 0;

  if (options.apply) {
    for (const storageKey of orphanFiles) {
      try {
        await unlink(listingPhotoFilePath(storageKey, options.storageDir));
        deleted += 1;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          deleted += 1;
        } else {
          failed.push(storageKey);
        }
      }
    }
  }

  return {
    rows: rows.length,
    files: files.length,
    orphanFiles,
    missingFiles,
    deleted,
    failed,
  };
}
