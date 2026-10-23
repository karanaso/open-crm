import Papa from "papaparse";
import { isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts } from "@/db/schema";
import { normalizeDomain, normalizeEmail } from "@/lib/auth/normalize";
import { AppError, type MessageDescriptor } from "@/lib/errors";
import { companySchema } from "@/lib/validation/company";
import { contactSchema } from "@/lib/validation/contact";
import { fieldErrorsFromZod, type ImportReport } from "@/lib/action-state";
import { MAX_CSV_ROWS } from "@/lib/constants";

type CsvRow = Record<string, string | undefined>;
export type ImportTarget = "companies" | "contacts";

function importFieldError(
  fieldErrors: Record<string, MessageDescriptor[]>,
): MessageDescriptor {
  const [field, messages] = Object.entries(fieldErrors)[0] ?? [];
  const descriptor = messages?.[0] ?? { key: "validation.invalid" };

  if (descriptor.key === "validation.required") {
    if (field === "name") return { key: "directory.companyNameRequired" };
    if (field === "firstName") return { key: "directory.firstNameRequired" };
    if (field === "lastName") return { key: "directory.lastNameRequired" };
    if (field === "email") return { key: "directory.emailRequired" };
  }
  if (field === "email" && descriptor.key === "validation.email") {
    return { key: "directory.emailInvalid" };
  }

  return descriptor;
}

function mapped(row: CsvRow, mapping: Record<string, string>, field: string) {
  const header = mapping[field];
  if (!header) return undefined;
  return row[header]?.trim() || undefined;
}

function parse(text: string) {
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  const fatalErrors = parsed.errors.filter((error) => error.code !== "UndetectableDelimiter");
  if (fatalErrors.length > 0) {
    throw new AppError(
      `The CSV could not be parsed: ${fatalErrors[0]?.message ?? "unknown format"}`,
      "CSV_PARSE_ERROR",
    );
  }
  if (parsed.data.length > MAX_CSV_ROWS) {
    throw new AppError(
      `The file contains more than ${MAX_CSV_ROWS.toLocaleString()} data rows.`,
      "CSV_TOO_MANY_ROWS",
    );
  }
  return parsed.data;
}

export async function importCsv(input: {
  text: string;
  target: ImportTarget;
  mapping: Record<string, string>;
  actorId: string;
}): Promise<ImportReport> {
  const rows = parse(input.text);
  const errors: Array<{ row: number; message: MessageDescriptor }> = [];
  let duplicates = 0;

  if (input.target === "companies") {
    if (!input.mapping.name) {
      throw new AppError("Map a column to the company name before importing.", "CSV_MAPPING");
    }

    const existingDomains = new Set(
      (
        await db
          .select({ domain: companies.domain })
          .from(companies)
          .where(isNotNull(companies.domain))
      )
        .map((row) => row.domain)
        .filter(Boolean),
    );
    const seenDomains = new Set<string>();
    const values: Array<typeof companies.$inferInsert> = [];

    for (const [index, row] of rows.entries()) {
      const rowNumber = index + 2;
      const result = companySchema.safeParse({
        name: mapped(row, input.mapping, "name") ?? "",
        domain: mapped(row, input.mapping, "domain"),
        industry: mapped(row, input.mapping, "industry"),
        employeeCount: mapped(row, input.mapping, "employeeCount"),
        phone: mapped(row, input.mapping, "phone"),
        website: mapped(row, input.mapping, "website"),
        city: mapped(row, input.mapping, "city"),
        region: mapped(row, input.mapping, "region"),
        postalCode: mapped(row, input.mapping, "postalCode"),
        country: mapped(row, input.mapping, "country"),
        description: mapped(row, input.mapping, "description"),
        ownerId: input.actorId,
        tags: [],
      });
      if (!result.success) {
        const fieldErrors = fieldErrorsFromZod(result.error);
        errors.push({
          row: rowNumber,
          message: importFieldError(fieldErrors),
        });
        continue;
      }
      if (result.data.domain) {
        if (existingDomains.has(result.data.domain) || seenDomains.has(result.data.domain)) {
          duplicates += 1;
          continue;
        }
        seenDomains.add(result.data.domain);
      }
      values.push({
        name: result.data.name,
        domain: result.data.domain,
        industry: result.data.industry,
        employeeCount: result.data.employeeCount,
        phone: result.data.phone,
        website: result.data.website,
        city: result.data.city,
        region: result.data.region,
        postalCode: result.data.postalCode,
        country: result.data.country,
        description: result.data.description,
        ownerId: input.actorId,
        updatedAt: new Date(),
      });
    }

    if (values.length > 0) await db.insert(companies).values(values);
    return {
      target: "companies",
      imported: values.length,
      skipped: errors.length,
      duplicates,
      errors,
    };
  }

  if (!input.mapping.firstName || !input.mapping.lastName || !input.mapping.email) {
    throw new AppError(
      "Map columns for first name, last name, and email before importing contacts.",
      "CSV_MAPPING",
    );
  }

  const companyRows = await db
    .select({ id: companies.id, name: companies.name, domain: companies.domain })
    .from(companies)
    .where(sql`${companies.archivedAt} is null`);
  const companyByDomain = new Map(
    companyRows.filter((row) => row.domain).map((row) => [row.domain!, row.id]),
  );
  const companyByName = new Map(companyRows.map((row) => [row.name.toLowerCase(), row.id]));

  const existingEmails = new Set(
    (await db.select({ email: contacts.email }).from(contacts)).map((row) =>
      normalizeEmail(row.email),
    ),
  );
  const seenEmails = new Set<string>();
  const values: Array<typeof contacts.$inferInsert> = [];

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    let companyId: string | null = null;
    const companyDomain = mapped(row, input.mapping, "companyDomain");
    const companyName = mapped(row, input.mapping, "companyName");
    if (companyDomain) {
      companyId = companyByDomain.get(normalizeDomain(companyDomain) ?? "") ?? null;
    } else if (companyName) {
      companyId = companyByName.get(companyName.toLowerCase()) ?? null;
    }
    if ((companyDomain || companyName) && !companyId) {
      errors.push({
        row: rowNumber,
        message: {
          key: "directory.companyNotFound",
          params: { company: companyDomain ?? companyName ?? "" },
        },
      });
      continue;
    }

    const result = contactSchema.safeParse({
      firstName: mapped(row, input.mapping, "firstName") ?? "",
      lastName: mapped(row, input.mapping, "lastName") ?? "",
      email: mapped(row, input.mapping, "email") ?? "",
      phone: mapped(row, input.mapping, "phone"),
      jobTitle: mapped(row, input.mapping, "jobTitle"),
      companyId,
      ownerId: input.actorId,
      notes: mapped(row, input.mapping, "notes"),
      tags: [],
    });
    if (!result.success) {
      const fieldErrors = fieldErrorsFromZod(result.error);
      errors.push({
        row: rowNumber,
        message: importFieldError(fieldErrors),
      });
      continue;
    }
    const email = normalizeEmail(result.data.email);
    if (existingEmails.has(email) || seenEmails.has(email)) {
      duplicates += 1;
      continue;
    }
    seenEmails.add(email);
    values.push({
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      email: result.data.email,
      phone: result.data.phone,
      jobTitle: result.data.jobTitle,
      companyId: result.data.companyId,
      ownerId: input.actorId,
      notes: result.data.notes,
      updatedAt: new Date(),
    });
  }

  if (values.length > 0) await db.insert(contacts).values(values);
  return {
    target: "contacts",
    imported: values.length,
    skipped: errors.length,
    duplicates,
    errors,
  };
}
