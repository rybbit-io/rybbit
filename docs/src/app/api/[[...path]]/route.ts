import { createApiError, jsonError } from "@/lib/api-error";

interface RouteContext {
  params: Promise<{ path?: string[] }>;
}

async function notFound(request: Request, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params;
  const pathname = `/api/${path.join("/")}`.replace(/\/$/, "") || "/api";

  return jsonError(
    404,
    createApiError({
      code: "API_ROUTE_NOT_FOUND",
      message: `No API route matches ${request.method} ${pathname}.`,
      resolution: "Read https://rybbit.com/openapi.json and choose a documented operation.",
      details: { method: request.method, path: pathname },
    })
  );
}

export { notFound as DELETE, notFound as GET, notFound as PATCH, notFound as POST, notFound as PUT };
