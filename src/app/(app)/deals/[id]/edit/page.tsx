import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DealForm } from "@/components/deals/deal-form";
import { updateDealAction } from "@/actions/deals";
import { getDeal } from "@/lib/services/deals";
import { getPipelineOptions } from "@/lib/services/pipelines";
import { getCompanyPickerOptions, getCompany } from "@/lib/services/companies";
import { getContactPickerOptions, getContact } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const t = await getTranslations("sales");
  const tCommon = await getTranslations("common");

  const [pipelines, companies, contacts, team, currentCompany, currentContact] = await Promise.all([
    getPipelineOptions(),
    getCompanyPickerOptions(),
    getContactPickerOptions(),
    listTeamMembers(),
    getCompany(deal.companyId),
    deal.contactId ? getContact(deal.contactId) : Promise.resolve(null),
  ]);

  const owners = team
    .filter((member) => member.status === "active" || member.id === deal.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const companyOptions = companies.map((company) => ({ id: company.id, name: company.name }));
  if (currentCompany && !companyOptions.some((company) => company.id === currentCompany.id)) {
    companyOptions.push({ id: currentCompany.id, name: currentCompany.name });
  }

  const contactOptions = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyId: contact.companyId,
  }));
  if (currentContact && !contactOptions.some((contact) => contact.id === currentContact.id)) {
    contactOptions.push({
      id: currentContact.id,
      firstName: currentContact.firstName,
      lastName: currentContact.lastName,
      companyId: currentContact.companyId,
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={t("editDealTitle", { name: deal.name })}
        description={t("editDealDescription")}
      />
      <Card>
        <CardContent className="pt-5">
          <DealForm
            action={updateDealAction.bind(null, deal.id)}
            pipelines={pipelines}
            companies={companyOptions}
            contacts={contactOptions}
            owners={owners}
            defaultOwnerId={deal.ownerId}
            initial={{
              name: deal.name,
              companyId: deal.companyId,
              contactId: deal.contactId,
              pipelineId: deal.pipelineId,
              stageId: deal.stageId,
              ownerId: deal.ownerId,
              amount: deal.amount,
              expectedCloseDate: deal.expectedCloseDate,
              description: deal.description,
              lostReason: deal.lostReason,
              updatedAt: deal.updatedAt.toISOString(),
            }}
            submitLabel={tCommon("saveChanges")}
            cancelHref={`/deals/${deal.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
