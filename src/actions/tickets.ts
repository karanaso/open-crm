"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorCode, errorDescriptor } from "@/lib/errors";
import { commentSchema, ticketSchema } from "@/lib/validation/ticket";
import {
  addTicketComment,
  assignTicket,
  changeTicketPriority,
  changeTicketStatus,
  createTicket,
  updateTicket,
} from "@/lib/services/tickets";
import type { Ticket } from "@/db/schema";

function ticketFromFormData(formData: FormData) {
  return {
    subject: formData.get("subject"),
    description: formData.get("description"),
    requesterContactId: formData.get("requesterContactId"),
    priority: formData.get("priority") ?? "normal",
    assigneeId: formData.get("assigneeId") === "none" ? null : formData.get("assigneeId"),
  };
}

function safeReturnTo(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

function revalidateTicketPaths(ticketId?: string) {
  revalidatePath("/tickets");
  revalidatePath("/dashboard");
  if (ticketId) revalidatePath(`/tickets/${ticketId}`);
}

export async function createTicketAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = ticketSchema.safeParse(ticketFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let ticketId = "";
  try {
    const ticket = await createTicket(parsed.data, user.id);
    ticketId = ticket.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateTicketPaths(ticketId);
  redirect(`/tickets/${ticketId}`);
}

export async function updateTicketAction(
  ticketId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = ticketSchema.safeParse(ticketFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateTicket(ticketId, parsed.data, formData.get("expectedUpdatedAt")?.toString());
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateTicketPaths(ticketId);
  redirect(`/tickets/${ticketId}`);
}

export async function changeTicketStatusAction(
  ticketId: string,
  status: Ticket["status"],
  returnTo: string,
) {
  await requireUserForAction();
  try {
    await changeTicketStatus(ticketId, status);
  } catch (error) {
    redirect(`${safeReturnTo(returnTo, `/tickets/${ticketId}`)}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidateTicketPaths(ticketId);
  redirect(safeReturnTo(returnTo, `/tickets/${ticketId}`));
}

export async function assignTicketAction(ticketId: string, returnTo: string, formData: FormData) {
  await requireUserForAction();
  const value = formData.get("assigneeId");
  const assigneeId = value === "none" || !value ? null : String(value);
  try {
    await assignTicket(ticketId, assigneeId);
  } catch (error) {
    redirect(`${safeReturnTo(returnTo, `/tickets/${ticketId}`)}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidateTicketPaths(ticketId);
  redirect(safeReturnTo(returnTo, `/tickets/${ticketId}`));
}

export async function changeTicketPriorityAction(
  ticketId: string,
  returnTo: string,
  formData: FormData,
) {
  await requireUserForAction();
  const priority = formData.get("priority") as Ticket["priority"];
  try {
    await changeTicketPriority(ticketId, priority);
  } catch (error) {
    redirect(`${safeReturnTo(returnTo, `/tickets/${ticketId}`)}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidateTicketPaths(ticketId);
  redirect(safeReturnTo(returnTo, `/tickets/${ticketId}`));
}

export async function addCommentAction(
  ticketId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = commentSchema.safeParse({
    body: formData.get("body"),
    visibility: formData.get("visibility") ?? "reply",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await addTicketComment(ticketId, parsed.data, user);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidateTicketPaths(ticketId);
  const returnTo = formData.get("returnTo")?.toString() ?? `/tickets/${ticketId}`;
  redirect(safeReturnTo(returnTo, `/tickets/${ticketId}`));
}
