import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  EyeOff,
  Leaf,
  PackageCheck,
  Plus,
  Store,
} from "lucide-react";
import { RestaurantThemeEditor } from "@/components/restaurants/restaurant-theme-editor";
import { RestaurantLocationPicker } from "@/components/restaurants/restaurant-location-picker";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  MenuItem,
  RescueDeal,
  Restaurant,
  RestaurantTheme,
} from "@/lib/restaurants/types";
import {
  finishActiveRescuesAction,
  saveRestaurantAction,
  setDailyMenuAvailabilityAction,
} from "./actions";

type ComercioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RestaurantWithTheme = Restaurant & {
  restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
};

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: Restaurant["status"]) {
  if (status === "approved") {
    return "Aprobado";
  }

  if (status === "blocked") {
    return "Bloqueado";
  }

  return "Pendiente";
}

function getTheme(restaurant: RestaurantWithTheme | null) {
  const theme = Array.isArray(restaurant?.restaurant_theme)
    ? restaurant?.restaurant_theme[0]
    : restaurant?.restaurant_theme;

  return {
    primary_color: theme?.primary_color ?? "#d62828",
    secondary_color: theme?.secondary_color ?? "#277da1",
    accent_color: theme?.accent_color ?? "#f9c74f",
    notebook_style: theme?.notebook_style ?? "andino",
  };
}

export default async function ComercioPage({ searchParams }: ComercioPageProps) {
  const profile = await requireProfile(["comercio", "admin"]);
  const params = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*,restaurant_theme(*)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<RestaurantWithTheme>();

  let menuItems: MenuItem[] = [];
  let rescueDeals: RescueDeal[] = [];
  if (restaurant) {
    const [menuResult, rescueResult] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .returns<MenuItem[]>(),
      supabase
        .from("rescue_deals")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .gt("quantity_available", 0)
        .gt("expires_at", new Date().toISOString())
        .returns<RescueDeal[]>(),
    ]);
    menuItems = menuResult.data ?? [];
    rescueDeals = rescueResult.data ?? [];
  }

  const theme = getTheme(restaurant);
  const saved = firstParam(params, "saved");
  const error = firstParam(params, "error");
  const daily = firstParam(params, "daily");
  const availableItems = menuItems.filter((item) => item.is_available);
  const activeRescues = rescueDeals;
  const rescuePortions = activeRescues.reduce(
    (total, deal) => total + deal.quantity_available,
    0,
  );
  const averagePrice = availableItems.length
    ? availableItems.reduce((total, item) => total + Number(item.price), 0) /
      availableItems.length
    : 0;
  const profileChecks = restaurant
    ? [
        { label: "Descripcion", complete: Boolean(restaurant.description) },
        { label: "Telefono", complete: Boolean(restaurant.phone) },
        { label: "Portada", complete: Boolean(restaurant.cover_url) },
        {
          label: "Horario",
          complete: Boolean(restaurant.opening_hours?.display),
        },
        { label: "Ubicacion", complete: true },
        { label: "Menu", complete: menuItems.length > 0 },
      ]
    : [];
  const profileProgress = profileChecks.length
    ? Math.round(
        (profileChecks.filter((check) => check.complete).length /
          profileChecks.length) *
          100,
      )
    : 0;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg bg-white p-5 shadow-xl shadow-black/10 lg:col-span-2">
        <p className="text-sm font-bold uppercase text-[#43aa8b]">
          Panel comercio
        </p>
        <h1 className="mt-2 text-3xl font-black">
          {restaurant ? "Actualiza tu restaurante" : "Registra tu restaurante"}
        </h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          Cuenta activa: {profile.email}. El admin debe aprobar el negocio antes
          de que aparezca para clientes.
        </p>

        {restaurant && (
          <div className="mt-4 rounded-lg bg-[#f7f4ed] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-black/50">Estado</p>
                <p className="text-xl font-black">{statusLabel(restaurant.status)}</p>
              </div>
              <span
                className={`rounded-md px-3 py-1 text-sm font-black ${
                  restaurant.status === "approved"
                    ? "bg-[#e8f5ef] text-[#18664f]"
                    : restaurant.status === "blocked"
                      ? "bg-[#fff0ed] text-[#a32323]"
                      : "bg-[#fff4e0] text-[#8a5a00]"
                }`}
              >
                {restaurant.status}
              </span>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <Link
                href="/comercio/menu"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white"
              >
                <BookOpen size={18} />
                Menu y precios
              </Link>
              <Link
                href="/comercio/rescates"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#18664f] px-4 text-sm font-black text-white"
              >
                <Leaf size={18} />
                Publicar rescate
              </Link>
              {restaurant.status === "approved" && (
                <Link
                  href={`/restaurantes/${restaurant.slug}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#eef5f8] px-4 text-sm font-black text-[#245f78]"
                >
                  <Eye size={18} />
                  Vista del cliente
                </Link>
              )}
            </div>
          </div>
        )}

        {saved && (
          <p className="mt-4 rounded-lg bg-[#e8f5ef] px-4 py-3 text-sm font-bold text-[#18664f]">
            Restaurante guardado. Si esta pendiente, espera aprobacion admin.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a32323]">
            {error === "invalid-location"
              ? "La ubicacion debe estar dentro del departamento de La Paz. Marca el punto exacto en el mapa."
              : "No se pudo guardar. Revisa los datos e intentalo otra vez."}
          </p>
        )}
        {daily && (
          <p className="mt-4 rounded-lg bg-[#eef5f8] px-4 py-3 text-sm font-bold text-[#245f78]">
            {daily === "menu-open"
              ? "Todo el menu quedo disponible para hoy."
              : daily === "menu-paused"
                ? "El menu fue pausado; los platos aparecen agotados."
                : "Las promociones de rescate activas fueron finalizadas."}
          </p>
        )}
      </section>

      {restaurant && (
        <>
          <section className="lg:col-span-2" aria-labelledby="daily-summary-title">
            <div className="mb-3 flex items-center gap-2">
              <BarChart3 className="text-[#277da1]" />
              <div>
                <p className="text-xs font-black uppercase text-[#277da1]">Hoy</p>
                <h2 id="daily-summary-title" className="text-xl font-black">
                  Resumen operativo
                </h2>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <article className="rounded-lg border border-black/5 bg-white p-4">
                <BookOpen className="text-[#d62828]" size={20} />
                <p className="mt-3 text-2xl font-black">{availableItems.length}</p>
                <p className="text-xs font-bold text-black/50">
                  de {menuItems.length} platos disponibles
                </p>
              </article>
              <article className="rounded-lg border border-black/5 bg-white p-4">
                <CircleDollarSign className="text-[#8a5a00]" size={20} />
                <p className="mt-3 text-2xl font-black">Bs {averagePrice.toFixed(0)}</p>
                <p className="text-xs font-bold text-black/50">precio promedio visible</p>
              </article>
              <article className="rounded-lg border border-black/5 bg-white p-4">
                <Leaf className="text-[#18664f]" size={20} />
                <p className="mt-3 text-2xl font-black">{activeRescues.length}</p>
                <p className="text-xs font-bold text-black/50">rescates activos</p>
              </article>
              <article className="rounded-lg border border-black/5 bg-white p-4">
                <PackageCheck className="text-[#43aa8b]" size={20} />
                <p className="mt-3 text-2xl font-black">{rescuePortions}</p>
                <p className="text-xs font-bold text-black/50">porciones por rescatar</p>
              </article>
            </div>
          </section>

          <section className="rounded-lg bg-[#211c18] p-5 text-white">
            <p className="text-xs font-black uppercase text-[#f9c74f]">Control del dia</p>
            <h2 className="mt-1 text-xl font-black">Disponibilidad rápida</h2>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Abre o pausa todos los platos de una vez antes y despues del servicio.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <form action={setDailyMenuAvailabilityAction}>
                <input type="hidden" name="isAvailable" value="true" />
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#43aa8b] px-3 text-sm font-black text-white">
                  <Eye size={17} /> Activar menu
                </button>
              </form>
              <form action={setDailyMenuAvailabilityAction}>
                <input type="hidden" name="isAvailable" value="false" />
                <button className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-3 text-sm font-black text-white">
                  <EyeOff size={17} /> Pausar menu
                </button>
              </form>
            </div>
            <form action={finishActiveRescuesAction} className="mt-2">
              <button
                disabled={activeRescues.length === 0}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-white/15 px-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Leaf size={17} /> Finalizar rescates activos
              </button>
            </form>
          </section>

          <section className="rounded-lg bg-white p-5 shadow-lg shadow-black/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-[#d62828]">Presentacion</p>
                <h2 className="mt-1 text-xl font-black">Perfil completo</h2>
              </div>
              <span className="text-2xl font-black text-[#d62828]">{profileProgress}%</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/10">
              <div
                className="h-full rounded-full bg-[#d62828] transition-all"
                style={{ width: `${profileProgress}%` }}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold">
              {profileChecks.map((check) => (
                <span
                  key={check.label}
                  className={`flex items-center gap-2 ${
                    check.complete ? "text-[#18664f]" : "text-black/40"
                  }`}
                >
                  <CheckCircle2 size={15} /> {check.label}
                </span>
              ))}
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link
                href="/comercio/menu"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#fff0ed] px-3 text-xs font-black text-[#a32323]"
              >
                <Plus size={16} /> Agregar platos
              </Link>
              <Link
                href="/comercio/rescates"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#e8f5ef] px-3 text-xs font-black text-[#18664f]"
              >
                <Leaf size={16} /> Crear rescate
              </Link>
            </div>
          </section>
        </>
      )}

      <form
        id="restaurant-profile"
        action={saveRestaurantAction}
        className="rounded-lg bg-[#fffaf0] p-5 shadow-xl shadow-black/10 lg:col-span-2"
      >
        <input type="hidden" name="restaurantId" value={restaurant?.id ?? ""} />

        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-lg bg-[#d62828] text-white">
            <Store />
          </div>
          <div>
            <p className="text-sm font-bold text-[#d62828]">Datos del negocio</p>
            <h2 className="text-2xl font-black">Ficha publica</h2>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-black/65">Nombre</span>
            <input
              name="name"
              required
              defaultValue={restaurant?.name ?? ""}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Ej. Sajta Express"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Categoria</span>
            <input
              name="category"
              defaultValue={restaurant?.category ?? "Almuerzo"}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Telefono</span>
            <input
              name="phone"
              defaultValue={restaurant?.phone ?? ""}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="WhatsApp del negocio"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-black/65">Descripcion</span>
            <textarea
              name="description"
              defaultValue={restaurant?.description ?? ""}
              className="mt-2 min-h-24 w-full rounded-lg border border-black/10 bg-white px-4 py-3 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Que vendes, estilo del lugar, especialidad..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Zona</span>
            <input
              name="zone"
              required
              defaultValue={restaurant?.zone ?? ""}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="San Pedro, Sopocachi..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Direccion</span>
            <input
              name="address"
              required
              defaultValue={restaurant?.address ?? ""}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Calle, numero, referencia"
            />
          </label>

          <RestaurantLocationPicker
            defaultLatitude={Number(restaurant?.latitude ?? -16.5)}
            defaultLongitude={Number(restaurant?.longitude ?? -68.15)}
          />

          <label className="block">
            <span className="text-sm font-bold text-black/65">Nivel precio</span>
            <select
              name="priceLevel"
              defaultValue={restaurant?.price_level ?? 2}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            >
              <option value="1">Economico</option>
              <option value="2">Medio</option>
              <option value="3">Alto</option>
              <option value="4">Premium</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Horario</span>
            <input
              name="openingHours"
              defaultValue={restaurant?.opening_hours?.display ?? ""}
              className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Lun-Sab 11:00-21:00"
            />
          </label>
        </div>

        <RestaurantThemeEditor
          restaurantName={restaurant?.name ?? "Tu restaurante"}
          coverUrl={restaurant?.cover_url ?? ""}
          theme={theme}
          ownerId={profile.id}
          restaurantId={restaurant?.id}
        />

        <button className="mt-5 h-12 w-full rounded-lg bg-[#d62828] px-4 font-black text-white shadow-lg shadow-[#d62828]/20 transition hover:bg-[#b91f1f]">
          Guardar restaurante
        </button>
      </form>

    </div>
  );
}
