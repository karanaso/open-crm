"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { enumLabelKey } from "@/i18n/labels";
import type { Message, MessageRecipient } from "@/db/schema";

const messageStatusVariant = {
  draft: "secondary",
  sending: "warning",
  completed: "success",
  cancelled: "outline",
} as const;

const deliveryStatusVariant = {
  queued: "secondary",
  sent: "success",
  failed: "destructive",
  skipped: "outline",
} as const;

export function MessageStatusBadge({ status }: { status: Message["status"] }) {
  const t = useTranslations();
  return (
    <Badge variant={messageStatusVariant[status]}>
      {t(enumLabelKey("messageStatus", status))}
    </Badge>
  );
}

export function DeliveryStatusBadge({ status }: { status: MessageRecipient["status"] }) {
  const t = useTranslations();
  return (
    <Badge variant={deliveryStatusVariant[status]}>
      {t(enumLabelKey("deliveryStatus", status))}
    </Badge>
  );
}

export function OutcomeReasonBadge({ reason }: { reason: MessageRecipient["reason"] }) {
  const t = useTranslations();
  if (!reason) return null;
  return (
    <Badge variant="outline" className="text-muted-foreground">
      {t(enumLabelKey("outcomeReason", reason))}
    </Badge>
  );
}
