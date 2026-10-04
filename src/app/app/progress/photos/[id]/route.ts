import { getApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Serves one progress photo to its owner. The row is read with the user's own
// client, so RLS decides ownership; only then does the service role fetch the
// file. Nothing is cached by shared caches.

export async function GET(_request: Request, { params }: RouteContext<"/app/progress/photos/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const { user, supabase } = await getApiUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { data } = await supabase.from("progress_photos").select("storage_path").eq("id", id).maybeSingle();
  if (!data) return new Response("Not found", { status: 404 });

  const file = await createAdminClient().storage.from("progress-photos").download(data.storage_path);
  if (file.error || !file.data) return new Response("Not found", { status: 404 });

  return new Response(file.data, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
