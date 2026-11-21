-- invitation.createdAt was added to schema.ts in Feb 2026 (868f209c) without a
-- migration, and the 0000 baseline's legacy backfill block never covered it, so
-- any database whose invitation table predates that commit is missing the
-- column. Better Auth 1.7 validates the schema at startup and fails every
-- /api/auth/* request on the mismatch. Idempotent: safe on databases that
-- already have the column.
ALTER TABLE "invitation" ADD COLUMN IF NOT EXISTS "createdAt" timestamp;
