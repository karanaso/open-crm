import { getTranslations } from "next-intl/server";
import type { ListingsTranslator } from "@/components/listings/use-listings-translator";

/** Server counterpart of `useListingsTranslator`. */
export async function getListingsTranslator() {
  return (await getTranslations("listings")) as unknown as ListingsTranslator;
}
