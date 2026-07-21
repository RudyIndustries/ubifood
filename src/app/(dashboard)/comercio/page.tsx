import Link from "next/link";
import {
  BookOpen,
  Clock3,
  Leaf,
  MapPin,
  Palette,
  Store,
  type LucideIcon,
} from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Restaurant, RestaurantTheme } from "@/lib/restaurants/types";
import { saveRestaurantAction } from "./actions";

type ComercioPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RestaurantWithTheme = Restaurant & {
  restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
};

const nextSteps: Array<{
  Icon: LucideIcon;
  title: string;
  text: string;
}> = [
  {
    Icon: BookOpen,
    title: "Menu",
    text: "Despues cargaremos platos y precios.",
  },
  {
    Icon: MapPin,
    title: "Ubicacion",
    text: "Estas coordenadas alimentaran el mapa.",
  },
  {
    Icon: Clock3,
    title: "Aprobacion",
    text: "Admin decide si aparece al publico.",
  },
];

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

  const theme = getTheme(restaurant);
  const saved = firstParam(params, "saved");
  const error = firstParam(params, "error");

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1fr]">
      <section className="rounded-[32px] bg-white p-5 shadow-2xl shadow-black/10">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#43aa8b]">
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
          <div className="mt-4 rounded-3xl bg-[#f7f4ed] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-black/50">Estado</p>
                <p className="text-xl font-black">{statusLabel(restaurant.status)}</p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-sm font-black ${
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
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
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
            </div>
          </div>
        )}

        {saved && (
          <p className="mt-4 rounded-2xl bg-[#e8f5ef] px-4 py-3 text-sm font-bold text-[#18664f]">
            Restaurante guardado. Si esta pendiente, espera aprobacion admin.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-2xl bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a32323]">
            No se pudo guardar. Revisa los datos e intentalo otra vez.
          </p>
        )}
      </section>

      <form
        action={saveRestaurantAction}
        className="rounded-[32px] bg-[#fffaf0] p-5 shadow-2xl shadow-black/10"
      >
        <input type="hidden" name="restaurantId" value={restaurant?.id ?? ""} />

        <div className="mb-5 flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-[#d62828] text-white">
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
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Ej. Sajta Express"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Categoria</span>
            <input
              name="category"
              defaultValue={restaurant?.category ?? "Almuerzo"}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Telefono</span>
            <input
              name="phone"
              defaultValue={restaurant?.phone ?? ""}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="WhatsApp del negocio"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-black/65">Descripcion</span>
            <textarea
              name="description"
              defaultValue={restaurant?.description ?? ""}
              className="mt-2 min-h-24 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Que vendes, estilo del lugar, especialidad..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Zona</span>
            <input
              name="zone"
              required
              defaultValue={restaurant?.zone ?? ""}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="San Pedro, Sopocachi..."
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Direccion</span>
            <input
              name="address"
              required
              defaultValue={restaurant?.address ?? ""}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Calle, numero, referencia"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Latitud</span>
            <input
              name="latitude"
              type="number"
              step="0.000001"
              defaultValue={restaurant?.latitude ?? -16.5}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Longitud</span>
            <input
              name="longitude"
              type="number"
              step="0.000001"
              defaultValue={restaurant?.longitude ?? -68.15}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold text-black/65">Nivel precio</span>
            <select
              name="priceLevel"
              defaultValue={restaurant?.price_level ?? 2}
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
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
              className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
              placeholder="Lun-Sab 11:00-21:00"
            />
          </label>
        </div>

        <div className="mt-6 rounded-3xl bg-white p-4">
          <div className="mb-4 flex items-center gap-3">
            <Palette className="text-[#277da1]" />
            <div>
              <p className="text-sm font-bold text-[#277da1]">Menu cuaderno</p>
              <h3 className="text-xl font-black">Colores del negocio</h3>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["primaryColor", "Principal", theme.primary_color],
              ["secondaryColor", "Secundario", theme.secondary_color],
              ["accentColor", "Acento", theme.accent_color],
            ].map(([name, label, value]) => (
              <label key={name} className="block">
                <span className="text-sm font-bold text-black/65">{label}</span>
                <input
                  name={name}
                  type="color"
                  defaultValue={value}
                  className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white p-2"
                />
              </label>
            ))}
          </div>
        </div>

        <button className="mt-5 h-12 w-full rounded-2xl bg-[#d62828] px-4 font-black text-white shadow-lg shadow-[#d62828]/20 transition hover:bg-[#b91f1f]">
          Guardar restaurante
        </button>
      </form>

      <section className="rounded-[32px] bg-white p-5 shadow-xl shadow-black/5 lg:col-span-2">
        <div className="grid gap-4 sm:grid-cols-3">
          {nextSteps.map(({ Icon, title, text }) => (
            <article key={title} className="rounded-3xl bg-[#f7f4ed] p-4">
              <Icon className="mb-3 text-[#d62828]" />
              <h3 className="text-lg font-black">{title}</h3>
              <p className="mt-1 text-sm text-black/60">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
