"use client";

import { useTranslations } from "next-intl";

export type ListingsTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * The listings UI catalog is owned by the localization lane; the shared
 * messages file is updated alongside this module. This wrapper keeps the
 * namespace explicit while the catalog entries are being added.
 */
export function useListingsTranslator() {
  return useTranslations("listings") as unknown as ListingsTranslator;
}
