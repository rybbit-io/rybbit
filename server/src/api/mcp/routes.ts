import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { FastifyInstance, FastifyReply } from "fastify";

import { authenticateMcpRequest, McpAuthenticationError, type McpAuthenticator } from "./auth.js";
import { createRybbitMcpServer } from "./server.js";

export interface McpRouteOptions {
  authenticate?: McpAuthenticator;
  createServer?: typeof createRybbitMcpServer;
}

function sendMethodNotAllowed(reply: FastifyReply) {
  return reply
    .header("Allow", "POST")
    .status(405)
    .send({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Method not allowed. Use POST for this stateless MCP endpoint." },
      id: null,
    });
}

export async function mcpRoutes(fastify: FastifyInstance, options: McpRouteOptions = {}) {
  const authenticate = options.authenticate ?? authenticateMcpRequest;
  const createServer = options.createServer ?? createRybbitMcpServer;

  fastify.post("/mcp", { bodyLimit: 1024 * 1024 }, async (request, reply) => {
    // Keep authentication failures and aggregate analytics responses out of caches.
    // The transport preserves this header in stateless JSON-response mode.
    reply.raw.setHeader("Cache-Control", "no-store");
    let context;
    try {
      context = await authenticate(request);
    } catch (error) {
      if (error instanceof McpAuthenticationError) {
        if (error.statusCode === 401) {
          reply.header("WWW-Authenticate", 'Bearer realm="rybbit-mcp"');
        } else {
          reply.header("Retry-After", error.statusCode === 429 ? "60" : "30");
        }
        return reply.status(error.statusCode).send({ error: error.message });
      }

      request.log.error({ err: error }, "Failed to authenticate Rybbit MCP request");
      return reply.status(500).send({ error: "MCP authentication failed" });
    }

    const server = createServer(context, { logger: request.log });
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      void transport.close();
      void server.close();
    };

    try {
      await server.connect(transport);
      reply.hijack();
      reply.raw.on("close", close);
      await transport.handleRequest(request.raw, reply.raw, request.body);
    } catch (error) {
      request.log.error({ err: error, userId: context.userId }, "Failed to handle Rybbit MCP request");
      close();

      if (!reply.raw.headersSent) {
        reply.raw.writeHead(500, { "Content-Type": "application/json" });
        reply.raw.end(
          JSON.stringify({
            jsonrpc: "2.0",
            error: { code: -32603, message: "Internal MCP server error" },
            id: null,
          })
        );
      }
    }
  });

  fastify.get("/mcp", (_request, reply) => sendMethodNotAllowed(reply));
  fastify.delete("/mcp", (_request, reply) => sendMethodNotAllowed(reply));
}
