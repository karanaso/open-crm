CREATE TYPE "public"."energy_class" AS ENUM('a_plus', 'a', 'b', 'c', 'd', 'e', 'f', 'g');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."listing_transaction" AS ENUM('sale', 'rent');--> statement-breakpoint
CREATE TYPE "public"."property_type" AS ENUM('apartment', 'house', 'villa', 'maisonette', 'plot', 'commercial', 'other');--> statement-breakpoint
CREATE TYPE "public"."rent_period" AS ENUM('month');--> statement-breakpoint
CREATE TYPE "public"."viewing_status" AS ENUM('scheduled', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE "listing_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"mime_type" text NOT NULL,
	"width" integer,
	"height" integer,
	"byte_size" integer,
	"position" integer NOT NULL,
	"alt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_photos_position_check" CHECK ("listing_photos"."position" >= 0),
	CONSTRAINT "listing_photos_byte_size_check" CHECK ("listing_photos"."byte_size" >= 0)
);
--> statement-breakpoint
CREATE TABLE "listing_viewings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"agent_id" uuid,
	"scheduled_at" timestamp with time zone NOT NULL,
	"duration_minutes" integer DEFAULT 30 NOT NULL,
	"status" "viewing_status" DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_by_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listing_viewings_duration_check" CHECK ("listing_viewings"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"transaction" "listing_transaction" NOT NULL,
	"status" "listing_status" DEFAULT 'active' NOT NULL,
	"price" numeric(14, 2) NOT NULL,
	"price_period" "rent_period",
	"commission_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" char(3) NOT NULL,
	"address_line1" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"property_type" "property_type" NOT NULL,
	"bedrooms" integer,
	"bathrooms" numeric(3, 1),
	"size_sqm" numeric(10, 2),
	"lot_sqm" numeric(12, 2),
	"year_built" integer,
	"floors" integer,
	"parking" integer,
	"energy_class" "energy_class",
	"seller_contact_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"listed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_price_check" CHECK ("listings"."price" >= 0),
	CONSTRAINT "listings_commission_check" CHECK ("listings"."commission_amount" >= 0),
	CONSTRAINT "listings_bedrooms_check" CHECK ("listings"."bedrooms" >= 0),
	CONSTRAINT "listings_bathrooms_check" CHECK ("listings"."bathrooms" >= 0),
	CONSTRAINT "listings_size_sqm_check" CHECK ("listings"."size_sqm" >= 0),
	CONSTRAINT "listings_lot_sqm_check" CHECK ("listings"."lot_sqm" >= 0),
	CONSTRAINT "listings_parking_check" CHECK ("listings"."parking" >= 0),
	CONSTRAINT "listings_year_built_check" CHECK ("listings"."year_built" >= 1000),
	CONSTRAINT "listings_currency_check" CHECK (char_length("listings"."currency") = 3),
	CONSTRAINT "listings_price_period_check" CHECK (("listings"."transaction" = 'sale' AND "listings"."price_period" IS NULL) OR ("listings"."transaction" = 'rent' AND "listings"."price_period" = 'month'))
);
--> statement-breakpoint
CREATE TABLE "workspace_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"default_currency" char(3) DEFAULT 'USD' NOT NULL,
	"time_zone" text DEFAULT 'UTC' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspace_settings_id_check" CHECK ("workspace_settings"."id" = 'default'),
	CONSTRAINT "workspace_settings_currency_check" CHECK (char_length("workspace_settings"."default_currency") = 3)
);
--> statement-breakpoint
ALTER TABLE "activities" DROP CONSTRAINT "activities_link_check";--> statement-breakpoint
ALTER TABLE "tasks" DROP CONSTRAINT "tasks_link_check";--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "company_id" DROP NOT NULL;--> statement-breakpoint
DO $$
DECLARE
  missing_contacts integer;
BEGIN
  SELECT count(*) INTO missing_contacts FROM "deals" WHERE "contact_id" IS NULL;
  IF missing_contacts > 0 THEN
    RAISE EXCEPTION 'Cannot set deals.contact_id NOT NULL: % deal(s) have no contact. Assign a contact to every deal before migrating.', missing_contacts;
  END IF;
END $$;--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "contact_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "activities" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "property_price" numeric(14, 2);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "currency" char(3) DEFAULT 'USD' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "listing_id" uuid;--> statement-breakpoint
ALTER TABLE "listing_photos" ADD CONSTRAINT "listing_photos_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_viewings" ADD CONSTRAINT "listing_viewings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_viewings" ADD CONSTRAINT "listing_viewings_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_viewings" ADD CONSTRAINT "listing_viewings_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_viewings" ADD CONSTRAINT "listing_viewings_created_by_id_users_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_contact_id_contacts_id_fk" FOREIGN KEY ("seller_contact_id") REFERENCES "public"."contacts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "listing_photos_storage_key_idx" ON "listing_photos" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "listing_photos_listing_position_idx" ON "listing_photos" USING btree ("listing_id","position");--> statement-breakpoint
CREATE INDEX "listing_viewings_listing_scheduled_idx" ON "listing_viewings" USING btree ("listing_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "listing_viewings_contact_scheduled_idx" ON "listing_viewings" USING btree ("contact_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "listing_viewings_agent_scheduled_idx" ON "listing_viewings" USING btree ("agent_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "listing_viewings_status_idx" ON "listing_viewings" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "listings_reference_idx" ON "listings" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "listings_transaction_status_idx" ON "listings" USING btree ("transaction","status");--> statement-breakpoint
CREATE INDEX "listings_city_idx" ON "listings" USING btree ("city");--> statement-breakpoint
CREATE INDEX "listings_price_idx" ON "listings" USING btree ("price");--> statement-breakpoint
CREATE INDEX "listings_owner_idx" ON "listings" USING btree ("owner_id");--> statement-breakpoint
CREATE INDEX "listings_seller_contact_idx" ON "listings" USING btree ("seller_contact_id");--> statement-breakpoint
CREATE INDEX "listings_listed_at_idx" ON "listings" USING btree ("listed_at");--> statement-breakpoint
CREATE INDEX "listings_features_gin_idx" ON "listings" USING gin ("features" jsonb_path_ops);--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_listing_idx" ON "activities" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "deals_listing_idx" ON "deals" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "deals_currency_idx" ON "deals" USING btree ("currency");--> statement-breakpoint
CREATE INDEX "tasks_listing_idx" ON "tasks" USING btree ("listing_id");--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_link_check" CHECK (num_nonnulls("activities"."company_id", "activities"."contact_id", "activities"."deal_id", "activities"."ticket_id", "activities"."campaign_id", "activities"."listing_id") >= 1);--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_property_price_check" CHECK ("deals"."property_price" IS NULL OR "deals"."property_price" >= 0);--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_currency_check" CHECK (char_length("deals"."currency") = 3);--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_link_check" CHECK (num_nonnulls("tasks"."company_id", "tasks"."contact_id", "tasks"."deal_id", "tasks"."ticket_id", "tasks"."campaign_id", "tasks"."listing_id") >= 1);--> statement-breakpoint
INSERT INTO "workspace_settings" ("id", "default_currency", "time_zone")
VALUES ('default', 'USD', 'UTC')
ON CONFLICT ("id") DO NOTHING;
