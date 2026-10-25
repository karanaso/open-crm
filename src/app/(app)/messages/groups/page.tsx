import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LocalTime } from "@/components/ui/local-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listMessageGroups } from "@/lib/services/messaging";
import { requireUser } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export default async function MessageGroupsPage() {
  await requireUser();
  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");
  const groups = await listMessageGroups(true);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("groups")}
        description={t("groupsDescription")}
        actions={
          <Button asChild>
            <Link href="/messages/groups/new">
              <Plus className="size-4" /> {t("newGroup")}
            </Link>
          </Button>
        }
      />

      {groups.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t("noAudiencesTitle")}
          description={t("noAudiencesDescription")}
          action={
            <Button asChild>
              <Link href="/messages/groups/new">{t("newGroup")}</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("group")}</TableHead>
                <TableHead>{t("members")}</TableHead>
                <TableHead>{tCommon("created")}</TableHead>
                <TableHead>{tCommon("updated")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell>
                    <Link
                      href={`/messages/groups/${group.id}`}
                      className="font-medium hover:underline"
                    >
                      {group.name}
                    </Link>
                    {group.archivedAt ? (
                      <Badge variant="outline" className="ml-2">
                        {t("archivedGroup")}
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{t("memberCount", { count: group.memberCount })}</TableCell>
                  <TableCell>
                    <LocalTime value={group.createdAt} />
                  </TableCell>
                  <TableCell>
                    <LocalTime value={group.updatedAt} />
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
