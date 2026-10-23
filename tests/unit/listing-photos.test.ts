import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/guards", () => ({
  requireUserForAction: vi.fn().mockResolvedValue({ id: "99999999-9999-4999-8999-999999999999" }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/services/listing-photos", () => ({
  uploadListingPhoto: vi.fn(),
  reorderListingPhotos: vi.fn(),
  deleteListingPhoto: vi.fn(),
}));

import {
  LISTING_PHOTO_MAX_BYTES,
  LISTING_PHOTO_MAX_COUNT,
  LISTING_PHOTO_MESSAGE_KEYS,
  ListingPhotoUploadError,
  canAddListingPhoto,
  isCompletePhotoOrder,
  isSupportedListingPhotoMimeType,
  listingPhotoErrorKey,
  listingPhotoPublicPath,
  listingPhotoReorderSchema,
  listingPhotoStorageKey,
  listingPhotoStorageKeyFromSegments,
  validateListingPhotoFile,
} from "@/lib/validation/listing-photo";
import { revalidatePath } from "next/cache";
import {
  deleteListingPhotoAction,
  reorderListingPhotosAction,
  uploadListingPhotoAction,
} from "@/actions/listing-photos";
import { AppError } from "@/lib/errors";
import {
  deleteListingPhoto,
  reorderListingPhotos,
  uploadListingPhoto,
} from "@/lib/services/listing-photos";

const LISTING_ID = "11111111-1111-4111-8111-111111111111";
const PHOTO_ID = "22222222-2222-4222-8222-222222222222";

describe("listing photo file validation", () => {
  it("accepts JPEG, PNG, and WebP MIME types case-insensitively", () => {
    expect(isSupportedListingPhotoMimeType("image/jpeg")).toBe(true);
    expect(isSupportedListingPhotoMimeType("image/png")).toBe(true);
    expect(isSupportedListingPhotoMimeType("image/webp")).toBe(true);
    expect(isSupportedListingPhotoMimeType("IMAGE/WEBP")).toBe(true);
  });

  it("rejects non-image and unsupported image MIME types", () => {
    for (const type of [
      "",
      "application/pdf",
      "image/gif",
      "image/svg+xml",
      "image/jpg",
      "text/html",
    ]) {
      expect(isSupportedListingPhotoMimeType(type)).toBe(false);
    }
  });

  it("rejects empty files and unsupported types", () => {
    expect(validateListingPhotoFile({ type: "image/png", size: 0 })).toEqual({
      ok: false,
      reason: "empty",
    });
    expect(validateListingPhotoFile({ type: "application/pdf", size: 100 })).toEqual({
      ok: false,
      reason: "type",
    });
  });

  it("enforces the 8 MB limit at the boundary", () => {
    expect(validateListingPhotoFile({ type: "image/png", size: LISTING_PHOTO_MAX_BYTES })).toEqual({
      ok: true,
    });
    expect(
      validateListingPhotoFile({ type: "image/png", size: LISTING_PHOTO_MAX_BYTES + 1 }),
    ).toEqual({ ok: false, reason: "size" });
  });

  it("enforces the per-listing count boundary", () => {
    expect(canAddListingPhoto(0)).toBe(true);
    expect(canAddListingPhoto(LISTING_PHOTO_MAX_COUNT - 1)).toBe(true);
    expect(canAddListingPhoto(LISTING_PHOTO_MAX_COUNT)).toBe(false);
    expect(canAddListingPhoto(LISTING_PHOTO_MAX_COUNT + 1)).toBe(false);
    expect(canAddListingPhoto(-1)).toBe(false);
    expect(canAddListingPhoto(1.5)).toBe(false);
  });

  it("maps validation failures to stable message keys", () => {
    expect(listingPhotoErrorKey("empty")).toBe(LISTING_PHOTO_MESSAGE_KEYS.empty);
    expect(listingPhotoErrorKey("type")).toBe(LISTING_PHOTO_MESSAGE_KEYS.type);
    expect(listingPhotoErrorKey("size")).toBe(LISTING_PHOTO_MESSAGE_KEYS.size);
  });
});

describe("listing photo storage keys", () => {
  it("generates a stable path under the listing id", () => {
    const key = listingPhotoStorageKey(LISTING_ID, PHOTO_ID);
    expect(key).toBe(`listings/${LISTING_ID}/${PHOTO_ID}.webp`);
    expect(key).toBe(listingPhotoStorageKey(LISTING_ID, PHOTO_ID));
  });

  it("derives the public image path from the storage key", () => {
    expect(listingPhotoPublicPath(`listings/${LISTING_ID}/${PHOTO_ID}.webp`)).toBe(
      `/images/listings/${LISTING_ID}/${PHOTO_ID}.webp`,
    );
    expect(() => listingPhotoPublicPath(`private/${LISTING_ID}/${PHOTO_ID}.webp`)).toThrow();
  });

  it("rebuilds a storage key from route segments", () => {
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID, `${PHOTO_ID}.webp`])).toBe(
      `listings/${LISTING_ID}/${PHOTO_ID}.webp`,
    );
  });

  it("rejects traversal, nested, and incomplete route segments", () => {
    expect(listingPhotoStorageKeyFromSegments(["..", "secret.webp"])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID, "..", "secret.webp"])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID, "photo/name.webp"])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID, "photo\\name.webp"])).toBeNull();
    expect(listingPhotoStorageKeyFromSegments([LISTING_ID, ""])).toBeNull();
  });
});

describe("listing photo order", () => {
  it("accepts a complete permutation", () => {
    expect(isCompletePhotoOrder(["a", "b", "c"], ["c", "a", "b"])).toBe(true);
  });

  it("rejects missing, duplicate, and foreign ids", () => {
    expect(isCompletePhotoOrder(["a", "b"], ["a"])).toBe(false);
    expect(isCompletePhotoOrder(["a", "b"], ["a", "a"])).toBe(false);
    expect(isCompletePhotoOrder(["a", "b"], ["a", "c"])).toBe(false);
    expect(isCompletePhotoOrder(["a", "b"], ["a", "b", "c"])).toBe(false);
  });

  it("validates reorder ids and the per-listing photo cap", () => {
    const ids = Array.from(
      { length: LISTING_PHOTO_MAX_COUNT },
      (_, index) => `${String(index).padStart(8, "0")}-0000-4000-8000-000000000000`,
    );
    expect(listingPhotoReorderSchema.safeParse(ids).success).toBe(true);
    expect(listingPhotoReorderSchema.safeParse([...ids, LISTING_ID]).success).toBe(false);
    expect(listingPhotoReorderSchema.safeParse(["not-a-uuid"]).success).toBe(false);
    expect(listingPhotoReorderSchema.safeParse([]).success).toBe(true);
  });
});

describe("listing photo actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects a missing file before calling the service", async () => {
    const result = await uploadListingPhotoAction(LISTING_ID, null, new FormData());
    expect(result).toEqual({
      fieldErrors: { file: [{ key: LISTING_PHOTO_MESSAGE_KEYS.empty }] },
    });
    expect(uploadListingPhoto).not.toHaveBeenCalled();
  });

  it("rejects an unsupported file type before calling the service", async () => {
    const formData = new FormData();
    formData.set(
      "file",
      new File([new Uint8Array([1, 2, 3])], "doc.pdf", { type: "application/pdf" }),
    );

    const result = await uploadListingPhotoAction(LISTING_ID, null, formData);

    expect(result).toEqual({
      fieldErrors: { file: [{ key: LISTING_PHOTO_MESSAGE_KEYS.type }] },
    });
    expect(uploadListingPhoto).not.toHaveBeenCalled();
  });

  it("uploads a valid file and revalidates the listing and list paths", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("file", file);
    vi.mocked(uploadListingPhoto).mockResolvedValueOnce({} as never);

    const result = await uploadListingPhotoAction(LISTING_ID, null, formData);

    expect(uploadListingPhoto).toHaveBeenCalledWith(LISTING_ID, file);
    expect(result).toEqual({ success: { key: LISTING_PHOTO_MESSAGE_KEYS.uploaded } });
    expect(revalidatePath).toHaveBeenCalledWith(`/listings/${LISTING_ID}`);
    expect(revalidatePath).toHaveBeenCalledWith("/listings");
  });

  it("maps a photo-specific upload failure to the file field", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("file", file);
    vi.mocked(uploadListingPhoto).mockRejectedValueOnce(
      new ListingPhotoUploadError("dimensions", "The image is too large"),
    );

    const result = await uploadListingPhotoAction(LISTING_ID, null, formData);

    expect(result).toEqual({
      fieldErrors: { file: [{ key: LISTING_PHOTO_MESSAGE_KEYS.dimensions }] },
    });
  });

  it("returns a descriptor for other upload failures", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "photo.png", { type: "image/png" });
    const formData = new FormData();
    formData.set("file", file);
    vi.mocked(uploadListingPhoto).mockRejectedValueOnce(
      new AppError("The database is unavailable", "GENERIC"),
    );

    const result = await uploadListingPhotoAction(LISTING_ID, null, formData);

    expect(result).toEqual({ error: { key: "errors.GENERIC" } });
  });

  it("validates reorder ids before calling the service", async () => {
    const invalid = await reorderListingPhotosAction("not-a-listing", [PHOTO_ID]);
    expect(invalid).toEqual({ error: { key: "validation.invalid" } });
    expect(reorderListingPhotos).not.toHaveBeenCalled();

    vi.mocked(reorderListingPhotos).mockResolvedValueOnce([]);
    const result = await reorderListingPhotosAction(LISTING_ID, [PHOTO_ID]);
    expect(reorderListingPhotos).toHaveBeenCalledWith(LISTING_ID, [PHOTO_ID]);
    expect(result).toEqual({ success: { key: LISTING_PHOTO_MESSAGE_KEYS.reordered } });
  });

  it("deletes a photo and revalidates its listing detail", async () => {
    vi.mocked(deleteListingPhoto).mockResolvedValueOnce({
      photo: { listingId: LISTING_ID } as never,
      file: "deleted",
    });

    const result = await deleteListingPhotoAction(PHOTO_ID);

    expect(deleteListingPhoto).toHaveBeenCalledWith(PHOTO_ID);
    expect(result).toEqual({ success: { key: LISTING_PHOTO_MESSAGE_KEYS.deleted } });
    expect(revalidatePath).toHaveBeenCalledWith(`/listings/${LISTING_ID}`);
  });

  it("rejects an invalid photo id before calling the service", async () => {
    const result = await deleteListingPhotoAction("not-a-photo");
    expect(result).toEqual({ error: { key: "validation.invalid" } });
    expect(deleteListingPhoto).not.toHaveBeenCalled();
  });
});
