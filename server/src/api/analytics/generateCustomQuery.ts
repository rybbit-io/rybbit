import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { callOpenRouter } from "../../lib/openrouter.js";
import { MAX_CUSTOM_QUERY_LENGTH, normalizeCustomQuery, validateScopedQuery } from "./utils/customQueryValidation.js";

const generationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(MAX_CUSTOM_QUERY_LENGTH),
});

const requestBodySchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
  currentSiteId: z.number().int().positive().optional(),
  currentQuery: z.string().trim().max(MAX_CUSTOM_QUERY_LENGTH).optional(),
  history: z.array(generationMessageSchema).max(12).optional().default([]),
});

const EVENT_SCHEMA = `
scoped_events columns:
- site_id UInt16
- timestamp DateTime
- session_id String
- user_id String
- hostname String
- pathname String
- querystring String
- url_parameters Map(String, String)
- page_title String
- referrer String
- channel String
- browser String
- browser_version String
- operating_system String
- operating_system_version String
- language String
- country FixedString(2)
- region String
- city String
- lat Float64
- lon Float64
- screen_width UInt16
- screen_height UInt16
- device_type String
- type String
- event_name String
- props JSON
`;

function extractSql(content: string) {
  const trimmed = content.trim();
  const fencedSql = trimmed.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  const sql = fencedSql?.[1] ?? trimmed;
  return normalizeCustomQuery(sql.replace(/^sql\s*:/i, ""));
}

export async function generateCustomQuery(
  request: FastifyRequest<{
    Params: {
      organizationId: string;
    };
    Body: unknown;
  }>,
  reply: FastifyReply
) {
  const body = requestBodySchema.safeParse(request.body);
  if (!body.success) {
    return reply.status(400).send({ error: body.error.errors[0]?.message ?? "Invalid request body" });
  }

  const userSites = await getSitesUserHasAccessTo(request);
  const siteIds = userSites
    .filter(site => site.organizationId === request.params.organizationId)
    .map(site => site.siteId);

  if (siteIds.length === 0) {
    return reply.status(403).send({ error: "No access to organization or no sites found" });
  }

  if (body.data.currentSiteId && !siteIds.includes(body.data.currentSiteId)) {
    return reply.status(403).send({ error: "No access to current site" });
  }

  const currentSiteInstruction = body.data.currentSiteId
    ? `The user is currently viewing site_id ${body.data.currentSiteId}. If they say "this site" or do not ask for an organization-wide result, include WHERE site_id = ${body.data.currentSiteId}.`
    : "The query can summarize all accessible sites unless the prompt asks for a specific site_id.";
  const currentQuery = body.data.currentQuery?.trim();
  const previousMessages = body.data.history.slice(-10).map(message => ({
    role: message.role,
    content:
      message.role === "assistant"
        ? `Previously generated SQL:\n${message.content}`
        : `Previous user request:\n${message.content}`,
  }));

  try {
    const generated = await callOpenRouter(
      [
        {
          role: "system",
          content: `
You generate ClickHouse SQL for Rybbit custom analytics.
Return exactly one SQL query and no Markdown, explanation, comments, or semicolon.
The query must be a SELECT or WITH ... SELECT query.
The only readable table is scoped_events. Never read from events or any other table.
Never define or shadow scoped_events.
Use ClickHouse syntax.
Use LIMIT 1000 or smaller for detail/list queries.
For custom event properties, use JSONExtractString(toString(props), 'property_name').
Use the previous messages and current editor query as context.
If the user asks an incremental follow-up, revise the current editor query.
If the user clearly asks for a new query, a different analysis, or to start over, generate a fresh query.
If the current editor query is empty, generate a fresh query.
${currentSiteInstruction}
${EVENT_SCHEMA}

Good examples:
SELECT pathname, countIf(type = 'pageview') AS pageviews FROM scoped_events GROUP BY pathname ORDER BY pageviews DESC LIMIT 100
SELECT event_name, count() AS events FROM scoped_events WHERE type = 'custom_event' GROUP BY event_name ORDER BY events DESC LIMIT 100
SELECT toStartOfDay(timestamp) AS day, count() AS events FROM scoped_events GROUP BY day ORDER BY day ASC LIMIT 1000
          `.trim(),
        },
        ...previousMessages,
        {
          role: "user",
          content: `
Current editor query:
${currentQuery || "(empty)"}

Current user request:
${body.data.prompt}
          `.trim(),
        },
      ],
      {
        temperature: 0.1,
        maxTokens: 900,
      }
    );

    const query = extractSql(generated);
    const validationError = validateScopedQuery(query);
    if (validationError) {
      request.log.warn({ validationError, query }, "Generated custom query failed validation");
      return reply.status(422).send({ error: "Generated query failed validation", details: validationError });
    }

    return reply.send({ query });
  } catch (error) {
    request.log.error(error, "Failed to generate custom analytics query");

    if (error instanceof Error) {
      if (
        error.message === "No response from OpenRouter" ||
        error.message.startsWith("OpenRouter returned an empty response")
      ) {
        return reply.status(502).send({ error: "AI provider returned an empty response. Try again." });
      }

      if (error.message.startsWith("OpenRouter API error")) {
        return reply.status(502).send({ error: "AI query generation provider error" });
      }

      if (error.message === "OPENROUTER_API_KEY is not configured") {
        return reply.status(500).send({ error: "AI query generation is not configured" });
      }
    }

    return reply.status(500).send({ error: "Failed to generate query" });
  }
}
