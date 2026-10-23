import { describe, expect, it } from "vitest";
import { campaignMetrics, dealMetrics } from "@/lib/metrics";
import { sortByOccurredAtDesc } from "@/lib/timeline-sort";

describe("metric calculations", () => {
  it("calculates open deal value and weighted value", () => {
    const metrics = dealMetrics([
      { amount: "10000", probability: 50, outcome: "open" },
      { amount: "5000", probability: 20, outcome: "open" },
      { amount: "9000", probability: 100, outcome: "won" },
    ]);
    expect(metrics.count).toBe(2);
    expect(metrics.totalValue).toBe(15000);
    expect(metrics.weightedValue).toBe(6000);
  });

  it("calculates campaign response and conversion rates", () => {
    const metrics = campaignMetrics([
      { recipient: { status: "targeted" } },
      { recipient: { status: "sent" } },
      { recipient: { status: "responded" } },
      { recipient: { status: "converted" } },
      { recipient: { status: "converted" } },
    ]);
    expect(metrics.audience).toBe(5);
    expect(metrics.counts.responded).toBe(1);
    expect(metrics.counts.converted).toBe(2);
    expect(metrics.responseRate).toBeCloseTo(60);
    expect(metrics.conversionRate).toBeCloseTo(40);
  });

  it("returns zero rates for an empty campaign", () => {
    const metrics = campaignMetrics([]);
    expect(metrics.audience).toBe(0);
    expect(metrics.responseRate).toBe(0);
    expect(metrics.conversionRate).toBe(0);
  });

  it("sorts timeline items newest first without mutating the source", () => {
    const items = [
      { id: "old", occurredAt: new Date("2026-10-01T00:00:00Z") },
      { id: "new", occurredAt: new Date("2026-10-03T00:00:00Z") },
      { id: "middle", occurredAt: new Date("2026-10-02T00:00:00Z") },
    ];
    expect(sortByOccurredAtDesc(items).map((item) => item.id)).toEqual(["new", "middle", "old"]);
    expect(items[0].id).toBe("old");
  });
});
