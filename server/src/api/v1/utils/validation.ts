import { FastifyReply, FastifyRequest } from "fastify";
import { ZodSchema } from "zod";

/**
 * Validates request data against a Zod schema and returns 400 on error
 * Eliminates repetitive validation boilerplate across all v1 endpoints
 */
export function validateRequest<T>(
  data: unknown,
  schema: ZodSchema<T>,
  reply: FastifyReply
): T | null {
  const parsed = schema.safeParse(data);

  if (!parsed.success) {
    reply.status(400).send({
      error: "Invalid request data",
      details: parsed.error.issues,
    });
    return null;
  }

  return parsed.data;
}

/**
 * Validates that project context exists on request
 * Replaces 15+ duplicate checks across v1 endpoints
 */
export function validateProjectContext(
  request: FastifyRequest,
  reply: FastifyReply
): boolean {
  if (!(request as any).project) {
    reply.status(500).send({ error: "Project context missing" });
    return false;
  }
  return true;
}

/**
 * Combined validation: project context + query/body schema
 * One-liner replacement for common validation patterns
 */
export function validateProjectAndRequest<T>(
  request: FastifyRequest,
  reply: FastifyReply,
  schema: ZodSchema<T>,
  dataSource: "query" | "body" = "query"
): { project: any; data: T } | null {
  if (!validateProjectContext(request, reply)) {
    return null;
  }

  const data = validateRequest(
    dataSource === "query" ? request.query : request.body,
    schema,
    reply
  );

  if (!data) {
    return null;
  }

  return {
    project: (request as any).project,
    data,
  };
}
