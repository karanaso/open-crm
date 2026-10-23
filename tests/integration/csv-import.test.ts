import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import { createUser } from "./factories";
import { importCsv } from "@/lib/services/csv-import";

describe("CSV import", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("imports companies and skips duplicate domains", async () => {
    const admin = await createUser({ role: "admin" });
    const csv = [
      "Company Name,Domain,Industry",
      "Acme Software,https://www.Acme.com,Software",
      "Northwind,https://northwind.example,Logistics",
      "Acme Duplicate,acme.com,Software",
      ",missing.example,Software",
    ].join("\n");

    const report = await importCsv({
      text: csv,
      target: "companies",
      mapping: { name: "Company Name", domain: "Domain", industry: "Industry" },
      actorId: admin.id,
    });

    expect(report.imported).toBe(2);
    expect(report.duplicates).toBe(1);
    expect(report.skipped).toBe(1);
    expect(report.errors[0].row).toBe(5);
  });

  it("imports contacts with company resolution and duplicate detection", async () => {
    const admin = await createUser({ role: "admin" });
    await importCsv({
      text: "Company Name,Domain\nAcme Software,acme.com",
      target: "companies",
      mapping: { name: "Company Name", domain: "Domain" },
      actorId: admin.id,
    });

    const csv = [
      "First,Last,Email,Company Domain",
      "Jordan,Lee,jordan@acme.com,acme.com",
      "Sam,Rivera,sam@acme.com,acme.com",
      "Duplicate,Jordan,JORDAN@ACME.COM,acme.com",
      "Unknown,Person,unknown@example.com,missing.example",
      "Bad,Email,not-an-email,acme.com",
    ].join("\n");

    const report = await importCsv({
      text: csv,
      target: "contacts",
      mapping: {
        firstName: "First",
        lastName: "Last",
        email: "Email",
        companyDomain: "Company Domain",
      },
      actorId: admin.id,
    });

    expect(report.imported).toBe(2);
    expect(report.duplicates).toBe(1);
    expect(report.skipped).toBe(2);
    expect(report.errors.some((error) => (typeof error.message === "string" ? error.message : error.message.key).includes("Company not found"))).toBe(true);
    expect(report.errors.some((error) => (typeof error.message === "string" ? error.message : error.message.key).includes("email"))).toBe(true);
  });

  it("rejects imports without the required mapping", async () => {
    const admin = await createUser({ role: "admin" });
    await expect(
      importCsv({
        text: "Name\nAcme",
        target: "companies",
        mapping: {},
        actorId: admin.id,
      }),
    ).rejects.toThrow("company name");

    await expect(
      importCsv({
        text: "First,Last\nJordan,Lee",
        target: "contacts",
        mapping: { firstName: "First", lastName: "Last" },
        actorId: admin.id,
      }),
    ).rejects.toThrow("first name");
  });

  it("rejects files with too many rows", async () => {
    const admin = await createUser({ role: "admin" });
    const rows = ["Name"];
    for (let index = 0; index < 5001; index += 1) rows.push(`Company ${index}`);
    await expect(
      importCsv({
        text: rows.join("\n"),
        target: "companies",
        mapping: { name: "Name" },
        actorId: admin.id,
      }),
    ).rejects.toThrow("more than 5,000");
  });
});
