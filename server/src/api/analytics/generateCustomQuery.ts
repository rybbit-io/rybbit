import { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { getSitesUserHasAccessTo } from "../../lib/auth-utils.js";
import { OpenRouterError, callOpenRouterWithMetadata, getOpenRouterModel } from "../../lib/openrouter.js";
import { MAX_CUSTOM_QUERY_LENGTH, normalizeCustomQuery, validateScopedQuery } from "./utils/customQueryValidation.js";
import { EVENT_SCHEMA } from "./utils/eventSchema.js";

const OPENROUTER_TEMPERATURE = 0.1;
const OPENROUTER_MAX_TOKENS = 5000;
const LOG_PREVIEW_LENGTH = 500;

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


function extractSql(content: string) {
  const trimmed = content.trim();
  const fencedSql = trimmed.match(/```(?:sql)?\s*([\s\S]*?)```/i);
  const sql = fencedSql?.[1] ?? trimmed;
  return normalizeCustomQuery(sql.replace(/^sql\s*:/i, ""));
}

function truncateForLog(value: string | undefined, maxLength = LOG_PREVIEW_LENGTH) {
  if (!value) return undefined;
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function isAbortError(error: unknown) {
  if (!(error instanceof Error)) return false;
  return error.name === "AbortError" || error.message === "This operation was aborted";
}

function createRequestAbortSignal(request: FastifyRequest, reply: FastifyReply) {
  const abortController = new AbortController();
  const abort = () => {
    if (!reply.raw.writableEnded) {
      abortController.abort();
    }
  };

  request.raw.on("aborted", abort);
  reply.raw.on("close", abort);

  return {
    signal: abortController.signal,
    cleanup: () => {
      request.raw.off("aborted", abort);
      reply.raw.off("close", abort);
    },
  };
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
  const messages = [
    {
      role: "system" as const,
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
      role: "user" as const,
      content: `
Current editor query:
${currentQuery || "(empty)"}

Current user request:
${body.data.prompt}
          `.trim(),
    },
  ];
  const generationContext = {
    organizationId: request.params.organizationId,
    currentSiteId: body.data.currentSiteId,
    accessibleSiteCount: siteIds.length,
    promptLength: body.data.prompt.length,
    promptPreview: truncateForLog(body.data.prompt),
    currentQueryLength: currentQuery?.length ?? 0,
    currentQueryPreview: truncateForLog(currentQuery),
    historyCount: body.data.history.length,
    historyRoles: body.data.history.map(message => message.role),
    historyContentLengths: body.data.history.map(message => message.content.length),
    messageCount: messages.length,
    messageCharCount: messages.reduce((total, message) => total + message.content.length, 0),
    openRouterModel: getOpenRouterModel(),
    openRouterTemperature: OPENROUTER_TEMPERATURE,
    openRouterMaxTokens: OPENROUTER_MAX_TOKENS,
  };
  const requestAbort = createRequestAbortSignal(request, reply);

  try {
    request.log.info(generationContext, "Generating custom analytics query");

    const { content: generated, metadata: openRouter } = await callOpenRouterWithMetadata(messages, {
      temperature: OPENROUTER_TEMPERATURE,
      maxTokens: OPENROUTER_MAX_TOKENS,
      signal: requestAbort.signal,
    });

    request.log.info(
      {
        ...generationContext,
        openRouter,
        generatedLength: generated.length,
        generatedPreview: truncateForLog(generated),
      },
      "OpenRouter returned custom analytics query candidate"
    );

    const query = extractSql(generated);
    const validationError = validateScopedQuery(query);
    if (validationError) {
      request.log.warn(
        {
          ...generationContext,
          openRouter,
          validationError,
          queryLength: query.length,
          queryPreview: truncateForLog(query),
        },
        "Generated custom query failed validation"
      );
      return reply.status(422).send({ error: "Generated query failed validation", details: validationError });
    }

    request.log.info(
      {
        ...generationContext,
        openRouter,
        queryLength: query.length,
        queryPreview: truncateForLog(query),
      },
      "Generated custom analytics query passed validation"
    );

    return reply.send({ query });
  } catch (error) {
    if (requestAbort.signal.aborted || isAbortError(error)) {
      request.log.info(generationContext, "Custom analytics query generation aborted");
      if (reply.raw.destroyed || reply.raw.writableEnded) {
        return reply;
      }
      return reply.status(499).send({ error: "Query generation aborted" });
    }

    request.log.error(
      {
        err: error,
        ...generationContext,
        openRouter: error instanceof OpenRouterError ? error.details : undefined,
      },
      "Failed to generate custom analytics query"
    );

    if (error instanceof Error) {
      if (
        error instanceof OpenRouterError &&
        error.code === "empty_content" &&
        error.details.finishReason === "length"
      ) {
        return reply.status(502).send({
          error: "AI provider hit the output token limit before returning SQL. Try a shorter prompt or simpler query.",
        });
      }

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
  } finally {
    requestAbort.cleanup();
  }
}
