const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant";
  content: string | OpenRouterContentPart[];
}

export interface OpenRouterContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface OpenRouterImageResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content?: string;
      images?: Array<{
        type: string;
        image_url: {
          url: string;
        };
      }>;
    };
    finish_reason: string;
  }>;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callOpenRouter(
  messages: OpenRouterMessage[],
  options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model || process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rybbit.com",
        "X-Title": "Rybbit Analytics Tools",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenRouterResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenRouter");
    }

    return data.choices[0].message.content as string;
  } catch (error) {
    console.error("OpenRouter error:", error);
    throw error;
  }
}

export async function callOpenRouterImage(
  prompt: string,
  options?: {
    model?: string;
  }
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = options?.model || "google/gemini-2.5-flash-image-preview";

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://rybbit.com",
        "X-Title": "Rybbit Analytics Tools",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as OpenRouterImageResponse;

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response from OpenRouter");
    }

    // Images are returned in message.images array
    const images = data.choices[0].message.images;
    if (images && images.length > 0 && images[0].image_url?.url) {
      return images[0].image_url.url;
    }

    throw new Error("No image found in response");
  } catch (error) {
    console.error("OpenRouter image error:", error);
    throw error;
  }
}
