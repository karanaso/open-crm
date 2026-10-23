import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ListingForm } from "@/components/listings/listing-form";
import { updateListingAction } from "@/actions/listings";
import { getListing } from "@/lib/services/listings";
import { getContact, getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const t = await getListingsTranslator();
  const tCommon = await getTranslations("common");
  const [contacts, team, defaults, currentSeller] = await Promise.all([
    getContactPickerOptions(),
    listTeamMembers(),
    getWorkspaceDefaults(),
    getContact(listing.sellerContactId),
  ]);

  const sellers = contacts.map((contact) => ({
    id: contact.id,
    firstName: contact.firstName,
    lastName: contact.lastName,
    companyName: contact.companyName,
    archivedAt: null as Date | string | null,
  }));
  if (currentSeller && !sellers.some((seller) => seller.id === currentSeller.id)) {
    sellers.push({
      id: currentSeller.id,
      firstName: currentSeller.firstName,
      lastName: currentSeller.lastName,
      companyName: currentSeller.companyName,
      archivedAt: currentSeller.archivedAt,
    });
  }

  const owners = team
    .filter((member) => member.status === "active" || member.id === listing.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        title={t("editListingTitle", { reference: listing.reference })}
        description={t("editListingDescription")}
      />
      <Card>
        <CardContent className="pt-5">
          <ListingForm
            action={updateListingAction.bind(null, listing.id)}
            sellers={sellers}
            owners={owners}
            defaultOwnerId={listing.ownerId}
            defaultCurrency={defaults.defaultCurrency}
            initial={{
              reference: listing.reference,
              title: listing.title,
              description: listing.description,
              transaction: listing.transaction,
              price: listing.price,
              currency: listing.currency,
              commissionAmount: listing.commissionAmount,
              propertyType: listing.propertyType,
              bedrooms: listing.bedrooms,
              bathrooms: listing.bathrooms,
              sizeSqm: listing.sizeSqm,
              lotSqm: listing.lotSqm,
              yearBuilt: listing.yearBuilt,
              floors: listing.floors,
              parking: listing.parking,
              energyClass: listing.energyClass,
              addressLine1: listing.addressLine1,
              city: listing.city,
              region: listing.region,
              postalCode: listing.postalCode,
              country: listing.country,
              sellerContactId: listing.sellerContactId,
              ownerId: listing.ownerId,
              features: listing.features,
            }}
            submitLabel={tCommon("saveChanges")}
            cancelHref={`/listings/${listing.id}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
