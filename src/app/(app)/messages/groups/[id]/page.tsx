import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Archive, ArrowLeft, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { PageError } from "@/components/ui/page-error";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddGroupMemberForm } from "@/components/messaging/add-group-member-form";
import { GroupForm } from "@/components/messaging/group-form";
import {
  addMessageGroupMemberAction,
  archiveMessageGroupAction,
  removeMessageGroupMemberAction,
  updateMessageGroupAction,
} from "@/actions/messaging";
import { requireUser } from "@/lib/auth/guards";
import { getParam } from "@/lib/search-params";
import { getMessageGroup } from "@/lib/services/messaging";
import { getContactPickerOptions } from "@/lib/services/contacts";
import { cn } from "@/lib/utils";

export default async function MessageGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, raw] = await Promise.all([params, searchParams]);
  await requireUser();
  const group = await getMessageGroup(id);
  if (!group) notFound();

  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");
  const error = getParam(raw, "error");
  const archived = Boolean(group.archivedAt);

  const memberIds = new Set(group.members.map((member) => member.id));
  const contacts = archived
    ? []
    : (await getContactPickerOptions())
        .filter((contact) => !memberIds.has(contact.id))
        .map((contact) => ({
          id: contact.id,
          name: `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
        }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageError code={error} />
      <PageHeader
        title={group.name}
        description={t("memberCount", { count: group.members.length })}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/messages/groups">
                <ArrowLeft className="size-4" /> {t("backToGroups")}
              </Link>
            </Button>
            {!archived ? (
              <form action={archiveMessageGroupAction.bind(null, group.id)}>
                <ConfirmSubmit
                  message={t("archiveGroupConfirm")}
                  className={cn(buttonVariants({ variant: "outline" }), "text-destructive")}
                >
                  <Archive className="size-4" /> {t("archiveGroup")}
                </ConfirmSubmit>
              </form>
            ) : null}
          </>
        }
      />

      {archived ? (
        <div className="flex items-center gap-2">
          <Badge variant="outline">{t("archivedGroup")}</Badge>
          <span className="text-muted-foreground text-sm">{t("groupReadOnly")}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{t("group")}</CardTitle>
        </CardHeader>
        <CardContent>
          {archived ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{group.name}</p>
              {group.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{group.description}</p>
              ) : null}
            </div>
          ) : (
            <GroupForm
              action={updateMessageGroupAction.bind(null, group.id)}
              initial={{ name: group.name, description: group.description }}
              submitLabel={tCommon("saveChanges")}
              cancelHref="/messages/groups"
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("members")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!archived ? (
            <AddGroupMemberForm
              action={addMessageGroupMemberAction.bind(null, group.id)}
              contacts={contacts}
            />
          ) : null}

          {group.members.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noContactsAvailable")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tCommon("name")}</TableHead>
                  <TableHead>{tCommon("email")}</TableHead>
                  <TableHead>{tCommon("company")}</TableHead>
                  {!archived ? <TableHead>{tCommon("actions")}</TableHead> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {group.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${member.id}`}
                        className="font-medium hover:underline"
                      >
                        {member.firstName} {member.lastName}
                      </Link>
                      {member.archivedAt ? (
                        <Badge variant="outline" className="ml-2">
                          {tCommon("archived")}
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{member.email}</TableCell>
                    <TableCell>{member.companyName ?? "—"}</TableCell>
                    {!archived ? (
                      <TableCell>
                        <form
                          action={removeMessageGroupMemberAction.bind(null, group.id, member.id)}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            <Trash2 className="size-4" /> {tCommon("remove")}
                          </Button>
                        </form>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
