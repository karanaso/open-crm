CREATE TYPE "public"."message_channel" AS ENUM('email');--> statement-breakpoint
CREATE TYPE "public"."message_delivery_status" AS ENUM('queued', 'sent', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."message_outcome_reason" AS ENUM('opted_out', 'archived', 'missing_email', 'cancelled', 'auth', 'connection', 'timeout', 'rejected', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'sending', 'completed', 'cancelled');--> statement-breakpoint
CREATE TABLE "message_group_members" (
	"group_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"added_by_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_group_members_group_id_contact_id_pk" PRIMARY KEY("group_id","contact_id")
);
--> statement-breakpoint
CREATE TABLE "message_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_by_id" uuid NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"message_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"address" text NOT NULL,
	"status" "message_delivery_status" DEFAULT 'queued' NOT NULL,
	"reason" "message_outcome_reason",
	"provider_message_id" text,
	"attempted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"channel" "message_channel" DEFAULT 'email' NOT NULL,
	"status" "message_status" DEFAULT 'draft' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"group_id" uuid,
	"segment_id" uuid,
	"audience_snapshot" jsonb,
	"created_by_id" uuid NOT NULL,
	"sent_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "messages_audience_check" CHECK (num_nonnulls("messages"."group_id", "messages"."segment_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "contacts" ADD COLUMN "email_opt_out_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "message_group_members" ADD CONSTRAINT "message_group_members_group_id_message_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."message_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_group_members" ADD CONSTRAINT "message_group_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_group_members" ADD CONSTRAINT "message_group_members_added_by_id_users_id_fk" FOREIGN KEY ("added_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_groups" ADD CONSTRAINT "message_groups_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_group_id_message_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."message_groups"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_group_members_contact_idx" ON "message_group_members" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "message_groups_archived_idx" ON "message_groups" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "message_groups_created_by_idx" ON "message_groups" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_recipients_message_contact_idx" ON "message_recipients" USING btree ("message_id","contact_id");--> statement-breakpoint
CREATE INDEX "message_recipients_message_status_idx" ON "message_recipients" USING btree ("message_id","status");--> statement-breakpoint
CREATE INDEX "message_recipients_contact_idx" ON "message_recipients" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "messages_status_idx" ON "messages" USING btree ("status");--> statement-breakpoint
CREATE INDEX "messages_group_idx" ON "messages" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "messages_segment_idx" ON "messages" USING btree ("segment_id");--> statement-breakpoint
CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");