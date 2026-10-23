export function hasSignInError(url: string | undefined): boolean {
  if (!url) return true;
  try {
    return new URL(url, "http://localhost").searchParams.has("error");
  } catch {
    return true;
  }
}
