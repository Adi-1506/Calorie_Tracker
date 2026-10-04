import { getApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile, profileToday } from "@/lib/data/profile";
import { detectImageType, MAX_UPLOAD_BYTES, sanitizeImage } from "@/lib/images/sanitize";
import { rateLimitUser } from "@/lib/security/rate-limit";
import { isSameOrigin } from "@/lib/security/same-origin";
import { isIsoDate } from "@/lib/dates";

// Progress photo upload (security item 16). The browser never touches the
// bucket: this route checks the session and origin, caps the size before
// reading the body, identifies the file by its magic bytes, re-encodes it
// (dropping EXIF/GPS), and stores it under a random name with the service role.

const json = (status: number, error: string) => Response.json({ error }, { status });

export async function POST(request: Request) {
  if (!isSameOrigin(request.headers)) return json(403, "Forbidden");
  const length = Number(request.headers.get("content-length"));
  if (!length || length > MAX_UPLOAD_BYTES + 64 * 1024) return json(413, "Photos can be up to 5 MB.");

  const { user, supabase } = await getApiUser();
  if (!user) return json(401, "Please log in again.");
  if (!(await rateLimitUser("photoUpload", user.id))) return json(429, "You've uploaded a lot of photos. Please try again later.");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json(400, "Choose a photo to upload.");
  }
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return json(400, "Choose a photo to upload.");
  if (file.size > MAX_UPLOAD_BYTES) return json(413, "Photos can be up to 5 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!detectImageType(bytes)) return json(415, "Use a JPEG, PNG or WebP photo.");

  let clean: Buffer;
  try {
    clean = await sanitizeImage(bytes);
  } catch {
    return json(415, "That photo couldn't be read. Try another one.");
  }

  const profile = await getProfile(supabase, user.id);
  const today = profile ? profileToday(profile) : new Date().toISOString().slice(0, 10);
  const requested = form.get("date");
  const takenOn = typeof requested === "string" && isIsoDate(requested) && requested <= today ? requested : today;

  const admin = createAdminClient();
  const path = `${user.id}/${crypto.randomUUID()}.webp`;
  const upload = await admin.storage.from("progress-photos").upload(path, clean, { contentType: "image/webp", upsert: false });
  if (upload.error) return json(500, "Upload failed. Please try again.");

  const { error } = await admin.from("progress_photos").insert({ user_id: user.id, storage_path: path, taken_on: takenOn });
  if (error) {
    await admin.storage.from("progress-photos").remove([path]);
    return json(500, "Upload failed. Please try again.");
  }
  return Response.json({ ok: true }, { status: 201 });
}
