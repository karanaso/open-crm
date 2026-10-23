import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/directory/company-form";
import { createCompanyAction } from "@/actions/companies";
import { requireUser } from "@/lib/auth/guards";
import { listTeamMembers } from "@/lib/services/users";

export default async function NewCompanyPage() {
  const user = await requireUser();
  const team = await listTeamMembers();
  const owners = team
    .filter((member) => member.status === "active")
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="New company" description="Add an organization to your customer directory." />
      <Card>
        <CardContent className="pt-5">
          <CompanyForm
            action={createCompanyAction}
            owners={owners}
            defaultOwnerId={user.id}
            submitLabel="Create company"
          />
        </CardContent>
      </Card>
    </div>
  );
}
