"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorCode, errorDescriptor } from "@/lib/errors";
import { listingInputSchema, type ListingStatus } from "@/lib/validation/listing";
import {
  createListing,
  setListingStatus,
  updateListing,
} from "@/lib/services/listings";

function parseFeatures(value: FormDataEntryValue | null): unknown {
  if (value === null || value === "") return {};
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function listingFromFormData(formData: FormData) {
  const ownerId = formData.get("ownerId");
  return {
    reference: formData.get("reference"),
    title: formData.get("title"),
    description: formData.get("description"),
    transaction: formData.get("transaction"),
    pricePeriod: formData.get("pricePeriod"),
    price: formData.get("price"),
    commissionAmount: formData.get("commissionAmount"),
    currency: formData.get("currency"),
    addressLine1: formData.get("addressLine1"),
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    propertyType: formData.get("propertyType"),
    bedrooms: formData.get("bedrooms"),
    bathrooms: formData.get("bathrooms"),
    sizeSqm: formData.get("sizeSqm"),
    lotSqm: formData.get("lotSqm"),
    yearBuilt: formData.get("yearBuilt"),
    floors: formData.get("floors"),
    parking: formData.get("parking"),
    energyClass: formData.get("energyClass"),
    sellerContactId: formData.get("sellerContactId"),
    ownerId: ownerId === "none" ? null : ownerId,
    features: parseFeatures(formData.get("features")),
  };
}

function revalidateListingPaths(listingId?: string) {
  revalidatePath("/listings");
  revalidatePath("/listings/dashboard");
  revalidatePath("/dashboard");
  if (listingId) revalidatePath(`/listings/${listingId}`);
}

export async function createListingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = listingInputSchema.safeParse(listingFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let listingId = "";
  try {
    const listing = await createListing(parsed.data, user.id);
    listingId = listing.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateListingPaths(listingId);
  redirect(`/listings/${listingId}`);
}

export async function updateListingAction(
  listingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = listingInputSchema.safeParse(listingFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateListing(listingId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateListingPaths(listingId);
  redirect(`/listings/${listingId}`);
}

async function changeListingStatus(listingId: string, status: ListingStatus) {
  await requireUserForAction();
  try {
    await setListingStatus(listingId, status);
  } catch (error) {
    redirect(`/listings/${listingId}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidateListingPaths(listingId);
  redirect(`/listings/${listingId}`);
}

export async function deactivateListingAction(listingId: string) {
  return changeListingStatus(listingId, "inactive");
}

export async function restoreListingAction(listingId: string) {
  return changeListingStatus(listingId, "active");
}
