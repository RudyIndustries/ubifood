# Ubifood

Ubifood es una app web progresiva para La Paz: restaurantes cercanos, menus del dia, ofertas cero desperdicio, rutas urbanas y recomendaciones de UV.

## 1. GitHub

1. Crea una cuenta en GitHub si aun no tienes una.
2. Crea un repositorio llamado `ubifood`.
3. No agregues README, `.gitignore` ni licencia desde GitHub, porque el proyecto ya los tiene localmente.
4. Cuando quieras subirlo:

```bash
git init
git add .
git commit -m "initial ubifood setup"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/ubifood.git
git push -u origin main
```

## 2. Supabase

1. Entra a https://supabase.com.
2. Crea un proyecto llamado `ubifood`.
3. Elige la region mas cercana disponible.
4. Guarda la contrasena de la base de datos.
5. En Auth, activa email/password.
6. Para desarrollo, puedes desactivar confirmacion por email.
7. Crea manualmente el usuario `admin@ubifood.bo` en Auth.

## 3. Variables de entorno

Copia `.env.example` a `.env.local` y reemplaza los valores:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publicable
SUPABASE_SECRET_KEY=tu_clave_secreta_solo_servidor
```

No subas `.env.local` a GitHub.

## 4. Base de datos

En Supabase SQL Editor:

1. Ejecuta `supabase/migrations/0001_initial_schema.sql`.
2. Crea el usuario admin en Auth si no lo hiciste.
3. Ejecuta `supabase/seed_admin_profile.sql`.

La migracion crea:

- `profiles`
- `restaurants`
- `restaurant_theme`
- `menu_items`
- `rescue_deals`
- `transport_routes`
- `saved_locations`

Tambien activa Row Level Security para separar permisos de cliente, comercio y admin.

## 5. Desarrollo local

```bash
npm run dev
```

Abre http://localhost:3000.

## 6. Siguientes partes

1. Login y registro con Supabase Auth.
2. Panel admin para aprobar restaurantes.
3. Panel comercio para menu, precios y ofertas.
4. Mapa real con MapLibre.
5. Rutas de auto/caminata.
6. Rutas de teleferico cuando tengamos los datos.
7. Indice UV con Open-Meteo.
8. PWA y luego Capacitor para Android.

