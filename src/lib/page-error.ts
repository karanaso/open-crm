export function logPageError(error: Error & { digest?: string }) {
  if (process.env.NODE_ENV === "development") {
    console.error(error);
  } else {
    console.error("Page error", error.digest);
  }
}
