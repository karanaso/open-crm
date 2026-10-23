"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorCode, errorDescriptor } from "@/lib/errors";
import { parseTagInput } from "@/lib/validation/common";
import { campaignSchema, segmentSchema } from "@/lib/validation/marketing";
import {
  activateCampaign,
  archiveSegment,
  createCampaign,
  createSegment,
  transitionCampaign,
  updateCampaign,
  updateRecipientStatus,
  updateSegment,
} from "@/lib/services/marketing";
import type { Campaign, CampaignRecipient } from "@/db/schema";

function segmentFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    description: formData.get("description"),
    criteria: {
      tags: parseTagInput(formData.get("tags")),
      industry: formData.get("industry")?.toString().trim() || undefined,
      jobTitle: formData.get("jobTitle")?.toString().trim() || undefined,
      ownerId: formData.get("ownerId")?.toString() || undefined,
      createdFrom: formData.get("createdFrom")?.toString() || undefined,
      createdTo: formData.get("createdTo")?.toString() || undefined,
    },
  };
}

function campaignFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    channel: formData.get("channel"),
    segmentId: formData.get("segmentId"),
    ownerId: formData.get("ownerId"),
    budget: formData.get("budget") ?? 0,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    description: formData.get("description"),
  };
}

function safeReturnTo(value: string, fallback: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : fallback;
}

export async function createSegmentAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = segmentSchema.safeParse(segmentFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let segmentId = "";
  try {
    const segment = await createSegment(parsed.data, user.id);
    segmentId = segment.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/segments");
  revalidatePath("/campaigns");
  redirect(`/segments/${segmentId}`);
}

export async function updateSegmentAction(
  segmentId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = segmentSchema.safeParse(segmentFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateSegment(segmentId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/segments");
  revalidatePath(`/segments/${segmentId}`);
  redirect(`/segments/${segmentId}`);
}

export async function archiveSegmentAction(segmentId: string) {
  await requireUserForAction();
  try {
    await archiveSegment(segmentId, true);
  } catch (error) {
    redirect(`/segments/${segmentId}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath("/segments");
  redirect("/segments");
}

export async function createCampaignAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = campaignSchema.safeParse(campaignFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let campaignId = "";
  try {
    const campaign = await createCampaign(parsed.data, user.id);
    campaignId = campaign.id;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/campaigns");
  revalidatePath("/dashboard");
  redirect(`/campaigns/${campaignId}`);
}

export async function updateCampaignAction(
  campaignId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = campaignSchema.safeParse(campaignFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateCampaign(campaignId, parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(`/campaigns/${campaignId}`);
}

export async function transitionCampaignAction(
  campaignId: string,
  target: Campaign["status"],
) {
  const user = await requireUserForAction();
  try {
    if (target === "active") {
      await activateCampaign(campaignId, user.id);
    } else {
      await transitionCampaign(campaignId, target, user.id);
    }
  } catch (error) {
    redirect(`/campaigns/${campaignId}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath("/campaigns");
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
  redirect(`/campaigns/${campaignId}`);
}

export async function updateRecipientStatusAction(
  recipientId: string,
  returnTo: string,
  formData: FormData,
) {
  const user = await requireUserForAction();
  const status = formData.get("status") as CampaignRecipient["status"];
  try {
    await updateRecipientStatus(recipientId, status, user.id);
  } catch (error) {
    redirect(`${safeReturnTo(returnTo, "/campaigns")}?error=${encodeURIComponent(errorCode(error))}`);
  }
  revalidatePath(safeReturnTo(returnTo, "/campaigns"));
  revalidatePath("/dashboard");
  redirect(safeReturnTo(returnTo, "/campaigns"));
}
