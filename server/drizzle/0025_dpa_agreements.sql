CREATE TABLE "dpa_agreements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"dpa_version" text NOT NULL,
	"company_name" text NOT NULL,
	"company_address" text NOT NULL,
	"signer_name" text NOT NULL,
	"signer_title" text NOT NULL,
	"signer_email" text NOT NULL,
	"signed_by_user_id" text,
	"signer_ip" text,
	"signer_user_agent" text,
	"pdf" "bytea" NOT NULL,
	"pdf_sha256" text NOT NULL,
	"signed_at" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dpa_agreements" ADD CONSTRAINT "dpa_agreements_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dpa_agreements" ADD CONSTRAINT "dpa_agreements_signed_by_user_id_user_id_fk" FOREIGN KEY ("signed_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dpa_agreements_organization_id_idx" ON "dpa_agreements" USING btree ("organization_id","signed_at");