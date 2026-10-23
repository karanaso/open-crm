import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { TagList } from "@/components/ui/badges";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LocalTime } from "@/components/ui/local-time";
import { getSegment, getSegmentAudience } from "@/lib/services/marketing";
import { archiveSegmentAction } from "@/actions/marketing";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export default async function SegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  await requireUser();
  const segment = await getSegment(id);
  if (!segment) notFound();
  const audience = await getSegmentAudience(segment.criteria);
  const error = getParam(raw, "error");
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");

  return (
    <div className="space-y-6">
      <PageHeader
        title={segment.name}
        description={segment.description ?? undefined}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href={`/segments/${segment.id}/edit`}>
                <Pencil className="size-4" /> {tCommon("edit")}
              </Link>
            </Button>
            {!segment.archivedAt ? (
              <form action={archiveSegmentAction.bind(null, segment.id)}>
                <ConfirmSubmit
                  message={t("archiveSegmentConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Trash2 className="size-4" /> {tCommon("archive")}
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      <PageError code={error} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("matchingContacts", { count: segment.audienceCount })}</CardTitle>
          </CardHeader>
          <CardContent>
            {audience.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noMatchingContacts")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{tCommon("name")}</TableHead>
                    <TableHead>{tCommon("company")}</TableHead>
                    <TableHead>{tCommon("email")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audience.map((contact) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link href={`/contacts/${contact.id}`} className="font-medium hover:underline">
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>{contact.companyName ?? "—"}</TableCell>
                      <TableCell>{contact.email}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("criteria")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {segment.archivedAt ? <Badge variant="outline">{tCommon("archived")}</Badge> : null}
              <div>
                <p className="text-muted-foreground">{tCommon("tags")}</p>
                {segment.criteria.tags?.length ? <TagList tags={segment.criteria.tags} /> : <p>{t("any")}</p>}
              </div>
              <div>
                <p className="text-muted-foreground">{t("industry")}</p>
                <p>{segment.criteria.industry ?? t("any")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("jobTitleContains")}</p>
                <p>{segment.criteria.jobTitle ?? t("any")}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("createdBetween")}</p>
                <p>
                  {segment.criteria.createdFrom ?? t("any")} – {segment.criteria.createdTo ?? t("any")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t("createdBy")}</p>
                <p>{segment.creatorName}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{tCommon("updated")}</p>
                <LocalTime value={segment.updatedAt} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
