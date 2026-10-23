"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { createResetLinkAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useMessageTranslator } from "@/i18n/messages";

export function ResetLinkButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const translate = useMessageTranslator();

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await createResetLinkAction(userId);
            if (result.resetUrl) {
              setUrl(result.resetUrl);
              setOpen(true);
            } else {
              toast.error(
                result.error ? translate(result.error) : translate("settings.resetLinkFailed"),
              );
            }
          })
        }
      >
        <KeyRound className="size-3.5" /> {translate("settings.resetLink")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {translate({ key: "settings.resetLinkTitle", params: { name } })}
            </DialogTitle>
            <DialogDescription>{translate("settings.resetLinkDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <Input readOnly value={url ?? ""} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!url) return;
                await navigator.clipboard.writeText(url);
                toast.success(translate("settings.resetLinkCopied"));
              }}
            >
              <Copy className="size-3.5" /> {translate("common.copy")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
