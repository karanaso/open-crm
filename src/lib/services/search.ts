import type { Route } from "next";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, companies, contacts, deals, tickets } from "@/db/schema";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  href: Route;
};

export type GlobalSearchResults = {
  companies: SearchResult[];
  contacts: SearchResult[];
  deals: SearchResult[];
  tickets: SearchResult[];
  campaigns: SearchResult[];
};

const emptyResults: GlobalSearchResults = {
  companies: [],
  contacts: [],
  deals: [],
  tickets: [],
  campaigns: [],
};

export async function globalSearch(term: string): Promise<GlobalSearchResults> {
  const query = term.trim();
  if (query.length < 2) return emptyResults;
  const pattern = `%${query}%`;

  const [companyRows, contactRows, dealRows, ticketRows, campaignRows] = await Promise.all([
    db
      .select({ id: companies.id, name: companies.name, domain: companies.domain })
      .from(companies)
      .where(
        and(
          isNull(companies.archivedAt),
          or(ilike(companies.name, pattern), ilike(companies.domain, pattern)),
        ),
      )
      .orderBy(companies.name)
      .limit(5),
    db
      .select({
        id: contacts.id,
        firstName: contacts.firstName,
        lastName: contacts.lastName,
        email: contacts.email,
        companyName: companies.name,
      })
      .from(contacts)
      .leftJoin(companies, eq(contacts.companyId, companies.id))
      .where(
        and(
          isNull(contacts.archivedAt),
          or(
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            ilike(contacts.email, pattern),
          ),
        ),
      )
      .orderBy(contacts.firstName)
      .limit(5),
    db
      .select({
        id: deals.id,
        name: deals.name,
        amount: deals.amount,
        companyName: companies.name,
      })
      .from(deals)
      .innerJoin(companies, eq(deals.companyId, companies.id))
      .where(or(ilike(deals.name, pattern), ilike(companies.name, pattern)))
      .orderBy(desc(deals.updatedAt))
      .limit(5),
    db
      .select({
        id: tickets.id,
        subject: tickets.subject,
        status: tickets.status,
        requesterFirst: contacts.firstName,
        requesterLast: contacts.lastName,
      })
      .from(tickets)
      .innerJoin(contacts, eq(tickets.requesterContactId, contacts.id))
      .where(
        or(
          ilike(tickets.subject, pattern),
          ilike(contacts.firstName, pattern),
          ilike(contacts.lastName, pattern),
          ilike(contacts.email, pattern),
        ),
      )
      .orderBy(desc(tickets.updatedAt))
      .limit(5),
    db
      .select({ id: campaigns.id, name: campaigns.name, status: campaigns.status })
      .from(campaigns)
      .where(ilike(campaigns.name, pattern))
      .orderBy(desc(campaigns.updatedAt))
      .limit(5),
  ]);

  return {
    companies: companyRows.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: row.domain ?? "Company",
      href: `/companies/${row.id}` as Route,
    })),
    contacts: contactRows.map((row) => ({
      id: row.id,
      title: `${row.firstName} ${row.lastName}`,
      subtitle: [row.email, row.companyName].filter(Boolean).join(" · "),
      href: `/contacts/${row.id}` as Route,
    })),
    deals: dealRows.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: `${row.companyName} · $${Number(row.amount).toLocaleString()}`,
      href: `/deals/${row.id}` as Route,
    })),
    tickets: ticketRows.map((row) => ({
      id: row.id,
      title: row.subject,
      subtitle: `${row.requesterFirst} ${row.requesterLast} · ${row.status.replaceAll("_", " ")}`,
      href: `/tickets/${row.id}` as Route,
    })),
    campaigns: campaignRows.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: `Campaign · ${row.status}`,
      href: `/campaigns/${row.id}` as Route,
    })),
  };
}

export async function countSearchResults(results: GlobalSearchResults) {
  return Object.values(results).reduce((total, group) => total + group.length, 0);
}

export const searchSql = sql;
