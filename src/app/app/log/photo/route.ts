import { getApiUser } from "@/lib/auth";
import { aiFailure, recordAiTokens, startAiRequest } from "@/lib/ai/access";
import { MEAL_PHOTO_JSON_SCHEMA, MEAL_PHOTO_PROMPT, MEAL_PHOTO_SYSTEM, parseMealPhoto, type FoodMatch, type PhotoItem, type PhotoResult } from "@/lib/ai/meal-photo";
import { aiConfigured, generate } from "@/lib/ai/provider";
import { detectImageType, MAX_UPLOAD_BYTES, sanitizeImage } from "@/lib/images/sanitize";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/same-origin";

// Meal photo → foods (step 3d). Same upload checks as progress photos, then the
// image is shrunk and re-encoded (no EXIF/GPS) and sent to the AI. The photo is
// never stored. Nothing is logged here: the user reviews the list first.

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return json(403, "Forbidden");
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_UPLOAD_BYTES + 64 * 1024) return json(413, "Photos can be up to 5 MB.");

  const { user, supabase } = await getApiUser();
  if (!user) return json(401, "Please log in again.");
  if (!aiConfigured()) return json(503, "AI features aren't set up on this site yet.");
  if (!(await rateLimitUser("photoUpload", user.id))) return json(429, "You've uploaded a lot of photos. Please try again later.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, "Choose a photo.");
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return json(400, "Choose a photo.");
  if (file.size > MAX_UPLOAD_BYTES) return json(413, "Photos can be up to 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return json(415, "Use a JPEG, PNG or WebP photo.");

  let clean: Buffer;
  try {
    clean = await sanitizeImage(bytes, 1024);
  } catch {
    return json(415, "That photo couldn't be read. Try another one.");
  }

  // Checked after the cheap validation so a bad file doesn't use up the quota.
  const gate = await startAiRequest(supabase, user.id, "photo");
  if (!gate.ok) return json(gate.status, gate.error);

  let items: PhotoItem[] | null;
  try {
    const result = await generate({
      system: MEAL_PHOTO_SYSTEM,
      messages: [{ role: "user", parts: [{ image: { mimeType: "image/webp", base64: clean.toString("base64") } }, { text: MEAL_PHOTO_PROMPT }] }],
      jsonSchema: MEAL_PHOTO_JSON_SCHEMA,
      maxOutputTokens: 4096,
      temperature: 0.2,
    });
    await recordAiTokens(user.id, "photo", result.tokens);
    items = parseMealPhoto(result.text);
  } catch (e) {
    const f = aiFailure(e);
    return json(f.status, f.error);
  }
  if (!items) return json(502, "The AI's answer didn't make sense. Please try again.");

  // Prefer foods already in the catalogue (or the user's own foods), read through RLS.
  const results: PhotoResult[] = await Promise.all(items.map(async (item) => ({ ...item, match: await findMatch(supabase, item.name) })));
  return Response.json({ items: results });
}

async function findMatch(supabase: Awaited<ReturnType<typeof getApiUser>>["supabase"], name: string): Promise<FoodMatch | null> {
  // The full name first, then without any bracketed note ("Idli (steamed)" → "Idli").
  // Bracket contents alone are too vague to search on ("steamed" matches anything steamed).
  const plain = name.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const queries = [...new Set([name, plain].filter((q) => q.length >= 2))];
  for (const q of queries) {
    const { data } = await supabase.rpc("search_foods", { p_query: q.slice(0, 100), p_limit: 1 });
    const f = (data as FoodMatch[] | null)?.[0];
    if (f) {
      return {
        id: f.id,
        name: f.name,
        brand: f.brand,
        calories: Number(f.calories),
        protein_g: Number(f.protein_g),
        carbs_g: Number(f.carbs_g),
        fat_g: Number(f.fat_g),
      };
    }
  }
  return null;
}
