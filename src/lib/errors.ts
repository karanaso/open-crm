export class AppError extends Error {
  code: string;

  constructor(message: string, code = "BAD_REQUEST") {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function errorMessage(error: unknown) {
  if (error instanceof AppError) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}
