begin;

create table if not exists public.restaurant_ratings (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, user_id)
);

create index if not exists restaurant_ratings_restaurant_idx
on public.restaurant_ratings(restaurant_id, created_at desc);

drop trigger if exists restaurant_ratings_set_updated_at
on public.restaurant_ratings;

create trigger restaurant_ratings_set_updated_at
before update on public.restaurant_ratings
for each row execute function public.set_updated_at();

alter table public.restaurant_ratings enable row level security;

drop policy if exists "restaurant_ratings_read_visible"
on public.restaurant_ratings;

create policy "restaurant_ratings_read_visible"
on public.restaurant_ratings for select
using (
  exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and (
        r.status = 'approved'
        or r.owner_id = auth.uid()
        or public.get_my_role() = 'admin'
      )
  )
);

drop policy if exists "restaurant_ratings_insert_client"
on public.restaurant_ratings;

create policy "restaurant_ratings_insert_client"
on public.restaurant_ratings for insert
with check (
  user_id = auth.uid()
  and public.get_my_role() = 'cliente'
  and exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.status = 'approved'
  )
);

drop policy if exists "restaurant_ratings_update_own"
on public.restaurant_ratings;

create policy "restaurant_ratings_update_own"
on public.restaurant_ratings for update
using (
  user_id = auth.uid()
  and public.get_my_role() = 'cliente'
)
with check (
  user_id = auth.uid()
  and public.get_my_role() = 'cliente'
  and exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.status = 'approved'
  )
);

drop policy if exists "restaurant_ratings_delete_own_or_admin"
on public.restaurant_ratings;

create policy "restaurant_ratings_delete_own_or_admin"
on public.restaurant_ratings for delete
using (
  user_id = auth.uid()
  or public.get_my_role() = 'admin'
);

commit;
