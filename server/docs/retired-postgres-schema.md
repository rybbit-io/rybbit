# Retiring legacy user data and Postgres sessions

Migration `0021_retire_legacy_user_data` removes the `user.stripeCustomerId`,
`user.overMonthlyLimit`, `user.monthlyEventCount`, and
`user.scheduled_tip_email_ids` columns and the `active_sessions` table. Billing
uses the organization fields, and active sessions use Redis. Organization
billing columns are unchanged.

This contract migration depends on the retired onboarding-tip cancellation
cleanup (`goldflag/remove-retired-tip-cancellation`). Keep the migration PR in
draft until the production checks below are complete. Preparing these files
does not verify production state or authorize running the migration.

The SQL, schema declarations, journal, and `0021_snapshot.json` describe the same
removals. Earlier migration files and snapshots are unchanged. The new snapshot
was derived from `0020_snapshot.json`, with only the retired table and four user
columns removed and the snapshot IDs advanced. This keeps a later unrelated
Drizzle generation from silently inheriting these drops.

## Checks required before deployment

1. Ship the onboarding-tip cancellation cleanup first. Confirm every cloud
   instance stopped the old scheduler more than six days ago, and confirm
   Resend has no pending scheduled onboarding-tip emails. The old schedule could
   send roughly five days and nine hours after signup.
2. Audit legacy Stripe customer IDs using the read-only query below. The count
   must be zero, or each unmatched ID must be reviewed, archived, and explicitly
   accepted for retirement before proceeding. A non-null user ID may represent
   billing history that was never copied to an organization.
3. Take a verified Postgres backup containing the full `user` and
   `active_sessions` tables, including their schemas. Retain an export of the
   four retired user columns keyed by `user.id`. Check the restoration procedure
   before deployment; dropping the columns discards their data.
4. Confirm Redis-backed sessions are healthy and no external jobs or reports
   depend on `active_sessions` or the retired user columns.
5. Confirm no supported rollback target declares the removed columns or table.
   Whole-row user reads in previous builds select these columns and fail after
   they are dropped. The parent cleanup branch still declares the columns; it
   is not a compatible rollback target after this migration.
6. Add the self-hosting release note below to the release that carries this
   migration. Review the migration immediately before merging, including its
   sequence number if another schema migration has landed.

The container entrypoint applies Drizzle migrations automatically on startup.
Reviewing or merging the SQL must therefore be treated as a deployment change,
not just removing TypeScript declarations. No production queries or production
migrations were run while preparing this change.

## Read-only audit queries

Run these through the normal production operations process before removing the
draft status; they are documented here and are not part of migration execution.

```sql
SELECT count(*) AS unmatched_legacy_stripe_customers
FROM "user" u
WHERE u."stripeCustomerId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization o
    WHERE o."stripeCustomerId" = u."stripeCustomerId"
  );
```

```sql
SELECT max("createdAt") AS newest_signup_with_tip_ids
FROM "user"
WHERE jsonb_array_length(COALESCE(scheduled_tip_email_ids, '[]'::jsonb)) > 0;
```

The second result must be null or earlier than the current time minus six days.
Also investigate any user with tip IDs created after the first lifecycle email
was logged: that can indicate an old cloud instance continued scheduling.
Stored IDs alone cannot prove whether Resend still has pending sends.

## Self-hosting release note

This release removes obsolete billing fields from the user table, retired
onboarding-tip email IDs, and the unused Postgres active sessions table. Current
organization billing and Redis session tracking continue to operate normally.
Back up Postgres before upgrading. After migration `0021`, downgrading to a
version that declares these fields will fail; restoring an older version
requires restoring the retired schema and data from backup first.
