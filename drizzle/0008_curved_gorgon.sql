ALTER TABLE "users" ADD COLUMN "theme" text DEFAULT 'default' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "theme_mode" text DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_theme_check" CHECK ("users"."theme" in ('default', 'violet', 'emerald', 'amber', 'rose'));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_theme_mode_check" CHECK ("users"."theme_mode" in ('light', 'dark', 'system'));