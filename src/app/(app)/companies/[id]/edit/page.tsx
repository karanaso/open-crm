import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CompanyForm } from "@/components/directory/company-form";
import { updateCompanyAction } from "@/actions/companies";
import { getCompany } from "@/lib/services/companies";
import { listTeamMembers } from "@/lib/services/users";

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const company = await getCompany(id);
  if (!company) notFound();

  const team = await listTeamMembers();
  const owners = team
    .filter((member) => member.status === "active" || member.id === company.ownerId)
    .map((member) => ({ id: member.id, name: member.name, status: member.status }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={`Edit ${company.name}`} description="Update company details, ownership, and tags." />
      <Card>
        <CardContent className="pt-5">
          <CompanyForm
            action={updateCompanyAction.bind(null, company.id)}
            initial={company}
            owners={owners}
            defaultOwnerId={company.ownerId}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  );
}
