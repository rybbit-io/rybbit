ALTER TABLE "apikey" RENAME COLUMN "userId" TO "referenceId";--> statement-breakpoint
ALTER TABLE "apikey" DROP CONSTRAINT "apikey_userId_user_id_fk";
--> statement-breakpoint
ALTER TABLE "apikey" ADD CONSTRAINT "apikey_referenceId_user_id_fk" FOREIGN KEY ("referenceId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;