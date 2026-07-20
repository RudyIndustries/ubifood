create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'cliente', 'comercio');
create type public.restaurant_status as enum ('pending', 'approved', 'blocked');
create type public.route_type as enum ('auto', 'walk', 'teleferico', 'minibus', 'bus');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role public.app_role not null default 'cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  description text,
  category text not null default 'Comida',
  phone text,
  address text not null,
  zone text not null,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  price_level smallint not null default 2 check (price_level between 1 and 4),
  opening_hours jsonb not null default '{}'::jsonb,
  status public.restaurant_status not null default 'pending',
  cover_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_theme (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  primary_color text not null default '#d62828',
  secondary_color text not null default '#277da1',
  accent_color text not null default '#f9c74f',
  notebook_style text not null default 'andino',
  cover_image_url text,
  updated_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text,
  category text not null default 'Menu',
  price numeric(10,2) not null check (price >= 0),
  is_available boolean not null default true,
  image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.rescue_deals (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  title text not null,
  description text,
  original_price numeric(10,2) check (original_price >= 0),
  rescue_price numeric(10,2) not null check (rescue_price >= 0),
  quantity_available integer not null default 1 check (quantity_available >= 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transport_routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  route_type public.route_type not null,
  color text,
  geometry jsonb not null,
  stops jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.saved_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null,
  address text,
  latitude numeric(9,6) not null,
  longitude numeric(9,6) not null,
  created_at timestamptz not null default now()
);

create index restaurants_status_zone_idx on public.restaurants(status, zone);
create index restaurants_location_idx on public.restaurants(latitude, longitude);
create index menu_items_restaurant_available_idx on public.menu_items(restaurant_id, is_available);
create index rescue_deals_active_expires_idx on public.rescue_deals(is_active, expires_at);
create index saved_locations_user_idx on public.saved_locations(user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger restaurants_set_updated_at
before update on public.restaurants
for each row execute function public.set_updated_at();

create trigger restaurant_theme_set_updated_at
before update on public.restaurant_theme
for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

create trigger rescue_deals_set_updated_at
before update on public.rescue_deals
for each row execute function public.set_updated_at();

create or replace function public.get_my_role()
returns public.app_role
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role public.app_role;
begin
  requested_role :=
    case
      when new.raw_user_meta_data->>'role' in ('cliente', 'comercio')
        then (new.raw_user_meta_data->>'role')::public.app_role
      else 'cliente'::public.app_role
    end;

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    requested_role
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = excluded.full_name;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.restaurant_theme enable row level security;
alter table public.menu_items enable row level security;
alter table public.rescue_deals enable row level security;
alter table public.transport_routes enable row level security;
alter table public.saved_locations enable row level security;

create policy "profiles_select_own_or_admin"
on public.profiles for select
using (id = auth.uid() or public.get_my_role() = 'admin');

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (id = auth.uid() or public.get_my_role() = 'admin')
with check (id = auth.uid() or public.get_my_role() = 'admin');

create policy "restaurants_read_approved_or_owner_or_admin"
on public.restaurants for select
using (
  status = 'approved'
  or owner_id = auth.uid()
  or public.get_my_role() = 'admin'
);

create policy "restaurants_insert_commerce"
on public.restaurants for insert
with check (
  owner_id = auth.uid()
  and public.get_my_role() in ('comercio', 'admin')
);

create policy "restaurants_update_owner_or_admin"
on public.restaurants for update
using (owner_id = auth.uid() or public.get_my_role() = 'admin')
with check (owner_id = auth.uid() or public.get_my_role() = 'admin');

create policy "restaurant_theme_read_visible"
on public.restaurant_theme for select
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.status = 'approved' or r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "restaurant_theme_owner_or_admin"
on public.restaurant_theme for all
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "menu_items_read_visible"
on public.menu_items for select
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.status = 'approved' or r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "menu_items_owner_or_admin"
on public.menu_items for all
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "rescue_deals_read_active_or_owner_or_admin"
on public.rescue_deals for select
using (
  (is_active = true and expires_at > now())
  or exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "rescue_deals_owner_or_admin"
on public.rescue_deals for all
using (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
)
with check (
  exists (
    select 1 from public.restaurants r
    where r.id = restaurant_id
    and (r.owner_id = auth.uid() or public.get_my_role() = 'admin')
  )
);

create policy "transport_routes_read_active"
on public.transport_routes for select
using (is_active = true or public.get_my_role() = 'admin');

create policy "transport_routes_admin_write"
on public.transport_routes for all
using (public.get_my_role() = 'admin')
with check (public.get_my_role() = 'admin');

create policy "saved_locations_owner"
on public.saved_locations for all
using (user_id = auth.uid() or public.get_my_role() = 'admin')
with check (user_id = auth.uid() or public.get_my_role() = 'admin');

