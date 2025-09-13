import { eq } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { member } from "../../db/postgres/schema.js";

export async function getUserOrganizations(userId: string) {
  const userOrgs = await db
    .select({ organizationId: member.organizationId })
    .from(member)
    .where(eq(member.userId, userId));

  return userOrgs.map((org) => org.organizationId);
}
