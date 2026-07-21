begin;

-- A user may edit their own profile, but only an admin may change roles.
drop policy if exists "profiles_update_own_or_admin" on public.profiles;

create policy "profiles_update_own_or_admin"
on public.profiles for update
using (
  id = auth.uid()
  or public.get_my_role() = 'admin'
)
with check (
  (
    id = auth.uid()
    and role = public.get_my_role()
  )
  or public.get_my_role() = 'admin'
);

-- Public rescue deals must belong to an approved restaurant.
-- Owners and admins retain access through rescue_deals_owner_or_admin.
drop policy if exists "rescue_deals_read_active_or_owner_or_admin"
on public.rescue_deals;

create policy "rescue_deals_read_active_or_owner_or_admin"
on public.rescue_deals for select
using (
  is_active = true
  and expires_at > now()
  and exists (
    select 1
    from public.restaurants r
    where r.id = restaurant_id
      and r.status = 'approved'
  )
);

commit;
