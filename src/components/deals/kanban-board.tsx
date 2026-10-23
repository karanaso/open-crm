"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { moveDealAction } from "@/actions/deals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, titleCase } from "@/lib/utils";
import { DateDisplay } from "@/components/ui/local-time";

type StageOption = {
  id: string;
  name: string;
  outcome: "open" | "won" | "lost";
  probability: number;
  position: number;
};

type BoardDeal = {
  id: string;
  name: string;
  companyName: string;
  amount: string;
  ownerName: string;
  expectedCloseDate: string | null;
  stageId: string;
  status: "open" | "won" | "lost";
  updatedAt: string;
};

function DealCard({
  deal,
  stages,
  onMove,
  dragging,
}: {
  deal: BoardDeal;
  stages: StageOption[];
  onMove: (deal: BoardDeal, stage: StageOption) => void;
  dragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: deal.id });
  const style = { transform: CSS.Translate.toString(transform) };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border bg-card p-3 shadow-sm ${isDragging || dragging ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/deals/${deal.id}`}
          className="text-sm font-medium hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {deal.name}
        </Link>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7" aria-label={`Move ${deal.name}`}>
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Move to stage</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {stages
                .filter((stage) => stage.id !== deal.stageId)
                .map((stage) => (
                  <DropdownMenuItem key={stage.id} onSelect={() => onMove(deal, stage)}>
                    {stage.name}
                  </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            type="button"
            className="cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
            aria-label={`Drag ${deal.name}`}
            {...listeners}
            {...attributes}
          >
            <GripVertical className="size-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{deal.companyName}</p>
      <p className="mt-2 text-sm font-semibold">{formatCurrency(deal.amount)}</p>
      <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
        <span>{deal.ownerName}</span>
        {deal.expectedCloseDate ? <DateDisplay value={deal.expectedCloseDate} /> : <span>No close date</span>}
      </div>
      <Badge variant={deal.status === "won" ? "success" : deal.status === "lost" ? "destructive" : "outline"} className="mt-2">
        {titleCase(deal.status)}
      </Badge>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  stages,
  onMove,
}: {
  stage: StageOption;
  deals: BoardDeal[];
  stages: StageOption[];
  onMove: (deal: BoardDeal, stage: StageOption) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = deals.reduce((sum, deal) => sum + Number(deal.amount), 0);

  return (
    <div className="flex w-72 shrink-0 flex-col gap-3">
      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2">
        <div>
          <p className="text-sm font-medium">{stage.name}</p>
          <p className="text-xs text-muted-foreground">
            {deals.length} deals · {formatCurrency(total)}
          </p>
        </div>
        <Badge variant="outline">{stage.probability}%</Badge>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-40 flex-col gap-2 rounded-lg border border-dashed p-2 transition-colors ${
          isOver ? "border-primary bg-primary/5" : "bg-muted/10"
        }`}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} stages={stages} onMove={onMove} />
        ))}
        {deals.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">Drop a deal here</p>
        ) : null}
      </div>
    </div>
  );
}

export function KanbanBoard({
  pipeline,
  stages,
  initialDeals,
}: {
  pipeline: { id: string; name: string };
  stages: StageOption[];
  initialDeals: BoardDeal[];
}) {
  const [deals, setDeals] = useState(initialDeals);
  const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function move(deal: BoardDeal, stage: StageOption, reason?: string) {
    const previous = deals;
    setDeals((current) =>
      current.map((item) =>
        item.id === deal.id
          ? { ...item, stageId: stage.id, status: stage.outcome, updatedAt: new Date().toISOString() }
          : item,
      ),
    );

    const result = await moveDealAction({
      dealId: deal.id,
      stageId: stage.id,
      lostReason: reason,
      expectedUpdatedAt: deal.updatedAt,
    });

    if (result?.error) {
      setDeals(previous);
      toast.error(result.error);
      router.refresh();
      return;
    }

    toast.success(`Moved to ${stage.name}`);
    router.refresh();
  }

  function handleMove(deal: BoardDeal, stage: StageOption) {
    if (stage.outcome === "lost") {
      const reason = window.prompt("Why was this deal lost?");
      if (!reason || !reason.trim()) return;
      void move(deal, stage, reason.trim());
      return;
    }
    void move(deal, stage);
  }

  function onDragStart(event: DragStartEvent) {
    const deal = deals.find((item) => item.id === event.active.id);
    setActiveDeal(deal ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveDeal(null);
    if (!event.over) return;
    const deal = deals.find((item) => item.id === event.active.id);
    const stage = stages.find((item) => item.id === event.over?.id);
    if (!deal || !stage || deal.stageId === stage.id) return;
    handleMove(deal, stage);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-3" aria-label={`${pipeline.name} pipeline board`}>
        {stages.map((stage) => (
          <StageColumn
            key={stage.id}
            stage={stage}
            stages={stages}
            deals={deals.filter((deal) => deal.stageId === stage.id)}
            onMove={handleMove}
          />
        ))}
      </div>
      <DragOverlay>
        {activeDeal ? (
          <div className="w-64 rotate-2 rounded-lg border bg-card p-3 shadow-lg">
            <p className="text-sm font-medium">{activeDeal.name}</p>
            <p className="text-xs text-muted-foreground">{activeDeal.companyName}</p>
            <p className="mt-1 text-sm font-semibold">{formatCurrency(activeDeal.amount)}</p>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
