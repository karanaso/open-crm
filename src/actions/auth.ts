"use server";

import { AuthError } from "next-auth";
import { redirect } from "@/lib/redirect";
import { revalidatePath } from "next/cache";
import { signIn, signOut } from "@/auth";
import { fieldErrorsFromZod, sanitizeCallbackUrl, type ActionState } from "@/lib/action-state";
import { errorDescriptor } from "@/lib/errors";
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
  findUserByEmail,
  setUserStatus,
  updateUserName,
} from "@/lib/services/users";
import { appUrl } from "@/lib/env";
import { hasSignInError } from "@/lib/auth/sign-in";
import { defaultLocale, isLocale } from "@/i18n/config";
import { getLocaleCookie, setLocaleCookie } from "@/i18n/cookie";
import { syncThemeCookiesForUser } from "@/lib/theme/cookie";

function genericSignInError() {
  return { key: "auth.signInFailed" } as const;
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

  let redirectUrl: string | undefined;
  try {
    redirectUrl = await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) return { error: genericSignInError() };
    throw error;
  }

  if (hasSignInError(redirectUrl)) {
    return { error: genericSignInError() };
  }

  const user = await findUserByEmail(parsed.data.email);
  if (user && isLocale(user.locale)) {
    await setLocaleCookie(user.locale);
  }
  if (user) {
    await syncThemeCookiesForUser(user);
  }

  redirect(callbackUrl);
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

  const locale = (await getLocaleCookie()) ?? defaultLocale;

  let created: Awaited<ReturnType<typeof setupFirstAdmin>> | null = null;
  try {
    created = await setupFirstAdmin({ ...parsed.data, locale });
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  await setLocaleCookie(locale);
  await syncThemeCookiesForUser(created);

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { key: "auth.accountCreatedSignInFailed" } };
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

  const locale = (await getLocaleCookie()) ?? defaultLocale;

  let created: Awaited<ReturnType<typeof acceptInvite>> | null = null;
  let email = "";
  try {
    created = await acceptInvite({
      token,
      name: parsed.data.name,
      password: parsed.data.password,
      locale,
    });
    email = created.email;
  } catch (error) {
    return { error: errorDescriptor(error) };
  }

  await setLocaleCookie(locale);
  await syncThemeCookiesForUser(created);

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: { key: "auth.accountCreatedSignInFailed" } };
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
  return { error: { key: "auth.resetRequestAdmin" } };
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
    return { error: errorDescriptor(error) };
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
  return { success: { key: "settings.profileUpdated" } };
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
    return { error: errorDescriptor(error) };
  }

  await signOut({ redirect: false });
  redirect("/login?changed=1");
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
      success: { key: "settings.invitationCreated", params: { email: parsed.data.email } },
      inviteUrl: `${appUrl}/invite/${token}`,
    };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}

export async function revokeInviteAction(inviteId: string) {
  await requireAdminForAction();
  try {
    await revokeInvite(inviteId);
    revalidatePath("/settings/team");
    return { success: { key: "settings.invitationRevoked" } };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}

export async function changeRoleAction(userId: string, role: "admin" | "member") {
  const admin = await requireAdminForAction();
  try {
    await changeUserRole(admin.id, userId, role);
    revalidatePath("/settings/team");
    return { success: { key: "settings.roleUpdated" } };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}

export async function setUserStatusAction(userId: string, status: "active" | "inactive") {
  const admin = await requireAdminForAction();
  try {
    await setUserStatus(admin.id, userId, status);
    revalidatePath("/settings/team");
    return { success: { key: status === "active" ? "settings.memberReactivated" : "settings.memberDeactivated" } };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}

export async function createResetLinkAction(userId: string) {
  const admin = await requireAdminForAction();
  try {
    const { token } = await createPasswordReset({ userId, createdById: admin.id });
    return {
      success: { key: "settings.resetLinkCreated" },
      resetUrl: `${appUrl}/reset/${token}`,
    };
  } catch (error) {
    return { error: errorDescriptor(error) };
  }
}

export async function assertAdminAction() {
  const admin = await requireAdminForAction();
  return admin;
}
