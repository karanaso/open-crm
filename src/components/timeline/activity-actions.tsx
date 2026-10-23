"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { ActivityForm } from "@/components/timeline/activity-form";
import { ConfirmSubmit } from "@/components/ui/confirm-submit";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteActivityAction } from "@/actions/engagement";
import { cn } from "@/lib/utils";
import type { Activity } from "@/db/schema";

export function ActivityActions({
  activity,
  links,
  returnTo,
  canEdit,
  canDelete,
}: {
  activity: Pick<Activity, "id" | "type" | "subject" | "body" | "occurredAt" | "companyId" | "contactId" | "dealId" | "ticketId" | "campaignId">;
  links: Partial<Record<"companyId" | "contactId" | "dealId" | "ticketId" | "campaignId", string | null>>;
  returnTo: string;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("timeline");
  const tCommon = useTranslations("common");

  return (
    <div className="flex items-center gap-1">
      {canEdit ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Pencil className="size-3.5" /> {tCommon("edit")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("editActivity")}</DialogTitle>
              <DialogDescription>{t("editActivityDescription")}</DialogDescription>
            </DialogHeader>
            <ActivityForm
              links={links}
              returnTo={returnTo}
              initial={{
                id: activity.id,
                type: activity.type as "note" | "call" | "email" | "meeting",
                subject: activity.subject,
                body: activity.body,
                occurredAt: activity.occurredAt,
                ...links,
              }}
              onCancel={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>
      ) : null}
      {canDelete ? (
        <form action={deleteActivityAction.bind(null, activity.id, returnTo)}>
          <ConfirmSubmit
            message={t("deleteActivityConfirm")}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "text-destructive")}
          >
            <Trash2 className="size-3.5" /> {tCommon("delete")}
          </ConfirmSubmit>
        </form>
      ) : null}
    </div>
  );
}
