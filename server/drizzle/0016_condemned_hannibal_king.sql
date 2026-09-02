CREATE TABLE "annotations" (
	"annotation_id" serial PRIMARY KEY NOT NULL,
	"site_id" integer,
	"organization_id" text NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"description" text,
	"date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone,
	"color" text,
	"icon" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_site_id_sites_site_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("site_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "annotations" ADD CONSTRAINT "annotations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "annotations_site_date_idx" ON "annotations" USING btree ("site_id","date");--> statement-breakpoint
CREATE INDEX "annotations_org_date_idx" ON "annotations" USING btree ("organization_id","date");