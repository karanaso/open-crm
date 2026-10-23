import type { Route } from "next";
import { redirect as nextRedirect, type RedirectType } from "next/navigation";

export function redirect(path: string, type?: RedirectType): never {
  return nextRedirect(path as Route, type);
}
