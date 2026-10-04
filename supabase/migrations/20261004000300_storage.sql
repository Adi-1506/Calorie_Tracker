-- Private bucket for progress photos (security items 5 and 16).
-- No storage policies are created on purpose: browsers can't read or write
-- this bucket directly. The upload route validates the file (type, magic bytes,
-- size), strips EXIF, stores it under <user_id>/<random-uuid>.<ext> with the
-- service role, and hands out short-lived signed URLs after an ownership check.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  false,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
