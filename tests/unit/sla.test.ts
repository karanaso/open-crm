import { describe, expect, it } from "vitest";
import { getTicketSla } from "@/lib/sla";

const base = new Date("2026-10-20T12:00:00Z");

describe("ticket SLA calculation", () => {
  it("uses priority-specific targets", () => {
    const sla = getTicketSla({
      createdAt: base,
      priority: "urgent",
      status: "open",
      firstResponseAt: null,
      resolvedAt: null,
    }, base);
    expect(sla.firstResponseDue.toISOString()).toBe("2026-10-20T13:00:00.000Z");
    expect(sla.resolutionDue.toISOString()).toBe("2026-10-20T20:00:00.000Z");
  });

  it("marks an unanswered urgent ticket overdue after one hour", () => {
    const sla = getTicketSla(
      {
        createdAt: base,
        priority: "urgent",
        status: "in_progress",
        firstResponseAt: null,
        resolvedAt: null,
      },
      new Date("2026-10-20T13:30:00Z"),
    );
    expect(sla.firstResponseOverdue).toBe(true);
    expect(sla.isOverdue).toBe(true);
  });

  it("records a met first response", () => {
    const sla = getTicketSla(
      {
        createdAt: base,
        priority: "high",
        status: "in_progress",
        firstResponseAt: new Date("2026-10-20T15:00:00Z"),
        resolvedAt: null,
      },
      new Date("2026-10-20T16:00:00Z"),
    );
    expect(sla.firstResponseMet).toBe(true);
    expect(sla.firstResponseOverdue).toBe(false);
  });

  it("records a breached resolution", () => {
    const sla = getTicketSla({
      createdAt: base,
      priority: "normal",
      status: "resolved",
      firstResponseAt: new Date("2026-10-20T13:00:00Z"),
      resolvedAt: new Date("2026-10-23T13:00:00Z"),
    });
    expect(sla.resolutionMet).toBe(false);
  });

  it("stops resolution tracking once resolved", () => {
    const sla = getTicketSla(
      {
        createdAt: base,
        priority: "low",
        status: "resolved",
        firstResponseAt: new Date("2026-10-20T13:00:00Z"),
        resolvedAt: new Date("2026-10-21T12:00:00Z"),
      },
      new Date("2026-10-30T12:00:00Z"),
    );
    expect(sla.resolutionOverdue).toBe(false);
    expect(sla.resolutionMet).toBe(true);
  });
});
