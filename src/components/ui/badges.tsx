import { Badge } from "@/components/ui/badge";
import { cn, titleCase } from "@/lib/utils";
import type { CampaignRecipient, Campaign, Deal, Task, Ticket, TicketComment } from "@/db/schema";

const dealStatusVariant = {
  open: "info",
  won: "success",
  lost: "destructive",
} as const;

const ticketStatusVariant = {
  open: "info",
  in_progress: "default",
  pending: "warning",
  resolved: "success",
  closed: "secondary",
} as const;

const priorityVariant = {
  urgent: "destructive",
  high: "warning",
  normal: "info",
  low: "secondary",
} as const;

const campaignStatusVariant = {
  draft: "secondary",
  active: "success",
  completed: "info",
  archived: "outline",
} as const;

export function DealStatusBadge({ status }: { status: Deal["status"] }) {
  return <Badge variant={dealStatusVariant[status]}>{titleCase(status)}</Badge>;
}

export function TicketStatusBadge({ status }: { status: Ticket["status"] }) {
  return <Badge variant={ticketStatusVariant[status]}>{titleCase(status)}</Badge>;
}

export function PriorityBadge({ priority }: { priority: Ticket["priority"] | Task["priority"] }) {
  return <Badge variant={priorityVariant[priority as keyof typeof priorityVariant]}>{titleCase(priority)}</Badge>;
}

export function CampaignStatusBadge({ status }: { status: Campaign["status"] }) {
  return <Badge variant={campaignStatusVariant[status]}>{titleCase(status)}</Badge>;
}

export function RecipientStatusBadge({ status }: { status: CampaignRecipient["status"] }) {
  const variant =
    status === "converted"
      ? "success"
      : status === "responded"
        ? "info"
        : status === "clicked" || status === "opened"
          ? "warning"
          : status === "sent"
            ? "default"
            : "secondary";
  return <Badge variant={variant}>{titleCase(status)}</Badge>;
}

export function CommentVisibilityBadge({ visibility }: { visibility: TicketComment["visibility"] }) {
  return (
    <Badge variant={visibility === "internal" ? "warning" : "outline"}>
      {visibility === "internal" ? "Internal note" : "Reply"}
    </Badge>
  );
}

export function TagList({ tags, className }: { tags: string[]; className?: string }) {
  if (tags.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {tags.map((tag) => (
        <Badge key={tag} variant="outline" className="text-muted-foreground">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
