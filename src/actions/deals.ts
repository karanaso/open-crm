"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/errors";
import { dealMoveSchema, dealSchema } from "@/lib/validation/deal";
import { createDeal, moveDeal, updateDeal } from "@/lib/services/deals";

function dealFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    companyId: formData.get("companyId"),
    contactId: formData.get("contactId") === "none" ? null : formData.get("contactId"),
    pipelineId: formData.get("pipelineId"),
    stageId: formData.get("stageId"),
    ownerId: formData.get("ownerId"),
    amount: formData.get("amount"),
    expectedCloseDate: formData.get("expectedCloseDate"),
    description: formData.get("description"),
    lostReason: formData.get("lostReason"),
  };
}

function revalidateDealPaths(dealId?: string) {
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  if (dealId) revalidatePath(`/deals/${dealId}`);
}

export async function createDealAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = dealSchema.safeParse(dealFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let dealId = "";
  try {
    const deal = await createDeal(parsed.data, user.id);
    dealId = deal.id;
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateDealPaths(dealId);
  redirect(`/deals/${dealId}`);
}

export async function updateDealAction(
  dealId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = dealSchema.safeParse(dealFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateDeal(
      dealId,
      parsed.data,
      user.id,
      formData.get("expectedUpdatedAt")?.toString(),
    );
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateDealPaths(dealId);
  redirect(`/deals/${dealId}`);
}

export async function moveDealAction(input: {
  dealId: string;
  stageId: string;
  lostReason?: string;
  expectedUpdatedAt?: string;
}) {
  const user = await requireUserForAction();
  const parsed = dealMoveSchema.safeParse(input);
  if (!parsed.success) return { error: "Invalid stage move." };

  try {
    await moveDeal(parsed.data, user.id);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidateDealPaths(parsed.data.dealId);
  return { success: "Deal moved." };
}
