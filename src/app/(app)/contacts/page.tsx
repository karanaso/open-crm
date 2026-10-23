import Link from "next/link";
import { Plus, Upload, Users } from "lucide-react";
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
import { contactListParamsSchema } from "@/lib/validation/contact";
import { getContactFilterOptions, listContacts } from "@/lib/services/contacts";

export const dynamic = "force-dynamic";

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const parsed = contactListParamsSchema.safeParse({
    q: getParam(raw, "q") ?? "",
    ownerId: getParam(raw, "ownerId") || undefined,
    companyId: getParam(raw, "companyId") || undefined,
    tag: getParam(raw, "tag") || undefined,
    archived: getParam(raw, "archived") || "active",
    page: getParam(raw, "page") || 1,
    pageSize: getParam(raw, "pageSize") || 20,
  });
  const params = parsed.success
    ? parsed.data
    : { q: "", archived: "active" as const, page: 1, pageSize: 20 };
  const [data, options] = await Promise.all([listContacts(params), getContactFilterOptions()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="The people behind your customer relationships, linked to companies and activity."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/import?target=contacts">
                <Upload className="size-4" /> Import CSV
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contacts/new">
                <Plus className="size-4" /> New contact
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input name="q" defaultValue={params.q} placeholder="Search name or email…" aria-label="Search contacts" />
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
              name="companyId"
              defaultValue={params.companyId ?? ""}
              aria-label="Filter by company"
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All companies</option>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <Input
              name="tag"
              defaultValue={params.tag ?? ""}
              placeholder="Tag or tags, comma-separated"
              aria-label="Filter by tags"
              list="contact-tag-options"
            />
            <datalist id="contact-tag-options">
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
          icon={Users}
          title={params.q || params.ownerId || params.tag ? "No contacts match those filters" : "No contacts yet"}
          description={
            params.q || params.ownerId || params.tag
              ? "Try clearing a filter or searching for a different term."
              : "Add your first contact to start tracking relationships."
          }
          action={
            <Button asChild>
              <Link href="/contacts/new">New contact</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                      {contact.firstName} {contact.lastName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{contact.jobTitle ?? "—"}</p>
                    {contact.archivedAt ? (
                      <Badge variant="outline" className="mt-1">
                        Archived
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    {contact.companyName ? (
                      <Link href={`/companies/${contact.companyId}`} className="hover:underline">
                        {contact.companyName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{contact.email}</TableCell>
                  <TableCell>
                    {contact.ownerName}
                    {contact.ownerStatus === "inactive" ? (
                      <Badge variant="outline" className="ml-2">
                        Inactive
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <TagList tags={contact.tagNames} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={contact.updatedAt} options={{ dateStyle: "medium" }} />
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
              buildHref={(page) => buildHref("/contacts", raw, { page: String(page) })}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
