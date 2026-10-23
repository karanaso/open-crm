"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { moveDealAction } from "@/actions/deals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const selected = stages.find((stage) => stage.id === stageId);

  function submit() {
    if (selected?.outcome === "lost" && !lostReason.trim()) {
      toast.error("Add a lost reason before moving the deal.");
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
        toast.error(result.error);
        router.refresh();
        return;
      }
      toast.success("Stage updated.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label htmlFor="deal-stage">Move to stage</Label>
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
          <Label htmlFor="deal-lost-reason">Lost reason</Label>
          <Input
            id="deal-lost-reason"
            value={lostReason}
            onChange={(event) => setLostReason(event.target.value)}
            placeholder="Why was this deal lost?"
          />
        </div>
      ) : null}
      <Button onClick={submit} disabled={pending || stageId === currentStageId} className="w-full">
        {pending ? "Updating…" : "Update stage"}
      </Button>
    </div>
  );
}
