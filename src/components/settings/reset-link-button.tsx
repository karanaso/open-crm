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

export function ResetLinkButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
              toast.error(result.error ?? "Could not create a reset link.");
            }
          })
        }
      >
        <KeyRound className="size-3.5" /> Reset link
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password reset link for {name}</DialogTitle>
            <DialogDescription>
              Share this link securely. It expires in 24 hours and can be used once.
            </DialogDescription>
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
                toast.success("Reset link copied.");
              }}
            >
              <Copy className="size-3.5" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
