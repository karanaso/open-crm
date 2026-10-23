import type { Ticket } from "@/db/schema";

export const TICKET_TRANSITIONS: Record<Ticket["status"], Ticket["status"][]> = {
  open: ["in_progress", "pending", "resolved", "closed"],
  in_progress: ["pending", "in_progress", "resolved", "closed"],
  pending: ["in_progress", "pending", "resolved", "closed"],
  resolved: ["open", "closed"],
  closed: ["open"],
};

export function canTransitionTicket(from: Ticket["status"], to: Ticket["status"]) {
  if (from === to) return true;
  return TICKET_TRANSITIONS[from].includes(to);
}
