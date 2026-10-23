import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ListingForm } from "@/components/listings/listing-form";
import { createListingAction } from "@/actions/listings";
import { requireUser } from "@/lib/auth/guards";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";
import { getWorkspaceDefaults } from "@/lib/services/workspace-settings";
import { getListingsTranslator } from "@/components/listings/get-listings-translator";

export default async function NewListingPage() {
  const user = await requireUser();
  const t = await getListingsTranslator();
  const [contacts, team, defaults] = await Promise.all([
    getContactPickerOptions(),
    listTeamMembers(),
    getWorkspaceDefaults(),
  ]);

  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={t("newListing")} description={t("newListingDescription")} />
      <Card>
        <CardContent className="pt-5">
          <ListingForm
            action={createListingAction}
            sellers={contacts.map((contact) => ({
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              companyName: contact.companyName,
              archivedAt: null,
            }))}
            owners={owners}
            defaultOwnerId={user.id}
            defaultCurrency={defaults.defaultCurrency}
            submitLabel={t("createListing")}
            cancelHref="/listings"
          />
        </CardContent>
      </Card>
    </div>
  );
}
