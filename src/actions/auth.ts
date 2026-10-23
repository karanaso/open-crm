"use server";

import { AuthError } from "next-auth";
import { redirect } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { fieldErrorsFromZod, sanitizeCallbackUrl, type ActionState } from "@/lib/action-state";
import { errorMessage } from "@/lib/errors";
import { requireUserForAction, requireAdminForAction } from "@/lib/auth/guards";
import {
  loginSchema,
  setupSchema,
  inviteAcceptSchema,
  inviteCreateSchema,
  passwordChangeSchema,
  resetPasswordSchema,
  nameSchema,
} from "@/lib/validation/auth";
import { setupFirstAdmin } from "@/lib/services/setup";
import {
  acceptInvite,
  createInvite,
  createPasswordReset,
  resetPasswordWithToken,
  revokeInvite,
} from "@/lib/services/invites";
import {
  changePassword,
  changeUserRole,
  setUserStatus,
  updateUserName,
} from "@/lib/services/users";
import { appUrl } from "@/lib/env";

function genericSignInError() {
  return "Unable to sign in. Check your credentials or contact an administrator.";
}

export async function signInAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const callbackUrl = sanitizeCallbackUrl(formData.get("callbackUrl")?.toString());

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: genericSignInError() };
    throw error;
  }

  return null;
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function setupAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = setupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await setupFirstAdmin(parsed.data);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Your account was created, but sign-in failed. Go to sign-in and try again." };
    }
    throw error;
  }

  return null;
}

export async function acceptInviteAction(
  token: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = inviteAcceptSchema.safeParse({
    name: formData.get("name"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  let email = "";
  try {
    const user = await acceptInvite({
      token,
      name: parsed.data.name,
      password: parsed.data.password,
    });
    email = user.email;
  } catch (error) {
    return { error: errorMessage(error) };
  }

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Your account was created, but sign-in failed. Go to sign-in and try again." };
    }
    throw error;
  }

  return null;
}

export async function requestResetAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  void formData;
  return { error: "Password resets are issued by an administrator. Ask a teammate with admin access." };
}

export async function resetPasswordAction(
  token: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await resetPasswordWithToken({ token, password: parsed.data.password });
  } catch (error) {
    return { error: errorMessage(error) };
  }

  redirect("/login?reset=1");
}

export async function updateProfileAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = nameSchema.safeParse(formData.get("name"));
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  await updateUserName(user.id, parsed.data);
  revalidatePath("/settings/profile");
  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePasswordAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUserForAction();
  const parsed = passwordChangeSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    await changePassword(user, parsed.data.currentPassword, parsed.data.newPassword);
  } catch (error) {
    return { error: errorMessage(error) };
  }

  try {
    await signIn("credentials", {
      email: user.email,
      password: parsed.data.newPassword,
      redirectTo: "/settings/profile?changed=1",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Password changed. Sign in again with your new password." };
    }
    throw error;
  }

  return null;
}

export async function createInviteAction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdminForAction();
  const parsed = inviteCreateSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role") ?? "member",
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error) };

  try {
    const { token } = await createInvite({
      email: parsed.data.email,
      role: parsed.data.role,
      invitedById: admin.id,
    });
    revalidatePath("/settings/team");
    return {
      success: `Invitation created for ${parsed.data.email}. Share this link once:`,
      inviteUrl: `${appUrl}/invite/${token}`,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function revokeInviteAction(inviteId: string) {
  await requireAdminForAction();
  try {
    await revokeInvite(inviteId);
    revalidatePath("/settings/team");
    return { success: "Invitation revoked." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function changeRoleAction(userId: string, role: "admin" | "member") {
  const admin = await requireAdminForAction();
  try {
    await changeUserRole(admin.id, userId, role);
    revalidatePath("/settings/team");
    return { success: "Role updated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function setUserStatusAction(userId: string, status: "active" | "inactive") {
  const admin = await requireAdminForAction();
  try {
    await setUserStatus(admin.id, userId, status);
    revalidatePath("/settings/team");
    return { success: status === "active" ? "Member reactivated." : "Member deactivated." };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function createResetLinkAction(userId: string) {
  const admin = await requireAdminForAction();
  try {
    const { token } = await createPasswordReset({ userId, createdById: admin.id });
    return {
      success: "Password reset link created. Share it once:",
      resetUrl: `${appUrl}/reset/${token}`,
    };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

export async function assertAdminAction() {
  const admin = await requireAdminForAction();
  return admin;
}
