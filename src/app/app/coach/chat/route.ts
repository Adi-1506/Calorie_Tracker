import { getApiUser } from "@/lib/auth";
import { aiFailure, recordAiTokens, startAiRequest } from "@/lib/ai/access";
import { buildCoachContext, cleanReply, coachRequestSchema, coachSystemPrompt, redactPii } from "@/lib/ai/coach";
import { aiConfigured, generate } from "@/lib/ai/provider";
import { getCoachDay } from "@/lib/data/coach";
import { getProfile } from "@/lib/data/profile";
import { isSameOrigin } from "@/lib/security/same-origin";

// AI coach (step 3d). The conversation lives in the browser only; each request
// carries the last few messages plus today's numbers, and nothing is stored.

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return json(403, "Forbidden");
  const length = Number(request.headers.get("content-length"));
  if (!length || length > 32 * 1024) return json(413, "That conversation is too long. Start a new one.");

  const { user, supabase } = await getApiUser();
  if (!user) return json(401, "Please log in again.");
  if (!aiConfigured()) return json(503, "AI features aren't set up on this site yet.");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, "Invalid request.");
  }
  const parsed = coachRequestSchema.safeParse(body);
  if (!parsed.success) return json(400, "Messages can be up to 1,000 characters.");

  const profile = await getProfile(supabase, user.id);
  if (!profile?.onboarding_completed_at) return json(409, "Finish setting up your profile first.");

  const gate = await startAiRequest(supabase, user.id, "coach");
  if (!gate.ok) return json(gate.status, gate.error);

  // The conversation sent to the model must start with a user turn.
  const history = parsed.data.messages.slice(parsed.data.messages.findIndex((m) => m.role === "user"));
  const context = buildCoachContext(await getCoachDay(supabase, profile));
  try {
    const result = await generate({
      system: coachSystemPrompt(context),
      messages: history.map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.role === "user" ? redactPii(m.text) : m.text }],
      })),
      maxOutputTokens: 2048,
      temperature: 0.6,
    });
    await recordAiTokens(user.id, "coach", result.tokens);
    const reply = cleanReply(result.text);
    if (!reply) return json(502, "The AI didn't answer. Please try again.");
    return Response.json({ reply });
  } catch (e) {
    const f = aiFailure(e);
    return json(f.status, f.error);
  }
}
