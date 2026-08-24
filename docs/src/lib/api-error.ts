export interface ApiErrorBody {
  code: string;
  details?: unknown;
  error: string;
  message: string;
  resolution: string;
}

interface ApiErrorInput {
  code: string;
  details?: unknown;
  message: string;
  resolution: string;
}

export function createApiError(input: ApiErrorInput): ApiErrorBody {
  return {
    error: input.message,
    code: input.code,
    message: input.message,
    resolution: input.resolution,
    ...(input.details === undefined ? {} : { details: input.details }),
  };
}

export function jsonError(status: number, body: ApiErrorBody, headers?: HeadersInit): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Content-Type", "application/json; charset=utf-8");
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");

  return new Response(`${JSON.stringify(body)}\n`, {
    status,
    headers: responseHeaders,
  });
}
