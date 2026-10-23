"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { moveDealAction } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMessageTranslator } from "@/i18n/messages";

export function DealStageControl({
  dealId,
  currentStageId,
  stages,
  expectedUpdatedAt,
}: {
  dealId: string;
  currentStageId: string;
  stages: Array<{ id: string; name: string; outcome: "open" | "won" | "lost" }>;
  expectedUpdatedAt: string;
}) {
  const [stageId, setStageId] = useState(currentStageId);
  const [lostReason, setLostReason] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const translate = useMessageTranslator();
  const t = useTranslations("sales");
  const tCommon = useTranslations("common");
  const selected = stages.find((stage) => stage.id === stageId);

  function submit() {
    if (selected?.outcome === "lost" && !lostReason.trim()) {
      toast.error(translate("sales.lostReasonRequired"));
      return;
    }

    startTransition(async () => {
      const result = await moveDealAction({
        dealId,
        stageId,
        lostReason: lostReason.trim() || undefined,
        expectedUpdatedAt,
      });
      if (result?.error) {
        toast.error(translate(result.error));
        router.refresh();
        return;
      }
      toast.success(translate("sales.stageUpdated"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="deal-stage">{t("moveToStage")}</Label>
        <select
          id="deal-stage"
          value={stageId}
          onChange={(event) => setStageId(event.target.value)}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>
      {selected?.outcome === "lost" ? (
        <div className="space-y-1">
          <Label htmlFor="deal-lost-reason">{t("lostReason")}</Label>
          <Input
            id="deal-lost-reason"
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder={t("lostReasonPrompt")}
          />
        </div>
      ) : null}
      <Button onClick={submit} disabled={pending || stageId === currentStageId} className="w-full">
        {pending ? tCommon("updating") : t("updateStage")}
      </Button>
    </div>
  );
}
