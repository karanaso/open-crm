import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DealForm, type ListingOption } from "@/components/deals/deal-form";
import { updateDealAction } from "@/actions/deals";
import { getDeal } from "@/lib/services/deals";
import { getPipelineOptions } from "@/lib/services/pipelines";
import { getCompanyPickerOptions, getCompany } from "@/lib/services/companies";
import { getContactPickerOptions, getContact } from "@/lib/services/contacts";
import { getListing, getListingOptions } from "@/lib/services/listings";
import { listTeamMembers } from "@/lib/services/users";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deal = await getDeal(id);
  if (!deal) notFound();
  const t = await getTranslations("sales");
  const tCommon = await getTranslations("common");

  const [
    pipelines,
    companies,
    contacts,
    listingOptions,
    team,
    currentCompany,
    currentContact,
    currentListing,
    workspace,
  ] = await Promise.all([
    getPipelineOptions(),
    getCompanyPickerOptions(),
    getContactPickerOptions(),
    getListingOptions(),
    listTeamMembers(),
    deal.companyId ? getCompany(deal.companyId) : Promise.resolve(null),
    getContact(deal.contactId),
    deal.listingId ? getListing(deal.listingId) : Promise.resolve(null),
    getWorkspaceDefaults(),
  ]);

  const owners = team
    .filter((member) => member.status === "active" || member.id === deal.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  const companyOptions = companies.map((company) => ({
    id: company.id,
    name: company.name,
    archived: false,
  }));
  if (currentCompany && !companyOptions.some((company) => company.id === currentCompany.id)) {
    companyOptions.push({
      id: currentCompany.id,
      name: currentCompany.name,
      archived: Boolean(currentCompany.archivedAt),
    });
  }

  const contactOptions = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyId: contact.companyId,
    archived: false,
  }));
  if (currentContact && !contactOptions.some((contact) => contact.id === currentContact.id)) {
    contactOptions.push({
      id: currentContact.id,
      firstName: currentContact.firstName,
      lastName: currentContact.lastName,
      companyId: currentContact.companyId,
      archived: Boolean(currentContact.archivedAt),
    });
  }

  const listings: ListingOption[] = listingOptions.map((listing) => ({ ...listing }));
  if (currentListing && !listings.some((listing) => listing.id === currentListing.id)) {
    listings.push({
      id: currentListing.id,
      reference: currentListing.reference,
      title: currentListing.title,
      transaction: currentListing.transaction,
      price: currentListing.price,
      pricePeriod: currentListing.pricePeriod,
      currency: currentListing.currency,
      commissionAmount: currentListing.commissionAmount,
      status: currentListing.status,
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
            listings={listings}
            owners={owners}
            defaultOwnerId={deal.ownerId}
            defaultCurrency={deal.currency || workspace.defaultCurrency}
            initial={{
              name: deal.name,
              companyId: deal.companyId,
              contactId: deal.contactId,
              listingId: deal.listingId,
              pipelineId: deal.pipelineId,
              stageId: deal.stageId,
              ownerId: deal.ownerId,
              propertyPrice: deal.propertyPrice,
              amount: deal.amount,
              currency: deal.currency,
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
