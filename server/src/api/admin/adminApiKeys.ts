import { ORG_API_KEY_CONFIG_ID } from "@rybbit/shared";
import { and, desc, eq, inArray, isNull, ne, or } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";

import { db } from "../../db/postgres/postgres.js";
import { apiKey, organization, user } from "../../db/postgres/schema.js";

export interface AdminApiKeyData {
  id: string;
  name: string | null;
  /** The key's visible leading characters; the secret itself is never returned. */
  start: string | null;
  ownerType: "user" | "organization";
  ownerId: string;
  /** Null when the owning user or organization no longer exists (orphaned key). */
  ownerName: string | null;
  ownerEmail: string | null;
  /** The member who minted an organization key, when recorded. */
  createdBy: { id: string; name: string | null; email: string | null } | null;
  enabled: boolean;
  permissions: Record<string, string[]> | null;
  expiresAt: string | null;
  lastRequest: string | null;
  createdAt: string;
}

const isOrgKey = eq(apiKey.configId, ORG_API_KEY_CONFIG_ID);
// Keys minted before org keys existed have a NULL configId and are user keys.
const isUserKey = or(isNull(apiKey.configId), ne(apiKey.configId, ORG_API_KEY_CONFIG_ID));

function parseJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parsePermissions(value: string | null): Record<string, string[]> | null {
  const parsed = parseJson(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  return parsed as Record<string, string[]>;
}

/** better-auth stores { createdBy } on org keys; legacy rows may hold it double-stringified. */
function createdByFromMetadata(metadata: unknown): string | null {
  let parsed = parseJson(metadata);
  if (typeof parsed === "string") parsed = parseJson(parsed);
  if (!parsed || typeof parsed !== "object") return null;
  const createdBy = (parsed as { createdBy?: unknown }).createdBy;
  return typeof createdBy === "string" ? createdBy : null;
}

export async function getAdminApiKeys(request: FastifyRequest, reply: FastifyReply) {
  try {
    const rows = await db
      .select({
        id: apiKey.id,
        name: apiKey.name,
        start: apiKey.start,
        configId: apiKey.configId,
        referenceId: apiKey.referenceId,
        enabled: apiKey.enabled,
        permissions: apiKey.permissions,
        metadata: apiKey.metadata,
        expiresAt: apiKey.expiresAt,
        lastRequest: apiKey.lastRequest,
        createdAt: apiKey.createdAt,
        userName: user.name,
        userEmail: user.email,
        organizationName: organization.name,
      })
      .from(apiKey)
      .leftJoin(user, and(eq(user.id, apiKey.referenceId), isUserKey))
      .leftJoin(organization, and(eq(organization.id, apiKey.referenceId), isOrgKey))
      .orderBy(desc(apiKey.createdAt));

    const creatorIds = [
      ...new Set(
        rows
          .filter(row => row.configId === ORG_API_KEY_CONFIG_ID)
          .map(row => createdByFromMetadata(row.metadata))
          .filter((id): id is string => !!id)
      ),
    ];
    const creators = creatorIds.length
      ? await db
          .select({ id: user.id, name: user.name, email: user.email })
          .from(user)
          .where(inArray(user.id, creatorIds))
      : [];
    const creatorMap = new Map(creators.map(creator => [creator.id, creator]));

    const keys: AdminApiKeyData[] = rows.map(row => {
      const ownerType = row.configId === ORG_API_KEY_CONFIG_ID ? "organization" : "user";
      const creatorId = ownerType === "organization" ? createdByFromMetadata(row.metadata) : null;
      const creator = creatorId ? creatorMap.get(creatorId) : undefined;
      return {
        id: row.id,
        name: row.name,
        start: row.start,
        ownerType,
        ownerId: row.referenceId,
        ownerName: ownerType === "organization" ? row.organizationName : row.userName,
        ownerEmail: ownerType === "user" ? row.userEmail : null,
        createdBy: creatorId ? { id: creatorId, name: creator?.name ?? null, email: creator?.email ?? null } : null,
        enabled: row.enabled,
        permissions: parsePermissions(row.permissions),
        expiresAt: row.expiresAt,
        lastRequest: row.lastRequest,
        createdAt: row.createdAt,
      };
    });

    return reply.send(keys);
  } catch (error) {
    request.log.error({ err: error }, "Failed to list admin API keys");
    return reply.status(500).send({ error: "Failed to load API keys" });
  }
}

const updateApiKeySchema = z.object({ enabled: z.boolean() }).strict();

// better-auth reads the key row on every verification (database storage, no
// secondary cache), so enabling/disabling or deleting here takes effect on the
// key's next request.
export async function updateAdminApiKey(
  request: FastifyRequest<{ Params: { keyId: string }; Body: { enabled: boolean } }>,
  reply: FastifyReply
) {
  const parsed = updateApiKeySchema.safeParse(request.body);
  if (!parsed.success) {
    return reply.status(400).send({ error: "Invalid request body", details: parsed.error.flatten() });
  }

  try {
    const [updated] = await db
      .update(apiKey)
      .set({ enabled: parsed.data.enabled, updatedAt: new Date().toISOString() })
      .where(eq(apiKey.id, request.params.keyId))
      .returning({ id: apiKey.id, enabled: apiKey.enabled });
    if (!updated) {
      return reply.status(404).send({ error: "API key not found" });
    }
    request.log.info({ keyId: updated.id, enabled: updated.enabled }, "Admin updated API key");
    return reply.send(updated);
  } catch (error) {
    request.log.error({ err: error }, "Failed to update admin API key");
    return reply.status(500).send({ error: "Failed to update API key" });
  }
}

export async function deleteAdminApiKey(request: FastifyRequest<{ Params: { keyId: string } }>, reply: FastifyReply) {
  try {
    const [deleted] = await db.delete(apiKey).where(eq(apiKey.id, request.params.keyId)).returning({ id: apiKey.id });
    if (!deleted) {
      return reply.status(404).send({ error: "API key not found" });
    }
    request.log.info({ keyId: deleted.id }, "Admin deleted API key");
    return reply.send({ success: true });
  } catch (error) {
    request.log.error({ err: error }, "Failed to delete admin API key");
    return reply.status(500).send({ error: "Failed to delete API key" });
  }
}
