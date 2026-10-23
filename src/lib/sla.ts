import { SLA_HOURS } from "@/lib/constants";
import type { Ticket } from "@/db/schema";

export type SlaState = {
  firstResponseDue: Date;
  resolutionDue: Date;
  firstResponseOverdue: boolean;
  resolutionOverdue: boolean;
  isOverdue: boolean;
  firstResponseMet: boolean | null;
  resolutionMet: boolean | null;
};

export function getTicketSla(ticket: Pick<Ticket, "createdAt" | "firstResponseAt" | "resolvedAt" | "status" | "priority">, now = new Date()): SlaState {
  const policy = SLA_HOURS[ticket.priority];
  const firstResponseDue = new Date(ticket.createdAt.getTime() + policy.firstResponse * 60 * 60 * 1000);
  const resolutionDue = new Date(ticket.createdAt.getTime() + policy.resolution * 60 * 60 * 1000);

  const active = ticket.status !== "resolved" && ticket.status !== "closed";
  const firstResponseOverdue = !ticket.firstResponseAt && active && now > firstResponseDue;
  const resolutionOverdue = !ticket.resolvedAt && active && now > resolutionDue;

  return {
    firstResponseDue,
    resolutionDue,
    firstResponseOverdue,
    resolutionOverdue,
    isOverdue: firstResponseOverdue || resolutionOverdue,
    firstResponseMet: ticket.firstResponseAt ? ticket.firstResponseAt <= firstResponseDue : null,
    resolutionMet: ticket.resolvedAt ? ticket.resolvedAt <= resolutionDue : null,
  };
}

export function getFirstResponseDue(ticket: Pick<Ticket, "createdAt" | "priority">) {
  const policy = SLA_HOURS[ticket.priority];
  return new Date(ticket.createdAt.getTime() + policy.firstResponse * 60 * 60 * 1000);
}

export function getResolutionDue(ticket: Pick<Ticket, "createdAt" | "priority">) {
  const policy = SLA_HOURS[ticket.priority];
  return new Date(ticket.createdAt.getTime() + policy.resolution * 60 * 60 * 1000);
}
