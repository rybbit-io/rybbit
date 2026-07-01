const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_OPENROUTER_MODEL = "moonshotai/kimi-k2.6";

interface OpenRouterResponse {
  id?: string;
  model?: string;
  provider?: string;
  choices?: Array<{
    message?: {
      role?: string;
      content?: string | null;
    };
    finish_reason?: string | null;
    native_finish_reason?: string | null;
  }>;
  usage?: unknown;
  error?: unknown;
}

export type OpenRouterErrorCode = "missing_api_key" | "http_error" | "invalid_json" | "empty_choices" | "empty_content";

export type OpenRouterMetadata = {
  model: string;
  responseModel?: string;
  responseId?: string;
  requestId?: string;
  provider?: string;
  status?: number;
  statusText?: string;
  choiceCount?: number;
  finishReason?: string | null;
  nativeFinishReason?: string | null;
  usage?: unknown;
  responseError?: unknown;
  responseBodyPreview?: string;
  contentType?: string;
  contentLength?: number;
  messageRole?: string;
  messageContentType?: string;
  messageContentLength?: number;
};

type OpenRouterOptions = {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  signal?: AbortSignal;
};

export class OpenRouterError extends Error {
  code: OpenRouterErrorCode;
  details: OpenRouterMetadata;

  constructor(code: OpenRouterErrorCode, message: string, details: OpenRouterMetadata) {
    super(message);
    this.name = "OpenRouterError";
    this.code = code;
    this.details = details;
  }
}

function truncateForLog(value: string, maxLength = 1000) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function getResponseHeader(response: Response, header: string) {
  return (response as Response & { headers?: { get?: (name: string) => string | null } }).headers?.get?.(header);
}

export function getOpenRouterModel(model?: string) {
  return model || process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL;
}

export async function callOpenRouter(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: OpenRouterOptions
): Promise<string> {
  const response = await callOpenRouterWithMetadata(messages, options);
  return response.content;
}

export async function callOpenRouterWithMetadata(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  options?: OpenRouterOptions
): Promise<{ content: string; metadata: OpenRouterMetadata }> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = getOpenRouterModel(options?.model);

  if (!apiKey) {
    throw new OpenRouterError("missing_api_key", "OPENROUTER_API_KEY is not configured", { model });
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://rybbit.com",
      "X-Title": "Rybbit Analytics",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: options?.maxTokens ?? 1000,
    }),
    signal: options?.signal,
  });
  const baseMetadata: OpenRouterMetadata = {
    model,
    status: response.status,
    statusText: response.statusText,
    requestId:
      getResponseHeader(response, "x-request-id") ??
      getResponseHeader(response, "x-openrouter-request-id") ??
      getResponseHeader(response, "cf-ray") ??
      undefined,
    contentType: getResponseHeader(response, "content-type") ?? undefined,
    contentLength: Number(getResponseHeader(response, "content-length")) || undefined,
  };

  if (!response.ok) {
    const responseBody = await response.text().catch(() => "");
    throw new OpenRouterError("http_error", `OpenRouter API error: ${response.status}`, {
      ...baseMetadata,
      responseBodyPreview: truncateForLog(responseBody),
    });
  }

  let data: OpenRouterResponse;
  try {
    data = (await response.json()) as OpenRouterResponse;
  } catch (error) {
    throw new OpenRouterError("invalid_json", "OpenRouter returned invalid JSON", {
      ...baseMetadata,
      responseError: error instanceof Error ? error.message : String(error),
    });
  }

  if (!data.choices || data.choices.length === 0) {
    throw new OpenRouterError("empty_choices", "No response from OpenRouter", {
      ...baseMetadata,
      responseId: data.id,
      responseModel: data.model,
      provider: data.provider,
      choiceCount: data.choices?.length ?? 0,
      usage: data.usage,
      responseError: data.error,
    });
  }

  const choice = data.choices[0];
  const content = choice.message?.content;
  const metadata: OpenRouterMetadata = {
    ...baseMetadata,
    responseId: data.id,
    responseModel: data.model,
    provider: data.provider,
    choiceCount: data.choices.length,
    finishReason: choice.finish_reason,
    nativeFinishReason: choice.native_finish_reason,
    usage: data.usage,
    responseError: data.error,
    messageRole: choice.message?.role,
    messageContentType: Array.isArray(content) ? "array" : typeof content,
    messageContentLength: typeof content === "string" ? content.length : undefined,
  };

  if (typeof content !== "string" || content.trim().length === 0) {
    throw new OpenRouterError(
      "empty_content",
      `OpenRouter returned an empty response${choice.finish_reason ? ` (${choice.finish_reason})` : ""}`,
      metadata
    );
  }

  return { content, metadata };
}
