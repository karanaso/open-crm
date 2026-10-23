import { beforeEach, describe, expect, it } from "vitest";
import { resetDatabase } from "./helpers";
import {
  createCompany as factoryCompany,
  createListing,
  createTestPipeline,
  createUser,
  createViewing,
} from "./factories";
import {
  createCompany,
  getCompany,
  getCompanyRelations,
  listCompanies,
  setCompanyArchived,
  updateCompany,
} from "@/lib/services/companies";
import {
  createContact,
  getContact,
  getContactRelations,
  listContacts,
  setContactArchived,
} from "@/lib/services/contacts";
import { companySchema, companyListParamsSchema } from "@/lib/validation/company";
import { contactSchema, contactListParamsSchema } from "@/lib/validation/contact";
import { dealSchema } from "@/lib/validation/deal";
import { createDeal } from "@/lib/services/deals";
import { ticketSchema } from "@/lib/validation/ticket";
import { createTicket } from "@/lib/services/tickets";
import { setUserStatus } from "@/lib/services/users";

describe("customer directory", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates and normalizes a company with tags", async () => {
    const admin = await createUser({ role: "admin" });
    const input = companySchema.parse({
      name: "Acme Software",
      domain: "https://www.Acme.COM/path",
      industry: "Software",
      ownerId: admin.id,
      tags: ["Enterprise", " enterprise ", "VIP"],
    });
    const company = await createCompany(input, admin.id);

    const saved = await getCompany(company.id);
    expect(saved?.domain).toBe("acme.com");
    expect(saved?.tagNames).toEqual(["enterprise", "vip"]);
  });

  it("archives companies and hides them from active lists", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id, { name: "Archive Me" });
    await setCompanyArchived(company.id, true);

    const active = await listCompanies(companyListParamsSchema.parse({ archived: "active" }));
    const archived = await listCompanies(companyListParamsSchema.parse({ archived: "archived" }));
    expect(active.items.some((item) => item.id === company.id)).toBe(false);
    expect(archived.items.some((item) => item.id === company.id)).toBe(true);

    await setCompanyArchived(company.id, false);
    const restored = await listCompanies(companyListParamsSchema.parse({}));
    expect(restored.items.some((item) => item.id === company.id)).toBe(true);
  });

  it("rejects inactive owners", async () => {
    const admin = await createUser({ role: "admin" });
    const inactive = await createUser();
    await setUserStatus(admin.id, inactive.id, "inactive");

    const input = companySchema.parse({ name: "Ownerless", ownerId: inactive.id });
    await expect(createCompany(input, admin.id)).rejects.toThrow("active team member");
  });

  it("filters companies by any selected tag", async () => {
    const admin = await createUser({ role: "admin" });
    await createCompany(
      companySchema.parse({ name: "VIP Co", ownerId: admin.id, tags: ["vip"] }),
      admin.id,
    );
    await createCompany(
      companySchema.parse({ name: "Renewal Co", ownerId: admin.id, tags: ["renewal"] }),
      admin.id,
    );
    await createCompany(
      companySchema.parse({ name: "Other Co", ownerId: admin.id, tags: ["other"] }),
      admin.id,
    );

    const anyTag = await listCompanies(companyListParamsSchema.parse({ tag: "vip,renewal" }));
    expect(anyTag.items.map((item) => item.name).sort()).toEqual(["Renewal Co", "VIP Co"]);

    const oneTag = await listCompanies(companyListParamsSchema.parse({ tag: "vip" }));
    expect(oneTag.items.map((item) => item.name)).toEqual(["VIP Co"]);
  });

  it("enforces case-insensitive unique contact emails", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id);
    const first = await createContact(
      contactSchema.parse({
        firstName: "Jordan",
        lastName: "Lee",
        email: "Jordan.Lee@Acme.com",
        companyId: company.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    expect((await getContact(first.id))?.email).toBe("jordan.lee@acme.com");

    await expect(
      createContact(
        contactSchema.parse({
          firstName: "Other",
          lastName: "Person",
          email: "JORDAN.LEE@ACME.COM",
          companyId: company.id,
          ownerId: admin.id,
        }),
        admin.id,
      ),
    ).rejects.toThrow("already belongs");
  });

  it("filters contacts by company and owner", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id);
    await createContact(
      contactSchema.parse({
        firstName: "Jordan",
        lastName: "Lee",
        email: "jordan@acme.com",
        companyId: company.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    await createContact(
      contactSchema.parse({
        firstName: "Sam",
        lastName: "Rivera",
        email: "sam@other.com",
        ownerId: admin.id,
      }),
      admin.id,
    );

    const filtered = await listContacts(contactListParamsSchema.parse({ companyId: company.id }));
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0].firstName).toBe("Jordan");

    const byOwner = await listContacts(contactListParamsSchema.parse({ ownerId: admin.id }));
    expect(byOwner.items).toHaveLength(2);
  });

  it("shows related records on a company", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id);
    const contact = await createContact(
      contactSchema.parse({
        firstName: "Jordan",
        lastName: "Lee",
        email: "jordan@acme.com",
        companyId: company.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    const { pipeline, openStage } = await createTestPipeline();
    await createDeal(
      dealSchema.parse({
        name: "Acme expansion",
        companyId: company.id,
        contactId: contact.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "10000",
      }),
      admin.id,
    );
    await createTicket(
      ticketSchema.parse({
        subject: "Login issue",
        description: "Cannot sign in",
        requesterContactId: contact.id,
        priority: "normal",
      }),
      admin.id,
    );

    const relations = await getCompanyRelations(company.id);
    expect(relations.contacts).toHaveLength(1);
    expect(relations.deals).toHaveLength(1);
    expect(relations.tickets).toHaveLength(1);
  });

  it("archives and restores contacts", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id);
    const contact = await createContact(
      contactSchema.parse({
        firstName: "Archive",
        lastName: "Me",
        email: "archive@example.com",
        companyId: company.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    await setContactArchived(contact.id, true);
    const active = await listContacts(contactListParamsSchema.parse({}));
    expect(active.items.some((item) => item.id === contact.id)).toBe(false);
    await setContactArchived(contact.id, false);
    const restored = await listContacts(contactListParamsSchema.parse({}));
    expect(restored.items.some((item) => item.id === contact.id)).toBe(true);
  });

  it("updates company details and ownership", async () => {
    const admin = await createUser({ role: "admin" });
    const owner = await createUser();
    const company = await factoryCompany(admin.id, { name: "Old Name" });
    const updated = await updateCompany(company.id, {
      name: "New Name",
      domain: "new.example",
      industry: null,
      employeeCount: null,
      phone: null,
      website: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      region: null,
      postalCode: null,
      country: null,
      description: null,
      ownerId: owner.id,
      tags: ["vip"],
    });
    expect(updated.name).toBe("New Name");
    expect(updated.ownerId).toBe(owner.id);
    expect((await getCompany(company.id))?.tagNames).toEqual(["vip"]);
  });

  it("shows selling listings, buying deals, and viewings on directory records", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id);
    const seller = await createContact(
      contactSchema.parse({
        firstName: "Sofia",
        lastName: "Seller",
        email: "sofia@directory.test",
        companyId: company.id,
        ownerId: admin.id,
      }),
      admin.id,
    );
    const buyer = await createContact(
      contactSchema.parse({
        firstName: "Ben",
        lastName: "Buyer",
        email: "ben@directory.test",
        ownerId: admin.id,
      }),
      admin.id,
    );
    const listing = await createListing(seller.id, admin.id, {
      reference: "RE-DIR-1",
      title: "Garden flat",
      price: "200000.00",
      currency: "EUR",
      commissionAmount: "2000.00",
    });
    const { pipeline, openStage } = await createTestPipeline();
    await createDeal(
      dealSchema.parse({
        name: "Sofia buys",
        contactId: seller.id,
        listingId: listing.id,
        pipelineId: pipeline.id,
        stageId: openStage.id,
        ownerId: admin.id,
        amount: "1500",
        currency: "EUR",
      }),
      admin.id,
    );
    await createViewing(listing.id, buyer.id, admin.id);

    const sellerRelations = await getContactRelations(seller.id);
    expect(sellerRelations.sellingListings).toHaveLength(1);
    expect(sellerRelations.sellingListings[0].id).toBe(listing.id);
    expect(sellerRelations.deals).toHaveLength(1);
    expect(sellerRelations.deals[0].currency).toBe("EUR");

    const buyerRelations = await getContactRelations(buyer.id);
    expect(buyerRelations.viewings).toHaveLength(1);
    expect(buyerRelations.viewings[0].listingReference).toBe("RE-DIR-1");
    expect(buyerRelations.viewings[0].agentName).toBe(admin.name);

    const companyRelations = await getCompanyRelations(company.id);
    expect(companyRelations.listings).toHaveLength(1);
    expect(companyRelations.listings[0].sellerFirstName).toBe("Sofia");

    await setContactArchived(seller.id, true);
    const archivedCompanyRelations = await getCompanyRelations(company.id);
    expect(archivedCompanyRelations.listings).toHaveLength(1);
    expect(archivedCompanyRelations.listings[0].sellerArchivedAt).not.toBeNull();
    expect((await getContactRelations(seller.id)).sellingListings).toHaveLength(1);
  });
});
