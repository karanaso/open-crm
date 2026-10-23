"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
import { viewingInputSchema, viewingStatusSchema } from "@/lib/validation/listing-viewing";
import { createViewing, updateViewingStatus } from "@/lib/services/listing-viewings";

function safeReturnTo(value: string | null | undefined, fallback: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

function viewingFromFormData(formData: FormData) {
  const agentId = formData.get("agentId");
  return {
    listingId: formData.get("listingId"),
    contactId: formData.get("contactId"),
    agentId: agentId === "none" ? null : agentId,
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    status: formData.get("status"),
    notes: formData.get("notes"),
  };
}

function revalidateViewingPaths(listingId?: string, contactId?: string) {
  revalidatePath("/listings");
  revalidatePath("/listings/dashboard");
  if (listingId) revalidatePath(`/listings/${listingId}`);
  if (contactId) revalidatePath(`/contacts/${contactId}`);
}

export async function scheduleViewingAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = viewingInputSchema.safeParse(viewingFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await createViewing(parsed.data, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateViewingPaths(parsed.data.listingId, parsed.data.contactId);
  redirect(
    safeReturnTo(
      formData.get("returnTo")?.toString(),
      `/listings/${parsed.data.listingId}`,
    ),
  );
}

export async function updateViewingStatusAction(
  viewingId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = viewingStatusSchema.safeParse({
    viewingId,
    status: formData.get("status"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let updated: Awaited<ReturnType<typeof updateViewingStatus>>;
  try {
    updated = await updateViewingStatus(parsed.data.viewingId, parsed.data.status);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateViewingPaths(updated.listingId, updated.contactId);
  redirect(
    safeReturnTo(
      formData.get("returnTo")?.toString(),
      `/listings/${updated.listingId}`,
    ),
  );
}
