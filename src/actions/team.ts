"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/lib/redirect";
import { requireAdminForAction } from "@/lib/auth/guards";
import { errorCode } from "@/lib/errors";
import { changeUserRole, setUserStatus } from "@/lib/services/users";
import { revokeInvite } from "@/lib/services/invites";

function teamRedirect(error?: unknown): never {
  if (error) redirect(`/settings/team?error=${encodeURIComponent(errorCode(error))}`);
  redirect("/settings/team");
}

export async function changeRoleFormAction(userId: string, formData: FormData) {
  const admin = await requireAdminForAction();
  const role = formData.get("role");
  if (role !== "admin" && role !== "member") teamRedirect("Choose a valid role.");
  try {
    await changeUserRole(admin.id, userId, role);
  } catch (error) {
    teamRedirect(error);
  }
  revalidatePath("/settings/team");
  revalidatePath("/dashboard");
  teamRedirect();
}

export async function setUserStatusFormAction(userId: string, status: "active" | "inactive") {
  const admin = await requireAdminForAction();
  try {
    await setUserStatus(admin.id, userId, status);
  } catch (error) {
    teamRedirect(error);
  }
  revalidatePath("/settings/team");
  revalidatePath("/dashboard");
  teamRedirect();
}

export async function revokeInviteFormAction(inviteId: string) {
  await requireAdminForAction();
  try {
    await revokeInvite(inviteId);
  } catch (error) {
    teamRedirect(error);
  }
  revalidatePath("/settings/team");
  teamRedirect();
}
