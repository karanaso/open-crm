import type { Route } from "next";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { campaigns, companies, contacts, deals, listings, tickets } from "@/db/schema";

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  amount?: string;
  currency?: string;
  href: Route;
};

export type GlobalSearchResults = {
  companies: SearchResult[];
  contacts: SearchResult[];
  deals: SearchResult[];
  listings: SearchResult[];
  tickets: SearchResult[];
  campaigns: SearchResult[];
};

const emptyResults: GlobalSearchResults = {
  companies: [],
  contacts: [],
  deals: [],
  listings: [],
  tickets: [],
  campaigns: [],
};

export async function globalSearch(term: string): Promise<GlobalSearchResults> {
  const query = term.trim();
  if (query.length < 2) return emptyResults;
  const pattern = `%${query}%`;

  const [companyRows, contactRows, dealRows, listingRows, ticketRows, campaignRows] =
    await Promise.all([
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
          currency: deals.currency,
          contactFirstName: contacts.firstName,
          contactLastName: contacts.lastName,
          companyName: companies.name,
        })
        .from(deals)
        .innerJoin(contacts, eq(deals.contactId, contacts.id))
        .leftJoin(companies, eq(deals.companyId, companies.id))
        .where(
          or(
            ilike(deals.name, pattern),
            ilike(contacts.firstName, pattern),
            ilike(contacts.lastName, pattern),
            sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${pattern}`,
            ilike(companies.name, pattern),
          ),
        )
        .orderBy(desc(deals.updatedAt))
        .limit(5),
      db
        .select({
          id: listings.id,
          reference: listings.reference,
          title: listings.title,
          addressLine1: listings.addressLine1,
          city: listings.city,
          status: listings.status,
        })
        .from(listings)
        .innerJoin(contacts, eq(listings.sellerContactId, contacts.id))
        .where(
          and(
            eq(listings.status, "active"),
            or(
              ilike(listings.reference, pattern),
              ilike(listings.title, pattern),
              ilike(listings.addressLine1, pattern),
              ilike(listings.city, pattern),
              ilike(contacts.firstName, pattern),
              ilike(contacts.lastName, pattern),
              sql`(${contacts.firstName} || ' ' || ${contacts.lastName}) ilike ${pattern}`,
            ),
          ),
        )
        .orderBy(desc(listings.updatedAt))
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
      subtitle: row.domain ?? "",
      href: `/companies/${row.id}` as Route,
    })),
    contacts: contactRows.map((row) => ({
      id: row.id,
      title: `${row.firstName} ${row.lastName}`,
      subtitle: [row.email, row.companyName].filter(Boolean).join(" · "),
      href: `/contacts/${row.id}` as Route,
    })),
    deals: dealRows.map((row) => {
      const contactName = `${row.contactFirstName} ${row.contactLastName}`.trim();
      return {
        id: row.id,
        title: row.name,
        subtitle: [contactName, row.companyName].filter(Boolean).join(" · "),
        amount: String(row.amount),
        currency: row.currency,
        href: `/deals/${row.id}` as Route,
      };
    }),
    listings: listingRows.map((row) => ({
      id: row.id,
      title: row.title,
      subtitle: [row.reference, row.addressLine1 ?? row.city].filter(Boolean).join(" · "),
      status: row.status,
      href: `/listings/${row.id}` as Route,
    })),
    tickets: ticketRows.map((row) => ({
      id: row.id,
      title: row.subject,
      subtitle: `${row.requesterFirst} ${row.requesterLast}`,
      status: row.status,
      href: `/tickets/${row.id}` as Route,
    })),
    campaigns: campaignRows.map((row) => ({
      id: row.id,
      title: row.name,
      subtitle: "",
      status: row.status,
      href: `/campaigns/${row.id}` as Route,
    })),
  };
}

export async function countSearchResults(results: GlobalSearchResults) {
  return Object.values(results).reduce((total, group) => total + group.length, 0);
}

export const searchSql = sql;
