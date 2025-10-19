import crypto from "crypto";
import NodeCache from "node-cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/postgres/postgres.js";
import { projects } from "../../db/postgres/schema.js";
import { createServiceLogger } from "../../lib/logger/logger.js";

const logger = createServiceLogger("projects-service");

const apiKeyCache = new NodeCache({
  stdTTL: 60,
  checkperiod: 120,
  useClones: false,
});

export interface ProjectRecord {
  id: string;
  organizationId: string;
  name: string;
  apiKeyHash: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
  isActive: boolean;
}

const API_KEY_PREFIX = "rbp_";
const API_KEY_LENGTH = 48;

export function generateProjectApiKey(): { apiKey: string; apiKeyHash: string } {
  const rawKey = crypto.randomBytes(API_KEY_LENGTH / 2).toString("hex"); // 48 chars hex
  const apiKey = `${API_KEY_PREFIX}${rawKey}`;
  return { apiKey, apiKeyHash: hashSecret(apiKey) };
}

export function hashSecret(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function hashIdentifier(value: string | null | undefined): string | null {
  return value ? hashSecret(value) : null;
}

export async function getProjectById(projectId: string): Promise<ProjectRecord | null> {
  const [record] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  return record ? mapProjectRecord(record) : null;
}

export async function getProjectByApiKey(apiKey: string): Promise<ProjectRecord | null> {
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    logger.warn({ apiKeyPrefix: apiKey.slice(0, 5) }, "Invalid API key prefix");
    return null;
  }

  const cacheHit = apiKeyCache.get<ProjectRecord>(apiKey);
  if (cacheHit) {
    return cacheHit;
  }

  const apiKeyHash = hashSecret(apiKey);

  try {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.apiKeyHash, apiKeyHash), eq(projects.isActive, true)))
      .limit(1);

    if (!project) {
      return null;
    }

    const formatted = mapProjectRecord(project);

    apiKeyCache.set(apiKey, formatted);
    return formatted;
  } catch (error) {
    logger.error(error, "Failed to fetch project by API key");
    return null;
  }
}

export async function createProject(params: {
  organizationId: string;
  name: string;
  metadata?: Record<string, unknown>;
}): Promise<{ project: ProjectRecord; apiKey: string }> {
  const { apiKey, apiKeyHash } = generateProjectApiKey();

  const [record] = await db
    .insert(projects)
    .values({
      organizationId: params.organizationId,
      name: params.name,
      apiKeyHash,
      metadata: params.metadata ?? {},
    })
    .returning();

  const project = mapProjectRecord(record);

  return { project, apiKey };
}

export async function deactivateProject(projectId: string): Promise<void> {
  await db.update(projects).set({ isActive: false }).where(eq(projects.id, projectId));
}

/**
 * Get or create a Project linked to a Site (for API v1 usage with rb_* keys)
 */
export async function getOrCreateProjectForSite(siteId: number, organizationId: string): Promise<ProjectRecord> {
  // Look for existing project linked to this site
  const [existing] = await db
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.organizationId, organizationId),
        sql`${projects.metadata}->>'siteId' = ${String(siteId)}`
      )
    )
    .limit(1);

  if (existing) {
    return mapProjectRecord(existing);
  }

  // Create a new project for this site
  const { apiKey, apiKeyHash } = generateProjectApiKey();

  const [record] = await db
    .insert(projects)
    .values({
      organizationId,
      name: `Site ${siteId} API v1`,
      apiKeyHash,
      metadata: { siteId, apiKey },  // Store the API key in metadata for reference
    })
    .returning();

  return mapProjectRecord(record);
}

export async function rotateProjectApiKey(projectId: string): Promise<{ apiKey: string }> {
  const { apiKey, apiKeyHash } = generateProjectApiKey();
  await db.update(projects).set({ apiKeyHash }).where(eq(projects.id, projectId));
  return { apiKey };
}

function mapProjectRecord(record: typeof projects.$inferSelect): ProjectRecord {
  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    apiKeyHash: record.apiKeyHash,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    metadata: (record.metadata ?? {}) as Record<string, unknown>,
    isActive: record.isActive,
  };
}
