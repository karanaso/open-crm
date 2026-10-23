import { describe, expect, it } from "vitest";
import { canTransitionTicket } from "@/lib/ticket-status";

describe("ticket status transitions", () => {
  it("allows open tickets to move to any status", () => {
    for (const status of ["in_progress", "pending", "resolved", "closed"] as const) {
      expect(canTransitionTicket("open", status)).toBe(true);
    }
  });

  it("allows resolved tickets to reopen or close", () => {
    expect(canTransitionTicket("resolved", "open")).toBe(true);
    expect(canTransitionTicket("resolved", "closed")).toBe(true);
    expect(canTransitionTicket("resolved", "in_progress")).toBe(false);
  });

  it("allows closed tickets only to reopen", () => {
    expect(canTransitionTicket("closed", "open")).toBe(true);
    expect(canTransitionTicket("closed", "in_progress")).toBe(false);
  });

  it("allows work-in-progress transitions", () => {
    expect(canTransitionTicket("in_progress", "pending")).toBe(true);
    expect(canTransitionTicket("pending", "in_progress")).toBe(true);
    expect(canTransitionTicket("pending", "resolved")).toBe(true);
  });
});
