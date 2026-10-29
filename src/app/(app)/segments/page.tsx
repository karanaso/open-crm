import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RowEditLink } from "@/components/ui/row-edit-link";
import { TagList } from "@/components/ui/badges";
import { LocalTime } from "@/components/ui/local-time";
import { listSegments } from "@/lib/services/marketing";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const t = await getTranslations("marketing");
  const tCommon = await getTranslations("common");
  const locale = await getLocale();
  const segments = await listSegments(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("segments")}
        description={t("segmentsDescription")}
        actions={
          <Button asChild>
            <Link href="/segments/new">
              <Plus className="size-4" /> {t("newSegment")}
            </Link>
          </Button>
        }
      />

      {segments.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("segmentsEmptyTitle")}
          description={t("segmentsEmptyDescription")}
          action={<Button asChild><Link href="/segments/new">{t("newSegment")}</Link></Button>}
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("segment")}</TableHead>
                <TableHead>{t("criteria")}</TableHead>
                <TableHead>{t("audience")}</TableHead>
                <TableHead>{tCommon("updated")}</TableHead>
                <TableHead className="w-12 text-right">
                  <span className="sr-only">{tCommon("actions")}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segments.map((segment) => (
                <TableRow key={segment.id}>
                  <TableCell>
                    <Link href={`/segments/${segment.id}`} className="font-medium hover:underline">
                      {segment.name}
                    </Link>
                    {segment.description ? (
                      <p className="max-w-md truncate text-xs text-muted-foreground">{segment.description}</p>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {segment.criteria.tags?.length ? <TagList tags={segment.criteria.tags} /> : null}
                      {segment.criteria.industry ? <Badge variant="outline">{segment.criteria.industry}</Badge> : null}
                      {segment.criteria.jobTitle ? <Badge variant="outline">{segment.criteria.jobTitle}</Badge> : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link href={`/segments/${segment.id}`} className="font-medium hover:underline">
                      {formatNumber(segment.audienceCount, locale)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <LocalTime value={segment.updatedAt} options={{ dateStyle: "medium" }} />
                  </TableCell>
                  <TableCell className="text-right">
                    <RowEditLink
                      href={`/segments/${segment.id}/edit`}
                      label={tCommon("editFor", { name: segment.name })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
