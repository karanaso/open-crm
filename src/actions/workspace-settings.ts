"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireAdminForAction } from "@/lib/auth/guards";
import { fieldErrorsFromZod, type ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
import { workspaceSettingsSchema } from "@/lib/validation/workspace-settings";
import { updateWorkspaceSettings } from "@/lib/services/workspace-settings";

export async function updateWorkspaceSettingsAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireAdminForAction();
  const parsed = workspaceSettingsSchema.safeParse({
    defaultCurrency: formData.get("defaultCurrency"),
    timeZone: formData.get("timeZone"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await updateWorkspaceSettings(parsed.data);
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  revalidatePath("/settings/workspace");
  revalidatePath("/dashboard");
  revalidatePath("/listings");
  revalidatePath("/deals");
  redirect("/settings/workspace");
}
