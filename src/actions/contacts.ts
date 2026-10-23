"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/errors";
import { contactSchema } from "@/lib/validation/contact";
import { parseTagInput } from "@/lib/validation/common";
import {
  createContact,
  setContactArchived,
  updateContact,
} from "@/lib/services/contacts";

function contactFromFormData(formData: FormData) {
  return {
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    jobTitle: formData.get("jobTitle"),
    companyId: formData.get("companyId") === "none" ? null : formData.get("companyId"),
    ownerId: formData.get("ownerId"),
    notes: formData.get("notes"),
    tags: parseTagInput(formData.get("tags")),
  };
}

export async function createContactAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = contactSchema.safeParse(contactFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let contactId = "";
  try {
    const contact = await createContact(parsed.data, user.id);
    contactId = contact.id;
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  redirect(`/contacts/${contactId}`);
}

export async function updateContactAction(
  contactId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = contactSchema.safeParse(contactFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateContact(contactId, parsed.data);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}`);
}

export async function archiveContactAction(contactId: string) {
  await requireUserForAction();
  try {
    await setContactArchived(contactId, true);
  } catch (error) {
    redirect(`/contacts/${contactId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect("/contacts");
}

export async function restoreContactAction(contactId: string) {
  await requireUserForAction();
  await setContactArchived(contactId, false);
  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}`);
}
