import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Upload, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowEditLink } from "@/components/ui/row-edit-link";
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
  const t = await getTranslations("directory");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("contacts")}
        description={t("contactsDescription")}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/import?target=contacts">
                <Upload className="size-4" /> {t("import")}
              </Link>
            </Button>
            <Button asChild>
              <Link href="/contacts/new">
                <Plus className="size-4" /> {t("newContact")}
              </Link>
            </Button>
          </>
        }
      />

      <Card>
        <CardContent className="pt-5">
          <form method="get" className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <Input
              name="q"
              defaultValue={params.q}
              placeholder={t("searchContactsPlaceholder")}
              aria-label={t("searchContacts")}
            />
            <select
              name="ownerId"
              defaultValue={params.ownerId ?? ""}
              aria-label={tCommon("filterByOwner")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{tCommon("allOwners")}</option>
              {options.owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.name}
                </option>
              ))}
            </select>
            <select
              name="companyId"
              defaultValue={params.companyId ?? ""}
              aria-label={t("filterByCompany")}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{t("allCompanies")}</option>
              {options.companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
            <Input
              name="tag"
              defaultValue={params.tag ?? ""}
              placeholder={t("tagsFilterPlaceholder")}
              aria-label={t("filterByTags")}
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
                aria-label={t("archiveFilter")}
                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="active">{tCommon("active")}</option>
                <option value="archived">{tCommon("archived")}</option>
                <option value="all">{tCommon("all")}</option>
              </select>
              <Button type="submit" variant="secondary">
                {tCommon("filter")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {data.items.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            params.q || params.ownerId || params.tag
              ? t("contactsNoMatchTitle")
              : t("contactsEmptyTitle")
          }
          description={
            params.q || params.ownerId || params.tag
              ? tCommon("tryClearingFilters")
              : t("contactsEmptyDescription")
          }
          action={
            <Button asChild>
              <Link href="/contacts/new">{t("newContact")}</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tCommon("name")}</TableHead>
                <TableHead>{tCommon("company")}</TableHead>
                <TableHead>{tCommon("email")}</TableHead>
                <TableHead>{tCommon("owner")}</TableHead>
                <TableHead>{tCommon("tags")}</TableHead>
                <TableHead>{tCommon("updated")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{tCommon("actions")}</span>
                </TableHead>
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
                        {tCommon("archived")}
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
                        {tCommon("inactive")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <TagList tags={contact.tagNames} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={contact.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowEditLink
                      href={`/contacts/${contact.id}/edit`}
                      label={tCommon("editFor", {
                        name: `${contact.firstName} ${contact.lastName}`,
                      })}
                    />
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
