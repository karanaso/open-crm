import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocalTime } from "@/components/ui/local-time";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DeliveryStatusBadge,
  MessageStatusBadge,
  OutcomeReasonBadge,
} from "@/components/messaging/badges";
import { MessageForm } from "@/components/messaging/message-form";
import { MessageRunActions } from "@/components/messaging/message-run-actions";
import { SendMessagePanel } from "@/components/messaging/send-message-panel";
import {
  cancelMessageAction,
  retryMessageAction,
  sendMessageAction,
  updateMessageAction,
} from "@/actions/messaging";
import { requireUser } from "@/lib/auth/guards";
import {
  getMaxRecipients,
  isFakeTransport,
  isMessagingConfigured,
} from "@/lib/messaging/transport";
import {
  getMessage,
  getMessageGroup,
  getMessageGroupOptions,
  previewMessageAudience,
} from "@/lib/services/messaging";
import { getSegment, getSegmentOptions } from "@/lib/services/marketing";

export default async function MessageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireUser();
  const message = await getMessage(id);
  if (!message) notFound();

  const t = await getTranslations("messaging");
  const tCommon = await getTranslations("common");
  const tEnums = await getTranslations("enums");
  const configured = isFakeTransport() || isMessagingConfigured();
  const cap = getMaxRecipients();

  if (message.status === "draft") {
    const [preview, groups, segments] = await Promise.all([
      previewMessageAudience(message.id),
      getMessageGroupOptions(),
      getSegmentOptions(),
    ]);

    if (message.groupId && !groups.some((group) => group.id === message.groupId)) {
      const current = await getMessageGroup(message.groupId);
      if (current) groups.unshift({ ...current, memberCount: current.members.length });
    }
    if (message.segmentId && !segments.some((segment) => segment.id === message.segmentId)) {
      const current = await getSegment(message.segmentId);
      if (current) segments.unshift(current);
    }

    return (
      <div className="space-y-6">
        <PageHeader
          title={message.subject}
          description={message.audienceName || t("selectAudience")}
          actions={
            <Button variant="outline" asChild>
              <Link href="/messages">
                <ArrowLeft className="size-4" /> {t("backToMessages")}
              </Link>
            </Button>
          }
        />
        <div className="flex items-center gap-2">
          <MessageStatusBadge status={message.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card>
            <CardContent className="pt-5">
              <MessageForm
                action={updateMessageAction.bind(null, message.id)}
                groups={groups.map((group) => ({
                  id: group.id,
                  name: group.name,
                  count: group.memberCount,
                  archived: Boolean(group.archivedAt),
                }))}
                segments={segments.map((segment) => ({
                  id: segment.id,
                  name: segment.name,
                  count: segment.audienceCount,
                  archived: Boolean(segment.archivedAt),
                }))}
                initial={{
                  subject: message.subject,
                  body: message.body,
                  groupId: message.groupId,
                  segmentId: message.segmentId,
                }}
                submitLabel={tCommon("saveChanges")}
                cancelHref="/messages"
              />
            </CardContent>
          </Card>

          <SendMessagePanel
            messageId={message.id}
            action={sendMessageAction.bind(null, message.id)}
            preview={preview}
            cap={cap}
            configured={configured}
          />
        </div>
      </div>
    );
  }

  const canRetry =
    (message.status === "sending" || message.status === "completed") &&
    message.counts.queued + message.counts.failed > 0;
  const canCancel = message.status === "sending";

  return (
    <div className="space-y-6">
      <PageHeader
        title={message.subject}
        description={message.audienceName || t("audience")}
        actions={
          <Button variant="outline" asChild>
            <Link href="/messages">
              <ArrowLeft className="size-4" /> {t("backToMessages")}
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <MessageStatusBadge status={message.status} />
      </div>

      <Card>
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-muted-foreground text-xs">{t("audience")}</p>
            <p className="font-medium">{message.audienceName || "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{tCommon("created")}</p>
            <p className="font-medium">
              <LocalTime value={message.createdAt} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("sentAt")}</p>
            <p className="font-medium">
              <LocalTime value={message.sentAt} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("completedAt")}</p>
            <p className="font-medium">
              <LocalTime value={message.completedAt} />
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{t("recipients")}</p>
            <p className="font-medium">{message.counts.total}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{tEnums("deliveryStatus.sent")}</p>
            <p className="font-medium">{message.counts.sent}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{tEnums("deliveryStatus.failed")}</p>
            <p className="font-medium">{message.counts.failed}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">{tEnums("deliveryStatus.skipped")}</p>
            <p className="font-medium">{message.counts.skipped}</p>
          </div>
        </CardContent>
      </Card>

      {message.status === "sending" ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {t("statusSendingHint")}
        </p>
      ) : message.status === "completed" ? (
        <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          {t("statusCompletedHint")}
        </p>
      ) : null}

      <MessageRunActions
        action={retryMessageAction.bind(null, message.id)}
        cancelAction={cancelMessageAction.bind(null, message.id)}
        canRetry={canRetry}
        canCancel={canCancel}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("recipients")}</CardTitle>
        </CardHeader>
        <CardContent>
          {message.recipients.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("noRecipientsYet")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("recipient")}</TableHead>
                  <TableHead>{tCommon("email")}</TableHead>
                  <TableHead>{t("outcome")}</TableHead>
                  <TableHead>{tCommon("reason")}</TableHead>
                  <TableHead>{t("attemptedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {message.recipients.map((row) => (
                  <TableRow key={row.recipient.id}>
                    <TableCell>
                      <Link
                        href={`/contacts/${row.recipient.contactId}`}
                        className="font-medium hover:underline"
                      >
                        {row.firstName} {row.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {row.recipient.address}
                    </TableCell>
                    <TableCell>
                      <DeliveryStatusBadge status={row.recipient.status} />
                    </TableCell>
                    <TableCell>
                      <OutcomeReasonBadge reason={row.recipient.reason} />
                    </TableCell>
                    <TableCell>
                      <LocalTime value={row.recipient.attemptedAt} />
                    </TableCell>
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
