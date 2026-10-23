import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import en from "../../messages/en.json";
import { DashboardCharts } from "@/components/dashboard/dashboard-charts";
import { GlobalSearchDialog } from "@/components/search/global-search-dialog";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderWithCatalog(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={en}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("dashboard currency charts", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders separate EUR and USD rows without summing currencies", () => {
    renderWithCatalog(
      <DashboardCharts
        pipeline={[
          { stage: "Lead", currency: "EUR", value: 1000 },
          { stage: "Lead", currency: "USD", value: 2000 },
          { stage: "Proposal", currency: "EUR", value: 500 },
        ]}
        tickets={[]}
        campaigns={[]}
      />,
    );

    const table = screen.getByRole("table", { name: "Open deal value by stage" });
    expect(within(table).getAllByText("EUR")).toHaveLength(2);
    expect(within(table).getAllByText("USD")).toHaveLength(2);
    expect(within(table).getByText("€1,000.00")).toBeInTheDocument();
    expect(within(table).getByText("$2,000.00")).toBeInTheDocument();
    expect(within(table).getByText("€500.00")).toBeInTheDocument();

    // Only the per-stage, per-currency values are rendered. No cross-currency
    // total row is produced.
    expect(within(table).queryByText("€1,500.00")).not.toBeInTheDocument();
    expect(within(table).queryByText("€3,000.00")).not.toBeInTheDocument();
    expect(within(table).queryByText("$3,000.00")).not.toBeInTheDocument();
    expect(within(table).queryByText("$4,500.00")).not.toBeInTheDocument();

    const rows = within(table).getAllByRole("row").slice(1);
    for (const row of rows) {
      const cells = within(row).getAllByRole("cell");
      const currency = cells[1]?.textContent;
      const amount = cells[2]?.textContent ?? "";
      expect(["EUR", "USD"]).toContain(currency);
      expect(amount).toContain(currency === "EUR" ? "€" : "$");
      expect(amount).not.toContain(currency === "EUR" ? "$" : "€");
    }
  });

  it("shows the empty chart state without pipeline rows", () => {
    renderWithCatalog(
      <DashboardCharts pipeline={[]} tickets={[]} campaigns={[]} />,
    );

    expect(screen.queryByRole("table", { name: "Open deal value by stage" })).not.toBeInTheDocument();
    expect(screen.getByText("No pipeline data yet.")).toBeInTheDocument();
  });
});

describe("global search listings", () => {
  const listingsResponse = {
    companies: [],
    contacts: [],
    deals: [
      {
        id: "deal-1",
        title: "E2E Deal",
        subtitle: "Iris Individual",
        amount: "1500.00",
        currency: "USD",
        status: "open",
        href: "/deals/deal-1",
      },
    ],
    listings: [
      {
        id: "listing-1",
        title: "E2E Sea View Apartment",
        subtitle: "RE-1001 · Athens",
        status: "active",
        amount: "350000",
        currency: "EUR",
        href: "/listings/listing-1",
      },
    ],
    tickets: [],
    campaigns: [],
  };

  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverMock);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => listingsResponse,
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the listings group, its status, and the record currency", async () => {
    const onSelect = vi.fn();
    renderWithCatalog(
      <GlobalSearchDialog open onOpenChange={vi.fn()} onSelect={onSelect} />,
    );

    const input = screen.getByPlaceholderText(en.common.searchDialogPlaceholder);
    fireEvent.change(input, { target: { value: "RE-1001" } });

    expect(await screen.findByText("Listings", { exact: true })).toBeInTheDocument();
    expect(await screen.findByText("E2E Sea View Apartment", {}, { timeout: 3000 })).toBeInTheDocument();
    expect(
      screen.getByText("RE-1001 · Athens · €350,000.00 · Active"),
    ).toBeInTheDocument();
  });

  it("keeps short queries empty and does not call the API", () => {
    renderWithCatalog(
      <GlobalSearchDialog open onOpenChange={vi.fn()} onSelect={vi.fn()} />,
    );

    const input = screen.getByPlaceholderText(en.common.searchDialogPlaceholder);
    fireEvent.change(input, { target: { value: "R" } });

    expect(screen.getByText(en.common.searchMinChars)).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
