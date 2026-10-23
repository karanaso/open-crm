import { z } from "zod";
import { normalizeEmail } from "@/lib/auth/normalize";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "validation.emailRequired")
  .email("validation.email")
  .transform(normalizeEmail);

export const passwordSchema = z
  .string()
  .min(12, "validation.passwordMin")
  .max(128, "validation.passwordMax");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "validation.nameRequired")
  .max(120, "validation.nameMax");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "validation.passwordRequired")
    .max(128, "validation.passwordMax"),
});

export const setupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const inviteCreateSchema = z.object({
  email: emailSchema,
  role: z.enum(["admin", "member"]).default("member"),
});

export const inviteAcceptSchema = z.object({
  name: nameSchema,
  password: passwordSchema,
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.currentPasswordRequired"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "validation.passwordsMismatch",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "validation.confirmPasswordRequired"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "validation.passwordsMismatch",
    path: ["confirmPassword"],
  });

export type SetupInput = z.infer<typeof setupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InviteCreateInput = z.infer<typeof inviteCreateSchema>;
