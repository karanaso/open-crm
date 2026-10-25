"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorCode, errorDescriptor } from "@/lib/errors";
import {
  messageGroupMemberSchema,
  messageGroupSchema,
  messageSchema,
  unsupportedMergeFieldsDescriptor,
} from "@/lib/validation/messaging";
import {
  addMessageGroupMember,
  cancelMessage,
  createMessage,
  createMessageGroup,
  removeMessageGroupMember,
  retryMessage,
  sendMessage,
  setContactEmailOptOut,
  setMessageGroupArchived,
  updateMessage,
  updateMessageGroup,
} from "@/lib/services/messaging";

function groupFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
  };
}

function messageFromFormData(formData: FormData) {
  return {
    subject: formData.get("subject"),
    body: formData.get("body"),
    groupId: formData.get("groupId"),
    segmentId: formData.get("segmentId"),
  };
}

function safeReturnTo(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\")
    ? value
    : fallback;
}

export async function createMessageGroupAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = messageGroupSchema.safeParse(groupFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let groupId = "";
  try {
    const group = await createMessageGroup(parsed.data, user.id);
    groupId = group.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath("/messages/groups");
  redirect(`/messages/groups/${groupId}`);
}

export async function updateMessageGroupAction(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = messageGroupSchema.safeParse(groupFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateMessageGroup(groupId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath("/messages/groups");
  revalidatePath(`/messages/groups/${groupId}`);
  redirect(`/messages/groups/${groupId}`);
}

export async function archiveMessageGroupAction(groupId: string) {
  await requireUserForAction();
  try {
    await setMessageGroupArchived(groupId, true);
  } catch (error) {
    redirect(`/messages/groups/${groupId}?error=${encodeURIComponent(errorCode(error))}`);
  }

  revalidatePath("/messages");
  revalidatePath("/messages/groups");
  redirect("/messages/groups");
}

export async function addMessageGroupMemberAction(
  groupId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = messageGroupMemberSchema.safeParse({
    contactId: formData.get("contactId"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await addMessageGroupMember(groupId, parsed.data.contactId, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/groups/${groupId}`);
  redirect(`/messages/groups/${groupId}`);
}

export async function removeMessageGroupMemberAction(groupId: string, contactId: string) {
  await requireUserForAction();
  try {
    await removeMessageGroupMember(groupId, contactId);
  } catch (error) {
    redirect(`/messages/groups/${groupId}?error=${encodeURIComponent(errorCode(error))}`);
  }

  revalidatePath(`/messages/groups/${groupId}`);
  redirect(`/messages/groups/${groupId}`);
}

export async function createMessageAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();

  const unsupported = unsupportedMergeFieldsDescriptor(String(formData.get("body") ?? ""));
  if (unsupported) return { fieldErrors: { body: [unsupported] } };

  const parsed = messageSchema.safeParse(messageFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let messageId = "";
  try {
    const message = await createMessage(parsed.data, user.id);
    messageId = message.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  redirect(`/messages/${messageId}`);
}

export async function updateMessageAction(
  messageId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();

  const unsupported = unsupportedMergeFieldsDescriptor(String(formData.get("body") ?? ""));
  if (unsupported) return { fieldErrors: { body: [unsupported] } };

  const parsed = messageSchema.safeParse(messageFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateMessage(messageId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
  redirect(`/messages/${messageId}`);
}

export async function sendMessageAction(
  messageId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  try {
    await sendMessage(messageId, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
  redirect(`/messages/${messageId}`);
}

export async function retryMessageAction(
  messageId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  try {
    await retryMessage(messageId, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
  redirect(`/messages/${messageId}`);
}

export async function cancelMessageAction(
  messageId: string,
  _prevState: ActionState,
  _formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  try {
    await cancelMessage(messageId);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/messages");
  revalidatePath(`/messages/${messageId}`);
  redirect(`/messages/${messageId}`);
}

export async function setContactEmailOptOutAction(
  contactId: string,
  returnTo: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const optOut = formData.get("optOut") === "true";

  try {
    await setContactEmailOptOut(contactId, optOut);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  const target = safeReturnTo(returnTo, `/contacts/${contactId}`);
  revalidatePath(target);
  revalidatePath(`/contacts/${contactId}`);
  redirect(target);
}
