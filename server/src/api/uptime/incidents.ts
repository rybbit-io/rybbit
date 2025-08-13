import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { db } from "../../db/postgres/postgres.js";
import { uptimeIncidents, uptimeMonitors } from "../../db/postgres/schema.js";
import { getSessionFromReq } from "../../lib/auth-utils.js";
import { getUserOrganizations } from "./utils.js";

// Schemas
const incidentStatusSchema = z.enum(["active", "acknowledged", "resolved", "all"]);

const getIncidentsQuerySchema = z.object({
  status: incidentStatusSchema.default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const incidentIdParamsSchema = z.object({
  id: z.coerce.number().int(),
});

const incidentSchema = z.object({
  id: z.number(),
  organizationId: z.string(),
  monitorId: z.number(),
  monitorName: z.string(),
  region: z.string().nullable(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  status: z.string(),
  acknowledgedBy: z.string().nullable(),
  acknowledgedAt: z.string().nullable(),
  resolvedBy: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  lastError: z.string().nullable(),
  lastErrorType: z.string().nullable(),
  failureCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const incidentsRoutes = async (server: FastifyInstance) => {
  // Get incidents
  server.route({
    method: "GET",
    url: "/api/uptime/incidents",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      const query = getIncidentsQuerySchema.parse(request.query);
      const { status, limit, offset } = query;

      // Build where conditions
      const conditions = [inArray(uptimeIncidents.organizationId, organizationIds)];

      if (status !== "all") {
        conditions.push(eq(uptimeIncidents.status, status));
      }

      // Use SQL to group incidents by monitor and aggregate regions
      const groupedIncidents = await db
        .select({
          id: sql<number>`MIN(${uptimeIncidents.id})`,
          organizationId: sql<string>`MIN(${uptimeIncidents.organizationId})`,
          monitorId: uptimeIncidents.monitorId,
          monitorName: sql<string>`
            CASE 
              WHEN ${uptimeMonitors.name} IS NOT NULL AND ${uptimeMonitors.name} != '' THEN ${uptimeMonitors.name}
              WHEN ${uptimeMonitors.monitorType} = 'http' THEN COALESCE(${uptimeMonitors.httpConfig}->>'url', 'HTTP Monitor')
              WHEN ${uptimeMonitors.monitorType} = 'tcp' THEN CONCAT(${uptimeMonitors.tcpConfig}->>'host', ':', ${uptimeMonitors.tcpConfig}->>'port')
              ELSE 'Unknown Monitor'
            END
          `,
          affectedRegions: sql<string[]>`ARRAY_REMOVE(ARRAY_AGG(DISTINCT ${uptimeIncidents.region} ORDER BY ${uptimeIncidents.region}), NULL)`,
          startTime: sql<string>`MIN(${uptimeIncidents.startTime})`,
          endTime: sql<string>`MAX(${uptimeIncidents.endTime})`,
          status: uptimeIncidents.status,
          acknowledgedBy: sql<string>`MAX(${uptimeIncidents.acknowledgedBy})`,
          acknowledgedAt: sql<string>`MAX(${uptimeIncidents.acknowledgedAt})`,
          resolvedBy: sql<string>`MAX(${uptimeIncidents.resolvedBy})`,
          resolvedAt: sql<string>`MAX(${uptimeIncidents.resolvedAt})`,
          lastError: sql<string>`(ARRAY_AGG(${uptimeIncidents.lastError} ORDER BY ${uptimeIncidents.updatedAt} DESC))[1]`,
          lastErrorType: sql<string>`(ARRAY_AGG(${uptimeIncidents.lastErrorType} ORDER BY ${uptimeIncidents.updatedAt} DESC))[1]`,
          failureCount: sql<number>`SUM(${uptimeIncidents.failureCount})`,
          createdAt: sql<string>`MIN(${uptimeIncidents.createdAt})`,
          updatedAt: sql<string>`MAX(${uptimeIncidents.updatedAt})`,
        })
        .from(uptimeIncidents)
        .leftJoin(uptimeMonitors, eq(uptimeIncidents.monitorId, uptimeMonitors.id))
        .where(and(...conditions))
        .groupBy(
          uptimeIncidents.monitorId,
          uptimeIncidents.status,
          sql`CASE 
            WHEN ${uptimeIncidents.status} = 'resolved' THEN 
              DATE_TRUNC('hour', ${uptimeIncidents.endTime})
            ELSE 
              NULL
          END`,
          uptimeMonitors.name,
          uptimeMonitors.monitorType,
          uptimeMonitors.httpConfig,
          uptimeMonitors.tcpConfig
        )
        .orderBy(desc(sql`MIN(${uptimeIncidents.startTime})`))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({
          count: sql<number>`COUNT(DISTINCT 
            CONCAT(
              ${uptimeIncidents.monitorId}, 
              '-', 
              ${uptimeIncidents.status},
              '-',
              CASE 
                WHEN ${uptimeIncidents.status} = 'resolved' THEN 
                  DATE_TRUNC('hour', ${uptimeIncidents.endTime})::text
                ELSE 
                  ''
              END
            )
          )`,
        })
        .from(uptimeIncidents)
        .where(and(...conditions));

      const total = Number(totalCountResult[0]?.count || 0);

      return reply.send({
        incidents: groupedIncidents,
        pagination: {
          total,
          limit,
          offset,
        },
      });
    },
  });

  // Acknowledge incident
  server.route({
    method: "PATCH",
    url: "/api/uptime/incidents/:id/acknowledge",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const params = incidentIdParamsSchema.parse(request.params);
      const { id } = params;

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      // Verify incident belongs to user's organization
      const incident = await db
        .select()
        .from(uptimeIncidents)
        .where(and(eq(uptimeIncidents.id, id), inArray(uptimeIncidents.organizationId, organizationIds)))
        .limit(1);

      if (!incident[0]) {
        return reply.code(404).send({ error: "Incident not found" });
      }

      if (incident[0].status === "resolved") {
        return reply.code(400).send({ error: "Cannot acknowledge resolved incident" });
      }

      // Update incident
      const now = new Date().toISOString();
      const [updated] = await db
        .update(uptimeIncidents)
        .set({
          status: "acknowledged",
          acknowledgedBy: userId,
          acknowledgedAt: now,
          updatedAt: now,
        })
        .where(eq(uptimeIncidents.id, id))
        .returning({
          id: uptimeIncidents.id,
          status: uptimeIncidents.status,
          acknowledgedBy: uptimeIncidents.acknowledgedBy,
          acknowledgedAt: uptimeIncidents.acknowledgedAt,
        });

      return reply.send({
        success: true,
        incident: updated,
      });
    },
  });

  // Resolve incident
  server.route({
    method: "PATCH",
    url: "/api/uptime/incidents/:id/resolve",
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await getSessionFromReq(request);
      const userId = session?.user?.id;

      if (!userId) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const params = incidentIdParamsSchema.parse(request.params);
      const { id } = params;

      // Get user's organizations
      const organizationIds = await getUserOrganizations(userId);

      if (organizationIds.length === 0) {
        return reply.status(403).send({ error: "No organization access" });
      }

      // Verify incident belongs to user's organization
      const incident = await db
        .select()
        .from(uptimeIncidents)
        .where(and(eq(uptimeIncidents.id, id), inArray(uptimeIncidents.organizationId, organizationIds)))
        .limit(1);

      if (!incident[0]) {
        return reply.code(404).send({ error: "Incident not found" });
      }

      if (incident[0].status === "resolved") {
        return reply.code(400).send({ error: "Incident already resolved" });
      }

      // Update incident
      const now = new Date().toISOString();
      const [updated] = await db
        .update(uptimeIncidents)
        .set({
          status: "resolved",
          resolvedBy: userId,
          resolvedAt: now,
          endTime: now,
          updatedAt: now,
        })
        .where(eq(uptimeIncidents.id, id))
        .returning({
          id: uptimeIncidents.id,
          status: uptimeIncidents.status,
          resolvedBy: uptimeIncidents.resolvedBy,
          resolvedAt: uptimeIncidents.resolvedAt,
          endTime: uptimeIncidents.endTime,
        });

      return reply.send({
        success: true,
        incident: updated,
      });
    },
  });
};

