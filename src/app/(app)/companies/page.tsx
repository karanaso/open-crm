import Link from "next/link";
import { Building2, Plus, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TagList } from "@/components/ui/badges";
import { Badge } from "@/components/ui/badge";
import { LocalTime } from "@/components/ui/local-time";
import { buildHref, getParam } from "@/lib/search-params";
import { companyListParamsSchema } from "@/lib/validation/company";
import { getCompanyFilterOptions, listCompanies } from "@/lib/services/companies";

export const dynamic = "force-dynamic";

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = companyListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    ownerId: getParam(raw, "ownerId") || undefined,
    tag: getParam(raw, "tag") || undefined,
    industry: getParam(raw, "industry") || undefined,
    archived: getParam(raw, "archived") || "active",
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success
    ? parsed.data
    : { q: "", archived: "active" as const, page: 1, pageSize: 20 };
  const [data, options] = await Promise.all([listCompanies(params), getCompanyFilterOptions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="The organizations your team works with, with owners, tags, and related records."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/import?target=companies">
                <Upload className="size-4" /> Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/companies/new">
                <Plus className="size-4" /> New company
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input name="q" defaultValue={params.q} placeholder="Search name or domain…" aria-label="Search companies" />
            <select
              name="ownerId"
              defaultValue={params.ownerId ?? ""}
              aria-label="Filter by owner"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All owners</option>
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
            <select
              name="industry"
              defaultValue={params.industry ?? ""}
              aria-label="Filter by industry"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All industries</option>
              {options.industries.map((industry) => (
                <option key={industry} value={industry}>
                  {industry}
                </option>
              ))}
            </select>
            <Input
              name="tag"
              defaultValue={params.tag ?? ""}
              placeholder="Tag or tags, comma-separated"
              aria-label="Filter by tags"
              list="company-tag-options"
            />
            <datalist id="company-tag-options">
              {options.tags.map((tag) => (
                <option key={tag} value={tag} />
              ))}
            </datalist>
            <div className="flex gap-2">
              <select
                name="archived"
                defaultValue={params.archived}
                aria-label="Archive filter"
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">Active</option>
                <option value="archived">Archived</option>
                <option value="all">All</option>
              </select>
              <Button type="submit" variant="secondary">
                Filter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={params.q || params.ownerId || params.tag ? "No companies match those filters" : "No companies yet"}
          description={
            params.q || params.ownerId || params.tag
              ? "Try clearing a filter or searching for a different term."
              : "Add the first company to start building your customer directory."
          }
          action={
            <Button asChild>
              <Link href="/companies/new">New company</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((company) => (
                <TableRow key={company.id}>
                  <TableCell>
                    <Link href={`/companies/${company.id}`} className="font-medium hover:underline">
                      {company.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">{company.domain ?? "—"}</p>
                    {company.archivedAt ? (
                      <Badge variant="outline" className="mt-1">
                        Archived
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{company.industry ?? "—"}</TableCell>
                  <TableCell>
                    <span>{company.ownerName}</span>
                    {company.ownerStatus === "inactive" ? (
                      <Badge variant="outline" className="ml-2">
                        Inactive
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <TagList tags={company.tagNames} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={company.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t p-4">
            <Pagination
              page={data.page}
              pageCount={data.pageCount}
              total={data.total}
              pageSize={data.pageSize}
              buildHref={(page) => buildHref("/companies", raw, { page: String(page) })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
