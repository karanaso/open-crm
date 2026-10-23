import { getTranslations } from "next-intl/server";
import { NotFoundContent } from "@/components/error-pages/not-found-content";

export const dynamic = "force-dynamic";

export default async function NotFound() {
  const t = await getTranslations("errorPages");

  return (
    <NotFoundContent
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      backLabel={t("backToDashboard")}
    />
  );
}
