-- Ensure the 'uploads' storage bucket exists and is public, so images
-- uploaded via the product form (getPublicUrl) are actually viewable
-- without a signed URL. The RLS policies on storage.objects already
-- reference bucket_id = 'uploads' (added earlier), but no migration
-- ever created the bucket record itself — it may have been created
-- manually via the dashboard, possibly as private. This makes it
-- explicit and idempotent either way.
insert into storage.buckets (id, name, public, file_size_limit)
values ('uploads', 'uploads', true, 5242880)
on conflict (id) do update set public = true, file_size_limit = 5242880;
