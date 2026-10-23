"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireUserForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/errors";
import { companySchema } from "@/lib/validation/company";
import { parseTagInput } from "@/lib/validation/common";
import {
  createCompany,
  setCompanyArchived,
  updateCompany,
} from "@/lib/services/companies";

function companyFromFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    domain: formData.get("domain"),
    industry: formData.get("industry"),
    employeeCount: formData.get("employeeCount"),
    phone: formData.get("phone"),
    website: formData.get("website"),
    addressLine1: formData.get("addressLine1"),
    addressLine2: formData.get("addressLine2"),
    city: formData.get("city"),
    region: formData.get("region"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    description: formData.get("description"),
    ownerId: formData.get("ownerId"),
    tags: parseTagInput(formData.get("tags")),
  };
}

export async function createCompanyAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = companySchema.safeParse(companyFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let companyId = "";
  try {
    const company = await createCompany(parsed.data, user.id);
    companyId = company.id;
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/companies");
  revalidatePath("/dashboard");
  redirect(`/companies/${companyId}`);
}

export async function updateCompanyAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireUserForAction();
  const parsed = companySchema.safeParse(companyFromFormData(formData));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateCompany(companyId, parsed.data);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function archiveCompanyAction(companyId: string) {
  await requireUserForAction();
  try {
    await setCompanyArchived(companyId, true);
  } catch (error) {
    redirect(`/companies/${companyId}?error=${encodeURIComponent(errorMessage(error))}`);
  }
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect("/companies");
}

export async function restoreCompanyAction(companyId: string) {
  await requireUserForAction();
  await setCompanyArchived(companyId, false);
  revalidatePath("/companies");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}
