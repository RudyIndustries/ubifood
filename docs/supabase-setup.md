# Configuracion paso a paso de Supabase

## Crear proyecto

1. Entra a https://supabase.com.
2. Crea o inicia sesion.
3. Crea un nuevo proyecto:
   - Nombre: `ubifood`
   - Base de datos: PostgreSQL
   - Region: la mas cercana disponible
4. Guarda la contrasena de la base de datos.

## Configurar Auth

1. Ve a Authentication.
2. Activa login por email/password.
3. En desarrollo, puedes desactivar confirmacion por email.
4. Crea un usuario manual:
   - Email: `admin@ubifood.bo`
   - Password: el que tu decidas

## Configurar claves

1. Ve a Project Settings.
2. Busca API Keys.
3. Copia:
   - Project URL
   - Publishable key
   - Secret key
4. Crea `.env.local` con base en `.env.example`.

## Crear tablas y permisos

1. Abre SQL Editor.
2. Pega y ejecuta `supabase/migrations/0001_initial_schema.sql`.
3. Despues ejecuta `supabase/seed_admin_profile.sql`.

## Cron mas adelante

Se agregara un cron para evitar inactividad, expirar ofertas vencidas y preparar tareas periodicas. No se configura todavia porque primero necesitamos validar que Auth y RLS esten funcionando bien.

