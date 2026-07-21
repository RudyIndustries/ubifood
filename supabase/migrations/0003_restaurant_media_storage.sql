begin;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'restaurant-media',
  'restaurant-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "restaurant_media_select_own" on storage.objects;
drop policy if exists "restaurant_media_insert_own" on storage.objects;
drop policy if exists "restaurant_media_update_own" on storage.objects;
drop policy if exists "restaurant_media_delete_own" on storage.objects;

create policy "restaurant_media_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'restaurant-media'
  and owner_id = (select auth.uid()::text)
);

create policy "restaurant_media_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'restaurant-media'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and public.get_my_role() in ('comercio', 'admin')
);

create policy "restaurant_media_update_own"
on storage.objects for update
to authenticated
using (
  bucket_id = 'restaurant-media'
  and owner_id = (select auth.uid()::text)
)
with check (
  bucket_id = 'restaurant-media'
  and owner_id = (select auth.uid()::text)
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);

create policy "restaurant_media_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'restaurant-media'
  and owner_id = (select auth.uid()::text)
);

commit;
