export type MessageDescriptor = {
  key: string;
  params?: Record<string, string | number>;
};

export const ERROR_CODES = [
  "BAD_REQUEST",
  "GENERIC",
  "NOT_FOUND",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "INVALID_LOCALE",
  "INACTIVE_OWNER",
  "INVALID_TRANSITION",
  "CONFLICT",
  "ARCHIVED_CAMPAIGN",
  "STAGE_PIPELINE_MISMATCH",
  "OCCUPIED_STAGE",
  "LOST_REASON_REQUIRED",
  "LAST_ADMIN",
  "INVALID_TIME",
  "INVALID_LINK",
  "INACTIVE_ASSIGNEE",
  "FUTURE_ACTIVITY",
  "EXISTING_USER",
  "CSV_MAPPING",
  "ARCHIVED_COMPANY",
  "USED_RESET",
  "USED_INVITE",
  "SETUP_COMPLETE",
  "SELF_DEACTIVATE",
  "REVOKED_INVITE",
  "PAST_DUE_DATE",
  "OCCUPIED_PIPELINE",
  "LAST_OUTCOME_STAGE",
  "INVALID_RESET",
  "INVALID_PASSWORD",
  "INVALID_INVITE",
  "EXPIRED_RESET",
  "EXPIRED_INVITE",
  "EMPTY_COMMENT",
  "EMPTY_AUDIENCE",
  "DUPLICATE_EMAIL",
  "DEFAULT_PIPELINE",
  "CSV_TOO_MANY_ROWS",
  "CSV_PARSE_ERROR",
  "CONTACT_COMPANY_MISMATCH",
  "ARCHIVED_SEGMENT",
  "ARCHIVED_PIPELINE",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export function isErrorCode(value: string | null | undefined): value is ErrorCode {
  return Boolean(value) && (ERROR_CODES as readonly string[]).includes(value as string);
}

export class AppError extends Error {
  code: string;
  params?: Record<string, string | number>;

  constructor(
    message: string,
    code = "BAD_REQUEST",
    params?: Record<string, string | number>,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.params = params;
  }
}

export function errorDescriptor(error: unknown): MessageDescriptor {
  if (error instanceof AppError) {
    return {
      key: `errors.${isErrorCode(error.code) ? error.code : "GENERIC"}`,
      params: error.params,
    };
  }

  if (error instanceof Error) {
    if (error.name === "UnauthorizedError") return { key: "errors.UNAUTHORIZED" };
    if (error.name === "ForbiddenError") return { key: "errors.FORBIDDEN" };
  }

  console.error(error);
  return { key: "errors.GENERIC" };
}

export function errorCode(error: unknown): string {
  return errorDescriptor(error).key.replace(/^errors\./, "");
}

export function errorMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}
