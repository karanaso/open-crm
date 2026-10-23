import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tickets } from "@/db/schema";
import { resetDatabase } from "./helpers";
import { createCompany as factoryCompany, createContact, createUser } from "./factories";
import { ticketSchema } from "@/lib/validation/ticket";
import {
  addTicketComment,
  assignTicket,
  changeTicketPriority,
  changeTicketStatus,
  createTicket,
  getTicket,
  getTicketComments,
  listTickets,
  updateTicket,
} from "@/lib/services/tickets";
import { setUserStatus } from "@/lib/services/users";

async function fixture() {
  const admin = await createUser({ role: "admin" });
  const member = await createUser();
  const contact = await createContact(admin.id, null, {
    firstName: "Jordan",
    lastName: "Lee",
    email: "jordan@example.com",
  });
  const ticket = await createTicket(
    ticketSchema.parse({
      subject: "Login issue",
      description: "Cannot sign in",
      requesterContactId: contact.id,
      priority: "normal",
      assigneeId: member.id,
    }),
    admin.id,
  );
  return { admin, member, contact, ticket };
}

describe("support desk", () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it("creates an open ticket and derives its company", async () => {
    const admin = await createUser({ role: "admin" });
    const company = await factoryCompany(admin.id, { name: "Tickets Co" });
    const contact = await createContact(admin.id, company.id, {
      firstName: "Company",
      lastName: "Contact",
    });
    const ticket = await createTicket(
      ticketSchema.parse({
        subject: "Question",
        description: "Need help",
        requesterContactId: contact.id,
      }),
      admin.id,
    );
    const loaded = await getTicket(ticket.id);
    expect(loaded?.status).toBe("open");
    expect(loaded?.priority).toBe("normal");
    expect(loaded?.companyName).toBe(company.name);
  });

  it("enforces the ticket state machine", async () => {
    const { ticket } = await fixture();
    const closed = await changeTicketStatus(ticket.id, "closed");
    expect(closed.status).toBe("closed");
    await expect(changeTicketStatus(ticket.id, "in_progress")).rejects.toThrow(
      "cannot move",
    );
    const reopened = await changeTicketStatus(ticket.id, "open");
    expect(reopened.status).toBe("open");
  });

  it("records the first response when a reply is added", async () => {
    const { admin, ticket } = await fixture();
    expect((await getTicket(ticket.id))?.firstResponseAt).toBeNull();
    await addTicketComment(
      ticket.id,
      { body: "We are looking into it.", visibility: "reply" },
      admin,
    );
    expect((await getTicket(ticket.id))?.firstResponseAt).not.toBeNull();
  });

  it("does not record a first response for an internal note", async () => {
    const { admin, ticket } = await fixture();
    await addTicketComment(
      ticket.id,
      { body: "Check the tenant configuration.", visibility: "internal" },
      admin,
    );
    expect((await getTicket(ticket.id))?.firstResponseAt).toBeNull();
  });

  it("restricts internal notes to admins and the assignee", async () => {
    const { admin, member, ticket } = await fixture();
    const outsider = await createUser();

    await addTicketComment(
      ticket.id,
      { body: "Internal diagnostic", visibility: "internal" },
      admin,
    );
    await addTicketComment(ticket.id, { body: "Public reply", visibility: "reply" }, admin);

    const outsiderComments = await getTicketComments(ticket.id, outsider);
    expect(outsiderComments.map((comment) => comment.visibility)).toEqual(["reply"]);

    const assigneeComments = await getTicketComments(ticket.id, member);
    expect(assigneeComments).toHaveLength(2);

    const adminComments = await getTicketComments(ticket.id, admin);
    expect(adminComments).toHaveLength(2);
  });

  it("recalculates SLA deadlines when priority changes", async () => {
    const { ticket } = await fixture();
    await changeTicketPriority(ticket.id, "urgent");
    const urgent = await getTicket(ticket.id);
    const urgentDue = urgent!.sla.firstResponseDue.getTime();
    await changeTicketPriority(ticket.id, "low");
    const low = await getTicket(ticket.id);
    expect(low!.sla.firstResponseDue.getTime()).toBeGreaterThan(urgentDue);
  });

  it("finds overdue tickets", async () => {
    const { ticket } = await fixture();
    await db
      .update(tickets)
      .set({ createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000) })
      .where(eq(tickets.id, ticket.id));

    const result = await listTickets({
      q: "",
      status: "active",
      overdue: true,
      sort: "updated",
      page: 1,
      pageSize: 20,
    });
    expect(result.items.some((item) => item.id === ticket.id)).toBe(true);
  });

  it("excludes resolved tickets from the active view", async () => {
    const { ticket } = await fixture();
    await changeTicketStatus(ticket.id, "resolved");
    const active = await listTickets({
      q: "",
      status: "active",
      sort: "updated",
      page: 1,
      pageSize: 20,
    });
    expect(active.items.some((item) => item.id === ticket.id)).toBe(false);
  });

  it("rejects inactive assignees", async () => {
    const { admin, member, ticket } = await fixture();
    await setUserStatus(admin.id, member.id, "inactive");
    await expect(assignTicket(ticket.id, member.id)).rejects.toThrow("active team member");
  });

  it("rejects a stale ticket update", async () => {
    const { ticket } = await fixture();
    const stale = ticket.updatedAt.toISOString();
    await updateTicket(
      ticket.id,
      ticketSchema.parse({
        subject: "Updated",
        description: "Updated description",
        requesterContactId: ticket.requesterContactId,
        priority: "high",
      }),
      stale,
    );
    await expect(
      updateTicket(
        ticket.id,
        ticketSchema.parse({
          subject: "Stale",
          description: "Stale description",
          requesterContactId: ticket.requesterContactId,
          priority: "low",
        }),
        stale,
      ),
    ).rejects.toThrow("changed since you loaded");
  });
});
