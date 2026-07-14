import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { RybbitApiClient } from "./apiClient.js";
import { registerTools } from "./tools.js";

const INSTRUCTIONS = `Read-only access to Rybbit web analytics (traffic, pages, referrers, sessions, events, goals, funnels, errors, web vitals).
Start with list_sites to resolve numeric site IDs. Prefer the aggregated tools (get_overview, get_breakdown, ...) over run_query; use run_query only for questions they cannot answer, after reading get_query_schema. Omit time inputs to query all time, or pass start_date/end_date or past_minutes.`;

function buildMcpServer(fastify: FastifyInstance, authorization: string): McpServer {
  const server = new McpServer({ name: "rybbit", version: "0.1.0" }, { instructions: INSTRUCTIONS });
  registerTools(server, new RybbitApiClient(fastify, authorization));
  return server;
}

/**
 * Stateless Streamable HTTP MCP endpoint at POST /api/mcp.
 *
 * Each request gets a fresh McpServer + transport (no session state), so the
 * endpoint scales horizontally and works identically on cloud and self-hosted
 * instances. Auth is the same user API key the REST API accepts, sent as
 * 'Authorization: Bearer <key>'; tool calls are dispatched to the existing
 * routes in-process and inherit their access checks and rate limits.
 */
export async function mcpRoutes(fastify: FastifyInstance) {
  fastify.post("/mcp", async (request: FastifyRequest, reply: FastifyReply) => {
    const authorization = request.headers.authorization;
    if (!authorization) {
      return reply
        .status(401)
        .header("WWW-Authenticate", 'Bearer realm="rybbit-mcp"')
        .send({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message:
              "Unauthorized: send a Rybbit API key as 'Authorization: Bearer <key>'. Create one under Settings > Account > API Keys.",
          },
          id: null,
        });
    }

    const server = buildMcpServer(fastify, authorization);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    // The transport writes directly to the raw response; keep Fastify out of it.
    reply.hijack();
    reply.raw.on("close", () => {
      transport.close();
      server.close();
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      request.log.error(error, "MCP request failed");
      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "content-type": "application/json" });
        reply.raw.end(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null })
        );
      } else {
        reply.raw.end();
      }
    }
  });

  // Stateless server: no SSE notification stream to GET, no session to DELETE.
  const methodNotAllowed = async (_request: FastifyRequest, reply: FastifyReply) =>
    reply
      .status(405)
      .header("Allow", "POST")
      .send({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed. This MCP server is stateless: send POST requests." },
        id: null,
      });
  fastify.get("/mcp", methodNotAllowed);
  fastify.delete("/mcp", methodNotAllowed);
}
