import type { Route } from "next";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { TimelineList } from "@/components/timeline/timeline-list";
import { Building2 } from "lucide-react";
import en from "../../messages/en.json";

vi.mock("next/navigation", () => ({
  usePathname: () => "/deals",
}));

vi.mock("@/actions/engagement", () => ({
  deleteActivityAction: vi.fn(),
  createActivityAction: vi.fn(),
  updateActivityAction: vi.fn(),
  createTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
  completeTaskAction: vi.fn(),
  reopenTaskAction: vi.fn(),
  deleteTaskAction: vi.fn(),
}));

describe("shared UI", () => {
  it("renders an empty state with an action", () => {
    render(
      <EmptyState
        icon={Building2}
        title="No companies yet"
        description="Add your first company."
        action={<Button>New company</Button>}
      />,
    );
    expect(screen.getByText("No companies yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New company" })).toBeInTheDocument();
  });

  it("marks the active navigation item", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <SidebarNav />
      </NextIntlClientProvider>,
    );
    const dealsLink = screen.getByRole("link", { name: "Deals" });
    expect(dealsLink).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Companies" })).not.toHaveAttribute("aria-current");
  });

  it("renders a stage-change timeline entry", () => {
    render(
      <NextIntlClientProvider locale="en" messages={en}>
        <TimelineList
          items={[
            {
              id: "activity-1",
              kind: "activity",
              type: "stage_change",
              subject: "Stage changed: Qualified → Proposal",
              body: null,
              occurredAt: new Date("2026-10-21T10:00:00Z"),
              authorName: "Alex Morgan",
              authorId: "user-1",
              links: [{ type: "deal", id: "deal-1", label: "Acme deal", href: "/deals/deal-1" as Route }],
              linkIds: { dealId: "deal-1" },
              metadata: { fromStageName: "Qualified", toStageName: "Proposal" },
            },
          ]}
          returnTo="/deals/deal-1"
          page={1}
          pageCount={1}
          currentUser={{ id: "user-1", role: "admin" }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.getByText("Stage changed: Qualified → Proposal")).toBeInTheDocument();
    expect(screen.getByText("Qualified → Proposal")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
  });
});
