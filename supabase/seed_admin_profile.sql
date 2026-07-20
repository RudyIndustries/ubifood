-- Ejecutar despues de crear manualmente el usuario admin@ubifood.bo en Supabase Auth.
-- Cambia el email si usaste otro correo.

insert into public.profiles (id, email, full_name, role)
select id, email, 'Administrador Ubifood', 'admin'::public.app_role
from auth.users
where email = 'admin@ubifood.bo'
on conflict (id) do update
set role = 'admin',
    full_name = excluded.full_name,
    email = excluded.email;

