import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/directory/contact-form";
import { updateContactAction } from "@/actions/contacts";
import { getContact } from "@/lib/services/contacts";
import { getCompanyPickerOptions } from "@/lib/services/companies";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const contact = await getContact(id);
  if (!contact) notFound();

  const [team, companies] = await Promise.all([listTeamMembers(), getCompanyPickerOptions()]);
  const t = await getTranslations("directory");
  const tCommon = await getTranslations("common");
  const owners = team
    .filter((member) => member.status === "active" || member.id === contact.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const companyOptions = [...companies];
  if (contact.companyId && !companyOptions.some((company) => company.id === contact.companyId)) {
    companyOptions.push({
      id: contact.companyId,
      name: contact.companyName ?? t("unknownCompany"),
      domain: null,
      archivedAt: contact.companyArchivedAt,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("editContactTitle", { name: `${contact.firstName} ${contact.lastName}` })}
        description={t("editContactDescription")}
      />
      <Card>
        <CardContent className="pt-5">
          <ContactForm
            action={updateContactAction.bind(null, contact.id)}
            initial={contact}
            owners={owners}
            companies={companyOptions}
            defaultOwnerId={contact.ownerId}
            submitLabel={tCommon("saveChanges")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
