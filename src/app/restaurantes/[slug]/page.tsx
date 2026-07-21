import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MapPin, Phone, Store } from "lucide-react";
import { NotebookMenu } from "@/components/restaurants/notebook-menu";
import type {
  MenuItem,
  Restaurant,
  RestaurantTheme,
} from "@/lib/restaurants/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
};

type RestaurantWithTheme = Restaurant & {
  restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
};

function getTheme(restaurant: RestaurantWithTheme) {
  const relationship = Array.isArray(restaurant.restaurant_theme)
    ? restaurant.restaurant_theme[0]
    : restaurant.restaurant_theme;

  return {
    primary_color: relationship?.primary_color ?? "#d62828",
    secondary_color: relationship?.secondary_color ?? "#277da1",
    accent_color: relationship?.accent_color ?? "#f9c74f",
    notebook_style: relationship?.notebook_style ?? "andino",
  };
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*,restaurant_theme(*)")
    .eq("slug", slug)
    .eq("status", "approved")
    .maybeSingle<RestaurantWithTheme>();

  if (!restaurant) {
    notFound();
  }

  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("category")
    .order("name")
    .returns<MenuItem[]>();
  const items = data ?? [];
  const theme = getTheme(restaurant);
  const hours = restaurant.opening_hours?.display || "Horario por confirmar";

  return (
    <main className="min-h-screen bg-[#f7f4ed] pb-10">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/cliente"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-black hover:bg-[#f7f4ed]"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
          <span className="text-sm font-black" style={{ color: theme.primary_color }}>
            Ubifood La Paz
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-5">
        <section
          className="relative overflow-hidden rounded-lg text-white"
          style={{ backgroundColor: theme.primary_color }}
        >
          {restaurant.cover_url && (
            <div
              className="absolute inset-0 bg-cover bg-center opacity-35"
              style={{ backgroundImage: `url(${restaurant.cover_url})` }}
            />
          )}
          <div className="relative px-5 py-7 sm:px-7 sm:py-9">
            <div
              className="mb-4 grid size-12 place-items-center rounded-lg"
              style={{ backgroundColor: theme.accent_color, color: "#211c18" }}
            >
              <Store size={22} />
            </div>
            <p className="text-sm font-black uppercase text-white/75">{restaurant.category}</p>
            <h1 className="mt-1 max-w-2xl text-3xl font-black sm:text-4xl">
              {restaurant.name}
            </h1>
            {restaurant.description && (
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/80">
                {restaurant.description}
              </p>
            )}
          </div>
        </section>

        <section className="grid gap-2 border-b border-black/10 py-4 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3">
            <MapPin size={19} style={{ color: theme.primary_color }} />
            <div className="min-w-0">
              <p className="text-xs font-bold text-black/45">Ubicacion</p>
              <p className="truncate text-sm font-black">{restaurant.zone}, {restaurant.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3">
            <Clock3 size={19} style={{ color: theme.secondary_color }} />
            <div>
              <p className="text-xs font-bold text-black/45">Horario</p>
              <p className="text-sm font-black">{hours}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3">
            <Phone size={19} style={{ color: theme.primary_color }} />
            <div>
              <p className="text-xs font-bold text-black/45">Contacto</p>
              {restaurant.phone ? (
                <a className="text-sm font-black hover:underline" href={`tel:${restaurant.phone}`}>
                  {restaurant.phone}
                </a>
              ) : (
                <p className="text-sm font-black">No disponible</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4">
            <p className="text-sm font-black" style={{ color: theme.secondary_color }}>
              Platos y precios
            </p>
            <h2 className="text-2xl font-black">Abre la carta</h2>
          </div>
          <NotebookMenu
            items={items}
            restaurantName={restaurant.name}
            theme={theme}
          />
        </section>
      </div>
    </main>
  );
}
