"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
import { activitySchema, taskSchema } from "@/lib/validation/engagement";
import {
  createActivity,
  deleteActivity,
  updateActivity,
} from "@/lib/services/timeline";
import {
  completeTask,
  createTask,
  deleteTask,
  reopenTask,
  updateTask,
} from "@/lib/services/tasks";

const linkFields = ["companyId", "contactId", "dealId", "ticketId", "campaignId"] as const;

function linksFromFormData(formData: FormData) {
  return Object.fromEntries(
    linkFields.map((field) => {
      const value = formData.get(field);
      return [field, value && value !== "none" ? value : null];
    }),
  );
}

function activityFromFormData(formData: FormData) {
  return {
    type: formData.get("type"),
    subject: formData.get("subject"),
    body: formData.get("body"),
    occurredAt: formData.get("occurredAt"),
    ...linksFromFormData(formData),
  };
}

function taskFromFormData(formData: FormData) {
  return {
    title: formData.get("title"),
    description: formData.get("description"),
    dueDate: formData.get("dueDate"),
    priority: formData.get("priority") ?? "normal",
    assigneeId: formData.get("assigneeId") === "none" ? null : formData.get("assigneeId"),
    ...linksFromFormData(formData),
  };
}

function revalidateRecordPaths(links: Record<string, string | null>) {
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  if (links.companyId) revalidatePath(`/companies/${links.companyId}`);
  if (links.contactId) revalidatePath(`/contacts/${links.contactId}`);
  if (links.dealId) revalidatePath(`/deals/${links.dealId}`);
  if (links.ticketId) revalidatePath(`/tickets/${links.ticketId}`);
  if (links.campaignId) revalidatePath(`/campaigns/${links.campaignId}`);
}

function safeReturnTo(value: FormDataEntryValue | null, fallback: string) {
  const path = typeof value === "string" ? value : fallback;
  return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
}

export async function createActivityAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = activitySchema.safeParse(activityFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await createActivity(parsed.data, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  const returnTo = safeReturnTo(formData.get("returnTo"), "/dashboard");
  revalidateRecordPaths(parsed.data);
  redirect(returnTo);
}

export async function updateActivityAction(
  activityId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = activitySchema.safeParse(activityFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateActivity(activityId, parsed.data, user);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  const returnTo = safeReturnTo(formData.get("returnTo"), "/dashboard");
  revalidateRecordPaths(parsed.data);
  redirect(returnTo);
}

export async function deleteActivityAction(activityId: string, returnTo: string) {
  const user = await requireUserForAction();
  await deleteActivity(activityId, user);
  revalidatePath("/dashboard");
  redirect(safeReturnTo(returnTo, "/dashboard"));
}

export async function createTaskAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = taskSchema.safeParse(taskFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await createTask(parsed.data, user.id);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  const returnTo = safeReturnTo(formData.get("returnTo"), "/tasks");
  revalidateRecordPaths(parsed.data);
  redirect(returnTo);
}

export async function updateTaskAction(
  taskId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = taskSchema.safeParse(taskFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateTask(taskId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  const returnTo = safeReturnTo(formData.get("returnTo"), "/tasks");
  revalidateRecordPaths(parsed.data);
  redirect(returnTo);
}

export async function completeTaskAction(taskId: string, returnTo: string) {
  const user = await requireUserForAction();
  await completeTask(taskId, user.id);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(safeReturnTo(returnTo, "/tasks"));
  redirect(safeReturnTo(returnTo, "/tasks"));
}

export async function reopenTaskAction(taskId: string, returnTo: string) {
  await requireUserForAction();
  await reopenTask(taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(safeReturnTo(returnTo, "/tasks"));
  redirect(safeReturnTo(returnTo, "/tasks"));
}

export async function deleteTaskAction(taskId: string, returnTo: string) {
  await requireUserForAction();
  await deleteTask(taskId);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath(safeReturnTo(returnTo, "/tasks"));
  redirect(safeReturnTo(returnTo, "/tasks"));
}
