import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [k, v] of Object.entries({ SUPABASE_SERVICE_ROLE_KEY: "x", IP_HASH_SALT: "0123456789abcdef", ...env })) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return import("./provider");
}

afterEach(() => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
});

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const req = { system: "sys", messages: [{ role: "user" as const, parts: [{ text: "hi" }] }], maxOutputTokens: 100 };

describe("AI provider (Gemini)", () => {
  it("refuses when no key is configured", async () => {
    const { generate, aiConfigured } = await load({ GEMINI_API_KEY: undefined });
    expect(aiConfigured()).toBe(false);
    await expect(generate(req, vi.fn())).rejects.toMatchObject({ kind: "not_configured" });
  });

  it("sends the key in a header, never the URL, and returns text and tokens", async () => {
    const { generate } = await load({ GEMINI_API_KEY: "secret-key", GEMINI_MODEL: "gemini-test" });
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      ok({ candidates: [{ content: { parts: [{ text: "thinking", thought: true }, { text: "Hello" }] } }], usageMetadata: { totalTokenCount: 42 } }),
    );
    const result = await generate(req, fetchMock as unknown as typeof fetch);
    expect(result).toEqual({ text: "Hello", tokens: 42 });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent");
    expect(url).not.toContain("secret-key");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("secret-key");
  });

  it("maps images and JSON schemas into the request body", async () => {
    const { toGeminiBody } = await load({});
    const body = toGeminiBody({
      ...req,
      messages: [{ role: "user", parts: [{ image: { mimeType: "image/webp", base64: "AAA" } }, { text: "what?" }] }],
      jsonSchema: { type: "object" },
    });
    expect(body.contents[0].parts[0]).toEqual({ inlineData: { mimeType: "image/webp", data: "AAA" } });
    expect(body.generationConfig).toMatchObject({ responseMimeType: "application/json", responseSchema: { type: "object" } });
    expect(body.systemInstruction.parts[0].text).toBe("sys");
  });

  it("falls back to the lighter model when the default one is busy", async () => {
    const { generate } = await load({ GEMINI_API_KEY: "k" });
    const urls: string[] = [];
    const answer = { candidates: [{ content: { parts: [{ text: "hi" }] } }] };
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return urls.length === 1 ? ok({ error: { message: "overloaded" } }, 503) : ok(answer);
    }) as unknown as typeof fetch;
    await expect(generate(req, fetchImpl)).resolves.toMatchObject({ text: "hi" });
    expect(urls[0]).toContain("/models/gemini-flash-latest:");
    expect(urls[1]).toContain("/models/gemini-flash-lite-latest:");
  });

  it("uses only an explicitly configured model", async () => {
    const { generate } = await load({ GEMINI_API_KEY: "k", GEMINI_MODEL: "my-model" });
    let calls = 0;
    const fetchImpl = (async () => (calls++, ok({}, 429))) as unknown as typeof fetch;
    await expect(generate(req, fetchImpl)).rejects.toMatchObject({ kind: "busy" });
    expect(calls).toBe(1);
  });

  it("maps errors: rate limits, blocks and empty answers", async () => {
    const { generate } = await load({ GEMINI_API_KEY: "k" });
    await expect(generate(req, (async () => ok({}, 429)) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "busy" });
    await expect(generate(req, (async () => ok({}, 500)) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "failed" });
    await expect(generate(req, (async () => ok({ promptFeedback: { blockReason: "SAFETY" } })) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "blocked" });
    await expect(generate(req, (async () => ok({ candidates: [{ finishReason: "SAFETY" }] })) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "blocked" });
    await expect(generate(req, (async () => ok({ candidates: [{ content: { parts: [] } }] })) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "failed" });
    await expect(generate(req, (async () => { throw new Error("network"); }) as unknown as typeof fetch)).rejects.toMatchObject({ kind: "failed" });
  });
});
