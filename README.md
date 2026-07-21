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
2. Ejecuta `supabase/migrations/0002_security_fixes.sql`.
3. Ejecuta `supabase/migrations/0003_restaurant_media_storage.sql`.
4. Crea el usuario admin en Auth si no lo hiciste.
5. Ejecuta `supabase/seed_admin_profile.sql`.

La migracion crea:

- `profiles`
- `restaurants`
- `restaurant_theme`
- `menu_items`
- `rescue_deals`
- `transport_routes`
- `saved_locations`

Tambien activa Row Level Security para separar permisos de cliente, comercio y admin.
La tercera migracion crea el bucket publico `restaurant-media`; solo comercios y
administradores autenticados pueden subir o modificar archivos dentro de su carpeta.

## 5. Desarrollo local

```bash
npm run dev
```

Abre http://localhost:3000.

Para verificar que Supabase esta conectado sin mostrar claves:

```bash
npm run check:supabase
```

## 6. Funcionalidad disponible

- Login y registro con roles cliente, comercio y admin.
- Aprobacion administrativa de restaurantes.
- Gestion de menus, precios y ofertas cero desperdicio.
- Portadas y fotos de platos mediante Supabase Storage.
- Mapa MapLibre con Teleferico, PumaKatari y planificador estimado.
- Cartas animadas y personalizables por negocio.
- Indice UV y recomendacion visual con Open-Meteo.

## 7. Siguientes partes

1. Navegacion vial precisa para caminata y automovil.
2. Rutas verificadas de micros y minibuses.
3. Notificaciones de ofertas cero desperdicio.
4. PWA y luego Capacitor para Android.
