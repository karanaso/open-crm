"use server";

import { revalidatePath } from "next/cache";
import { requireUserForAction } from "@/lib/auth/guards";
import type { ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
import { uuidSchema } from "@/lib/validation/common";
import {
  LISTING_PHOTO_MESSAGE_KEYS,
  ListingPhotoUploadError,
  listingPhotoErrorKey,
  listingPhotoReorderSchema,
  validateListingPhotoFile,
} from "@/lib/validation/listing-photo";
import {
  deleteListingPhoto,
  reorderListingPhotos,
  uploadListingPhoto,
} from "@/lib/services/listing-photos";

function revalidateListingPhotoPaths(listingId: string) {
  revalidatePath("/listings");
  revalidatePath("/listings/dashboard");
  revalidatePath("/dashboard");
  revalidatePath(`/listings/${listingId}`);
}

function invalidInput(): ActionState {
  return { error: { key: "validation.invalid" } };
}

export async function uploadListingPhotoAction(
  listingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();

  const listing = uuidSchema.safeParse(listingId);
  if (!listing.success) return invalidInput();

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { fieldErrors: { file: [{ key: LISTING_PHOTO_MESSAGE_KEYS.empty }] } };
  }

  const validation = validateListingPhotoFile(file);
  if (!validation.ok) {
    return { fieldErrors: { file: [{ key: listingPhotoErrorKey(validation.reason) }] } };
  }

  try {
    await uploadListingPhoto(listing.data, file);
  } catch (error) {
    if (error instanceof ListingPhotoUploadError) {
      return { fieldErrors: { file: [{ key: listingPhotoErrorKey(error.reason) }] } };
    }
    return { error: errorDescriptor(error) };
  }

  revalidateListingPhotoPaths(listing.data);
  return { success: { key: LISTING_PHOTO_MESSAGE_KEYS.uploaded } };
}

export async function reorderListingPhotosAction(
  listingId: string,
  photoIds: string[],
): Promise<ActionState> {
  await requireUserForAction();

  const listing = uuidSchema.safeParse(listingId);
  const order = listingPhotoReorderSchema.safeParse(photoIds);
  if (!listing.success || !order.success) return invalidInput();

  try {
    await reorderListingPhotos(listing.data, order.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateListingPhotoPaths(listing.data);
  return { success: { key: LISTING_PHOTO_MESSAGE_KEYS.reordered } };
}

export async function deleteListingPhotoAction(photoId: string): Promise<ActionState> {
  await requireUserForAction();

  const parsed = uuidSchema.safeParse(photoId);
  if (!parsed.success) return invalidInput();

  let listingId: string;
  try {
    const result = await deleteListingPhoto(parsed.data);
    listingId = result.photo.listingId;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateListingPhotoPaths(listingId);
  return { success: { key: LISTING_PHOTO_MESSAGE_KEYS.deleted } };
}
