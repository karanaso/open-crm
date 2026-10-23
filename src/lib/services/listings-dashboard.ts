import { and, asc, count, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { listingViewings, listings } from "@/db/schema";
import { addDays, startOfMonthUtc } from "@/lib/dates";

export const LISTING_AGING_DAYS = 90;

export type ListingTransactionCount = {
  transaction: "sale" | "rent";
  count: number;
};

export type ListingsCurrencyTotal = {
  currency: string;
  total: number;
};

export type ListingsDashboard = {
  activeByTransaction: ListingTransactionCount[];
  activeTotal: number;
  newThisMonth: number;
  upcomingViewings: number;
  agingCount: number;
  agingThresholdDays: number;
  askingSaleValue: ListingsCurrencyTotal[];
  monthlyRentRoll: ListingsCurrencyTotal[];
};

function currencyTotals(
  rows: Array<{ currency: string; total: string | null }>,
): ListingsCurrencyTotal[] {
  return rows.map((row) => ({ currency: row.currency, total: Number(row.total ?? 0) }));
}

export async function getListingsDashboard(now = new Date()): Promise<ListingsDashboard> {
  const monthStart = startOfMonthUtc(now);
  const agingCutoff = addDays(now, -LISTING_AGING_DAYS);

  const [
    transactionRows,
    newRow,
    upcomingRow,
    agingRow,
    saleRows,
    rentRows,
  ] = await Promise.all([
    db
      .select({ transaction: listings.transaction, count: count() })
      .from(listings)
      .where(eq(listings.status, "active"))
      .groupBy(listings.transaction),
    db
      .select({ count: count() })
      .from(listings)
      .where(and(eq(listings.status, "active"), gte(listings.listedAt, monthStart))),
    db
      .select({ count: count() })
      .from(listingViewings)
      .where(
        and(
          eq(listingViewings.status, "scheduled"),
          gte(listingViewings.scheduledAt, now),
        ),
      ),
    db
      .select({ count: count() })
      .from(listings)
      .where(and(eq(listings.status, "active"), lt(listings.listedAt, agingCutoff))),
    db
      .select({
        currency: listings.currency,
        total: sql<string>`coalesce(sum(${listings.price}), 0)`,
      })
      .from(listings)
      .where(and(eq(listings.status, "active"), eq(listings.transaction, "sale")))
      .groupBy(listings.currency)
      .orderBy(asc(listings.currency)),
    db
      .select({
        currency: listings.currency,
        total: sql<string>`coalesce(sum(${listings.price}), 0)`,
      })
      .from(listings)
      .where(and(eq(listings.status, "active"), eq(listings.transaction, "rent")))
      .groupBy(listings.currency)
      .orderBy(asc(listings.currency)),
  ]);

  const counts = new Map(transactionRows.map((row) => [row.transaction, Number(row.count)]));
  const saleCount = counts.get("sale") ?? 0;
  const rentCount = counts.get("rent") ?? 0;

  return {
    activeByTransaction: [
      { transaction: "sale", count: saleCount },
      { transaction: "rent", count: rentCount },
    ],
    activeTotal: saleCount + rentCount,
    newThisMonth: Number(newRow[0]?.count ?? 0),
    upcomingViewings: Number(upcomingRow[0]?.count ?? 0),
    agingCount: Number(agingRow[0]?.count ?? 0),
    agingThresholdDays: LISTING_AGING_DAYS,
    askingSaleValue: currencyTotals(saleRows),
    monthlyRentRoll: currencyTotals(rentRows),
  };
}
