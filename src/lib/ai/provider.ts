import "server-only";
import { serverEnv } from "@/lib/env.server";

// The one place that talks to an AI provider (security items 35-37). Swapping
// to a paid tier or another provider means changing only this file.
// Currently Google Gemini (free tier), called over REST with fetch.

export type AiPart = { text: string } | { image: { mimeType: "image/webp" | "image/jpeg" | "image/png"; base64: string } };
export type AiMessage = { role: "user" | "model"; parts: AiPart[] };

export type AiRequest = {
  system: string;
  messages: AiMessage[];
  /** OpenAPI-style schema; when given the provider is asked for JSON matching it. */
  jsonSchema?: Record<string, unknown>;
  maxOutputTokens: number;
  temperature?: number;
};

export type AiResult = { text: string; tokens: number };

export class AiError extends Error {
  constructor(public readonly kind: "not_configured" | "blocked" | "busy" | "failed") {
    super(`AI request failed: ${kind}`);
  }
}

const DEFAULT_MODEL = "gemini-flash-latest";
const DEFAULT_BASE = "https://generativelanguage.googleapis.com";
const TIMEOUT_MS = 30_000;

export function aiConfigured() {
  return Boolean(serverEnv().geminiApiKey);
}

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { totalTokenCount?: number };
};

export function toGeminiBody(req: AiRequest) {
  return {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: req.messages.map((m) => ({
      role: m.role,
      parts: m.parts.map((p) => ("text" in p ? { text: p.text } : { inlineData: { mimeType: p.image.mimeType, data: p.image.base64 } })),
    })),
    generationConfig: {
      maxOutputTokens: req.maxOutputTokens,
      temperature: req.temperature ?? 0.4,
      ...(req.jsonSchema ? { responseMimeType: "application/json", responseSchema: req.jsonSchema } : {}),
    },
  };
}

export function fromGeminiResponse(data: GeminiResponse): AiResult {
  if (data.promptFeedback?.blockReason) throw new AiError("blocked");
  const candidate = data.candidates?.[0];
  if (!candidate) throw new AiError("failed");
  if (candidate.finishReason && ["SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII", "RECITATION"].includes(candidate.finishReason)) {
    throw new AiError("blocked");
  }
  const text = (candidate.content?.parts ?? [])
    .filter((p) => !p.thought && typeof p.text === "string")
    .map((p) => p.text)
    .join("");
  if (!text) throw new AiError("failed");
  return { text, tokens: Math.max(0, Math.round(data.usageMetadata?.totalTokenCount ?? 0)) };
}

export async function generate(req: AiRequest, fetchImpl: typeof fetch = fetch): Promise<AiResult> {
  const env = serverEnv();
  if (!env.geminiApiKey) throw new AiError("not_configured");
  const model = env.geminiModel ?? DEFAULT_MODEL;
  const base = env.geminiBaseUrl ?? DEFAULT_BASE;

  let res: Response;
  try {
    res = await fetchImpl(`${base}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      // Key in a header, not the URL, so it never lands in access logs.
      headers: { "content-type": "application/json", "x-goog-api-key": env.geminiApiKey },
      body: JSON.stringify(toGeminiBody(req)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
  } catch {
    throw new AiError("failed");
  }
  if (res.status === 429 || res.status === 503) throw new AiError("busy");
  if (!res.ok) throw new AiError("failed");
  let data: GeminiResponse;
  try {
    data = (await res.json()) as GeminiResponse;
  } catch {
    throw new AiError("failed");
  }
  return fromGeminiResponse(data);
}
