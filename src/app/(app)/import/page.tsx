import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { CsvImportForm } from "@/components/directory/csv-import-form";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";

export default async function ImportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  const raw = await searchParams;
  const target = getParam(raw, "target") === "contacts" ? "contacts" : "companies";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Import CSV"
        description="Bulk-add companies or contacts. Map columns, preview the rows, then confirm."
      />
      <Card>
        <CardContent className="pt-5">
          <CsvImportForm defaultTarget={target} />
        </CardContent>
      </Card>
    </div>
  );
}
