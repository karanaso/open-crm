import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/directory/contact-form";
import { createContactAction } from "@/actions/contacts";
import { requireUser } from "@/lib/auth/guards";
import { listTeamMembers } from "@/lib/services/users";
import { getCompanyPickerOptions } from "@/lib/services/companies";
import { getParam } from "@/lib/search-params";
import { getCompany } from "@/lib/services/companies";

export default async function NewContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const raw = await searchParams;
  const companyId = getParam(raw, "companyId");
  const [team, companies, preselectedCompany] = await Promise.all([
    listTeamMembers(),
    getCompanyPickerOptions(),
    companyId ? getCompany(companyId) : Promise.resolve(null),
  ]);
  const t = await getTranslations("directory");

  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const companyOptions = [...companies];
  if (preselectedCompany && !companyOptions.some((company) => company.id === preselectedCompany.id)) {
    companyOptions.push({
      id: preselectedCompany.id,
      name: preselectedCompany.name,
      domain: preselectedCompany.domain,
      archivedAt: preselectedCompany.archivedAt,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("newContact")} description={t("newContactDescription")} />
      <Card>
        <CardContent className="pt-5">
          <ContactForm
            action={createContactAction}
            initial={{ companyId: preselectedCompany?.id ?? null }}
            owners={owners}
            companies={companyOptions}
            defaultOwnerId={user.id}
            submitLabel={t("createContact")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
