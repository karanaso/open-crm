"use client";

import { Badge } from "@/components/ui/badge";
import { useListingsTranslator } from "@/components/listings/use-listings-translator";

export function ListingStatusBadge({ status }: { status: "active" | "inactive" }) {
  const t = useListingsTranslator();
  return (
    <Badge variant={status === "active" ? "success" : "outline"}>
      {t(`enums.status.${status}`)}
    </Badge>
  );
}

export function ListingTransactionBadge({ transaction }: { transaction: "sale" | "rent" }) {
  const t = useListingsTranslator();
  return (
    <Badge variant={transaction === "sale" ? "info" : "secondary"}>
      {t(`enums.transaction.${transaction}`)}
    </Badge>
  );
}

export function ViewingStatusBadge({
  status,
}: {
  status: "scheduled" | "completed" | "cancelled" | "no_show";
}) {
  const t = useListingsTranslator();
  const variant =
    status === "completed"
      ? "success"
      : status === "cancelled"
        ? "destructive"
        : status === "no_show"
          ? "warning"
          : "info";
  return <Badge variant={variant}>{t(`enums.viewingStatus.${status}`)}</Badge>;
}