import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { DealForm } from "@/components/deals/deal-form";
import { createDealAction } from "@/actions/deals";
import { requireUser } from "@/lib/auth/guards";
import { getPipelineOptions } from "@/lib/services/pipelines";
import { getCompanyPickerOptions } from "@/lib/services/companies";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { listTeamMembers } from "@/lib/services/users";

export default async function NewDealPage() {
  const user = await requireUser();
  const [pipelines, companies, contacts, team] = await Promise.all([
    getPipelineOptions(),
    getCompanyPickerOptions(),
    getContactPickerOptions(),
    listTeamMembers(),
  ]);

  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New deal" description="Add an opportunity and place it in your pipeline." />
      <Card>
        <CardContent className="pt-5">
          <DealForm
            action={createDealAction}
            pipelines={pipelines}
            companies={companies.map((company) => ({ id: company.id, name: company.name }))}
            contacts={contacts.map((contact) => ({
              id: contact.id,
              firstName: contact.firstName,
              lastName: contact.lastName,
              companyId: contact.companyId,
            }))}
            owners={owners}
            defaultOwnerId={user.id}
            submitLabel="Create deal"
            cancelHref="/deals"
          />
        </CardContent>
      </Card>
    </div>
  );
}
