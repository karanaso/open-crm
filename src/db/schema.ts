import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type {
  ActivityMetadata,
  CampaignSegmentSnapshot,
  SegmentCriteria,
} from "@/lib/types";

export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive"]);
export const activityTypeEnum = pgEnum("activity_type", [
  "note",
  "call",
  "email",
  "meeting",
  "stage_change",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "normal", "high"]);
export const taskStatusEnum = pgEnum("task_status", ["open", "completed"]);
export const stageOutcomeEnum = pgEnum("stage_outcome", ["open", "won", "lost"]);
export const dealStatusEnum = pgEnum("deal_status", ["open", "won", "lost"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "urgent",
  "high",
  "normal",
  "low",
]);
export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "in_progress",
  "pending",
  "resolved",
  "closed",
]);
export const commentVisibilityEnum = pgEnum("comment_visibility", ["reply", "internal"]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "completed",
  "archived",
]);
export const campaignChannelEnum = pgEnum("campaign_channel", [
  "email",
  "phone",
  "event",
  "social",
  "other",
]);
export const recipientStatusEnum = pgEnum("recipient_status", [
  "targeted",
  "sent",
  "opened",
  "clicked",
  "responded",
  "converted",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    status: userStatusEnum("status").notNull().default("active"),
    sessionVersion: integer("session_version").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`),
    index("users_status_idx").on(table.status),
  ],
);

export const invites = pgTable(
  "invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: userRoleEnum("role").notNull().default("member"),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    invitedById: uuid("invited_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("invites_token_hash_idx").on(table.tokenHash),
    index("invites_email_idx").on(sql`lower(${table.email})`),
    index("invites_pending_idx").on(table.acceptedAt, table.revokedAt),
  ],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_token_hash_idx").on(table.tokenHash),
    index("password_reset_tokens_user_idx").on(table.userId),
  ],
);

export const loginAttempts = pgTable("login_attempts", {
  email: text("email").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companies = pgTable(
  "companies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    domain: text("domain"),
    industry: text("industry"),
    employeeCount: integer("employee_count"),
    phone: text("phone"),
    website: text("website"),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    description: text("description"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("companies_owner_idx").on(table.ownerId),
    index("companies_archived_idx").on(table.archivedAt),
    index("companies_domain_idx").on(table.domain),
  ],
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    jobTitle: text("job_title"),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "set null" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    notes: text("notes"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("contacts_email_lower_idx").on(sql`lower(${table.email})`),
    index("contacts_company_idx").on(table.companyId),
    index("contacts_owner_idx").on(table.ownerId),
    index("contacts_archived_idx").on(table.archivedAt),
  ],
);

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("tags_name_lower_idx").on(sql`lower(${table.name})`)],
);

export const companyTags = pgTable(
  "company_tags",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.companyId, table.tagId] }),
    index("company_tags_tag_idx").on(table.tagId),
  ],
);

export const contactTags = pgTable(
  "contact_tags",
  {
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.contactId, table.tagId] }),
    index("contact_tags_tag_idx").on(table.tagId),
  ],
);

export const pipelines = pgTable(
  "pipelines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("pipelines_one_default_idx")
      .on(table.isDefault)
      .where(sql`${table.isDefault} = true`),
    index("pipelines_archived_idx").on(table.archivedAt),
  ],
);

export const stages = pgTable(
  "stages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull(),
    probability: integer("probability").notNull().default(0),
    outcome: stageOutcomeEnum("outcome").notNull().default("open"),
    ...timestamps,
  },
  (table) => [
    index("stages_pipeline_position_idx").on(table.pipelineId, table.position),
    check("stages_probability_check", sql`${table.probability} >= 0 AND ${table.probability} <= 100`),
  ],
);

export const deals = pgTable(
  "deals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "restrict" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "set null" }),
    pipelineId: uuid("pipeline_id")
      .notNull()
      .references(() => pipelines.id, { onDelete: "restrict" }),
    stageId: uuid("stage_id")
      .notNull()
      .references(() => stages.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull().default("0"),
    expectedCloseDate: date("expected_close_date"),
    description: text("description"),
    status: dealStatusEnum("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    lostReason: text("lost_reason"),
    ...timestamps,
  },
  (table) => [
    index("deals_company_idx").on(table.companyId),
    index("deals_contact_idx").on(table.contactId),
    index("deals_pipeline_idx").on(table.pipelineId),
    index("deals_stage_idx").on(table.stageId),
    index("deals_owner_idx").on(table.ownerId),
    index("deals_status_idx").on(table.status),
    index("deals_close_date_idx").on(table.expectedCloseDate),
    check("deals_amount_check", sql`${table.amount} >= 0`),
  ],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: activityTypeEnum("type").notNull(),
    subject: text("subject").notNull(),
    body: text("body"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    metadata: jsonb("metadata").$type<ActivityMetadata>(),
    ...timestamps,
  },
  (table) => [
    index("activities_company_idx").on(table.companyId),
    index("activities_contact_idx").on(table.contactId),
    index("activities_deal_idx").on(table.dealId),
    index("activities_ticket_idx").on(table.ticketId),
    index("activities_campaign_idx").on(table.campaignId),
    index("activities_occurred_idx").on(table.occurredAt),
    check(
      "activities_link_check",
      sql`num_nonnulls(${table.companyId}, ${table.contactId}, ${table.dealId}, ${table.ticketId}, ${table.campaignId}) >= 1`,
    ),
  ],
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    dueDate: date("due_date").notNull(),
    priority: taskPriorityEnum("priority").notNull().default("normal"),
    status: taskStatusEnum("status").notNull().default("open"),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    completedById: uuid("completed_by_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    companyId: uuid("company_id").references(() => companies.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id").references(() => contacts.id, { onDelete: "cascade" }),
    dealId: uuid("deal_id").references(() => deals.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, { onDelete: "cascade" }),
    campaignId: uuid("campaign_id").references(() => campaigns.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("tasks_due_idx").on(table.dueDate),
    index("tasks_assignee_idx").on(table.assigneeId),
    index("tasks_status_idx").on(table.status),
    index("tasks_company_idx").on(table.companyId),
    index("tasks_contact_idx").on(table.contactId),
    index("tasks_deal_idx").on(table.dealId),
    index("tasks_ticket_idx").on(table.ticketId),
    index("tasks_campaign_idx").on(table.campaignId),
    check(
      "tasks_link_check",
      sql`num_nonnulls(${table.companyId}, ${table.contactId}, ${table.dealId}, ${table.ticketId}, ${table.campaignId}) >= 1`,
    ),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    requesterContactId: uuid("requester_contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "restrict" }),
    assigneeId: uuid("assignee_id").references(() => users.id, { onDelete: "set null" }),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    priority: ticketPriorityEnum("priority").notNull().default("normal"),
    status: ticketStatusEnum("status").notNull().default("open"),
    firstResponseAt: timestamp("first_response_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("tickets_requester_idx").on(table.requesterContactId),
    index("tickets_assignee_idx").on(table.assigneeId),
    index("tickets_status_idx").on(table.status),
    index("tickets_priority_idx").on(table.priority),
    index("tickets_created_idx").on(table.createdAt),
  ],
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    visibility: commentVisibilityEnum("visibility").notNull().default("reply"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ticket_comments_ticket_idx").on(table.ticketId, table.createdAt),
    index("ticket_comments_author_idx").on(table.authorId),
  ],
);

export const segments = pgTable(
  "segments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    criteria: jsonb("criteria").$type<SegmentCriteria>().notNull(),
    createdById: uuid("created_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("segments_archived_idx").on(table.archivedAt),
    index("segments_created_by_idx").on(table.createdById),
  ],
);

export const campaigns = pgTable(
  "campaigns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    channel: campaignChannelEnum("channel").notNull().default("email"),
    status: campaignStatusEnum("status").notNull().default("draft"),
    segmentId: uuid("segment_id")
      .notNull()
      .references(() => segments.id, { onDelete: "restrict" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    budget: numeric("budget", { precision: 14, scale: 2 }).notNull().default("0"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    description: text("description"),
    segmentSnapshot: jsonb("segment_snapshot").$type<CampaignSegmentSnapshot>(),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("campaigns_status_idx").on(table.status),
    index("campaigns_channel_idx").on(table.channel),
    index("campaigns_owner_idx").on(table.ownerId),
    index("campaigns_segment_idx").on(table.segmentId),
    check("campaigns_budget_check", sql`${table.budget} >= 0`),
  ],
);

export const campaignRecipients = pgTable(
  "campaign_recipients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id, { onDelete: "cascade" }),
    status: recipientStatusEnum("status").notNull().default("targeted"),
    statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).notNull().defaultNow(),
    statusUpdatedById: uuid("status_updated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("campaign_recipients_campaign_contact_idx").on(table.campaignId, table.contactId),
    index("campaign_recipients_campaign_status_idx").on(table.campaignId, table.status),
    index("campaign_recipients_contact_idx").on(table.contactId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  ownedCompanies: many(companies),
  ownedContacts: many(contacts),
  ownedDeals: many(deals),
  assignedTickets: many(tickets),
  assignedTasks: many(tasks),
  activities: many(activities),
  campaigns: many(campaigns),
  segments: many(segments),
}));

export const companiesRelations = relations(companies, ({ one, many }) => ({
  owner: one(users, { fields: [companies.ownerId], references: [users.id] }),
  contacts: many(contacts),
  deals: many(deals),
  activities: many(activities),
  tasks: many(tasks),
  tags: many(companyTags),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  company: one(companies, { fields: [contacts.companyId], references: [companies.id] }),
  owner: one(users, { fields: [contacts.ownerId], references: [users.id] }),
  deals: many(deals),
  tickets: many(tickets),
  activities: many(activities),
  tasks: many(tasks),
  campaignRecipients: many(campaignRecipients),
  tags: many(contactTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  companies: many(companyTags),
  contacts: many(contactTags),
}));

export const companyTagsRelations = relations(companyTags, ({ one }) => ({
  company: one(companies, { fields: [companyTags.companyId], references: [companies.id] }),
  tag: one(tags, { fields: [companyTags.tagId], references: [tags.id] }),
}));

export const contactTagsRelations = relations(contactTags, ({ one }) => ({
  contact: one(contacts, { fields: [contactTags.contactId], references: [contacts.id] }),
  tag: one(tags, { fields: [contactTags.tagId], references: [tags.id] }),
}));

export const pipelinesRelations = relations(pipelines, ({ many }) => ({
  stages: many(stages),
  deals: many(deals),
}));

export const stagesRelations = relations(stages, ({ one, many }) => ({
  pipeline: one(pipelines, { fields: [stages.pipelineId], references: [pipelines.id] }),
  deals: many(deals),
}));

export const dealsRelations = relations(deals, ({ one, many }) => ({
  company: one(companies, { fields: [deals.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [deals.contactId], references: [contacts.id] }),
  pipeline: one(pipelines, { fields: [deals.pipelineId], references: [pipelines.id] }),
  stage: one(stages, { fields: [deals.stageId], references: [stages.id] }),
  owner: one(users, { fields: [deals.ownerId], references: [users.id] }),
  activities: many(activities),
  tasks: many(tasks),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  author: one(users, { fields: [activities.authorId], references: [users.id] }),
  company: one(companies, { fields: [activities.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [activities.contactId], references: [contacts.id] }),
  deal: one(deals, { fields: [activities.dealId], references: [deals.id] }),
  ticket: one(tickets, { fields: [activities.ticketId], references: [tickets.id] }),
  campaign: one(campaigns, { fields: [activities.campaignId], references: [campaigns.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
  createdBy: one(users, { fields: [tasks.createdById], references: [users.id] }),
  completedBy: one(users, { fields: [tasks.completedById], references: [users.id] }),
  company: one(companies, { fields: [tasks.companyId], references: [companies.id] }),
  contact: one(contacts, { fields: [tasks.contactId], references: [contacts.id] }),
  deal: one(deals, { fields: [tasks.dealId], references: [deals.id] }),
  ticket: one(tickets, { fields: [tasks.ticketId], references: [tickets.id] }),
  campaign: one(campaigns, { fields: [tasks.campaignId], references: [campaigns.id] }),
}));

export const ticketsRelations = relations(tickets, ({ one, many }) => ({
  requester: one(contacts, {
    fields: [tickets.requesterContactId],
    references: [contacts.id],
  }),
  assignee: one(users, { fields: [tickets.assigneeId], references: [users.id] }),
  createdBy: one(users, { fields: [tickets.createdById], references: [users.id] }),
  comments: many(ticketComments),
  activities: many(activities),
  tasks: many(tasks),
}));

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(tickets, { fields: [ticketComments.ticketId], references: [tickets.id] }),
  author: one(users, { fields: [ticketComments.authorId], references: [users.id] }),
}));

export const segmentsRelations = relations(segments, ({ one, many }) => ({
  createdBy: one(users, { fields: [segments.createdById], references: [users.id] }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  segment: one(segments, { fields: [campaigns.segmentId], references: [segments.id] }),
  owner: one(users, { fields: [campaigns.ownerId], references: [users.id] }),
  recipients: many(campaignRecipients),
  activities: many(activities),
  tasks: many(tasks),
}));

export const campaignRecipientsRelations = relations(campaignRecipients, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignRecipients.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [campaignRecipients.contactId],
    references: [contacts.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Company = typeof companies.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Pipeline = typeof pipelines.$inferSelect;
export type Stage = typeof stages.$inferSelect;
export type Deal = typeof deals.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketComment = typeof ticketComments.$inferSelect;
export type Segment = typeof segments.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignRecipient = typeof campaignRecipients.$inferSelect;
