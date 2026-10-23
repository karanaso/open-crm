import { lstat, readFile } from "node:fs/promises";
import { getListingPhotoByStorageKey, listingPhotoFilePath } from "@/lib/services/listing-photos";
import {
  isSupportedListingPhotoMimeType,
  listingPhotoStorageKeyFromSegments,
} from "@/lib/validation/listing-photo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ListingImageRouteContext = {
  params: Promise<{ key: string[] }>;
};

function notFound() {
  return new Response("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

/**
 * Public, read-only listing images. The path is mapped to a storage key, looked
 * up in `listing_photos`, and only then read from IMAGE_STORAGE_DIR. Nothing
 * outside the recorded listing-photo keys is served.
 */
export async function GET(_request: Request, context: ListingImageRouteContext) {
  const { key } = await context.params;
  const storageKey = listingPhotoStorageKeyFromSegments(key);
  if (!storageKey) return notFound();

  const photo = await getListingPhotoByStorageKey(storageKey);
  if (!photo || !isSupportedListingPhotoMimeType(photo.mimeType)) return notFound();

  let filePath: string;
  try {
    filePath = listingPhotoFilePath(storageKey);
  } catch {
    return notFound();
  }

  try {
    const stats = await lstat(filePath);
    if (!stats.isFile()) return notFound();
    const body = await readFile(filePath);
    return new Response(new Uint8Array(body), {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": photo.mimeType,
        "Content-Length": String(body.byteLength),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return notFound();
  }
}
