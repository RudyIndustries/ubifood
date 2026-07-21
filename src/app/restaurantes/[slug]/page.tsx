import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock3, MapPin, MessageSquare, Phone, Star, Store } from "lucide-react";
import { NotebookMenu } from "@/components/restaurants/notebook-menu";
import { RestaurantRatingForm } from "@/components/restaurants/restaurant-rating-form";
import type { AppRole } from "@/lib/auth/types";
import type {
  MenuItem,
  Restaurant,
  RestaurantRating,
  RestaurantTheme,
} from "@/lib/restaurants/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RestaurantPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
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

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function ratingMessage(value: string | undefined) {
  if (value === "saved") return { kind: "success", text: "Tu calificacion fue guardada." };
  if (value === "deleted") return { kind: "success", text: "Tu calificacion fue eliminada." };
  if (value === "invalid") return { kind: "error", text: "Elige entre una y cinco estrellas." };
  if (value === "error") return { kind: "error", text: "No pudimos guardar la calificacion." };
  return null;
}

function RatingStars({ value, size = 17 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rounded ? "#f9c74f" : "transparent"}
          className={star <= rounded ? "text-[#d99800]" : "text-black/15"}
        />
      ))}
    </span>
  );
}

function reviewDate(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/La_Paz",
  }).format(new Date(value));
}

export default async function RestaurantPage({ params, searchParams }: RestaurantPageProps) {
  const { slug } = await params;
  const query = searchParams ? await searchParams : {};
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

  const [menuResult, ratingResult, authResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("category")
      .order("name")
      .returns<MenuItem[]>(),
    supabase
      .from("restaurant_ratings")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("updated_at", { ascending: false })
      .returns<RestaurantRating[]>(),
    supabase.auth.getUser(),
  ]);
  const items = menuResult.data ?? [];
  const ratings = ratingResult.data ?? [];
  const user = authResult.data.user;
  let profileRole: AppRole | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle<{ role: AppRole }>();
    profileRole = profile?.role ?? null;
  }
  const average = ratings.length
    ? ratings.reduce((total, entry) => total + Number(entry.rating), 0) / ratings.length
    : null;
  const currentRating = user
    ? ratings.find((entry) => entry.user_id === user.id)
    : undefined;
  const reviews = ratings.filter((entry) => entry.comment);
  const message = ratingMessage(firstParam(query, "rating"));
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
            <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-black/25 px-3 py-2 text-sm font-black backdrop-blur-sm">
              <Star size={18} fill="#f9c74f" className="text-[#f9c74f]" />
              {average === null
                ? "Aun sin calificaciones"
                : `${average.toFixed(1)} de 5 (${ratings.length})`}
            </div>
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

        <section id="calificaciones" className="mt-8 scroll-mt-20 border-t border-black/10 pt-6">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#d99800]">Experiencias verificadas por cuenta</p>
              <h2 className="text-2xl font-black">Calificaciones</h2>
            </div>
            <div className="flex items-center gap-3 rounded-lg bg-white px-4 py-3 shadow-sm">
              <span className="text-3xl font-black">{average === null ? "-" : average.toFixed(1)}</span>
              <div>
                <RatingStars value={average ?? 0} />
                <p className="text-xs font-bold text-black/45">{ratings.length} opiniones</p>
              </div>
            </div>
          </div>

          {message && (
            <p className={`mb-4 rounded-lg px-4 py-3 text-sm font-bold ${
              message.kind === "success"
                ? "bg-[#e8f5ef] text-[#18664f]"
                : "bg-[#fff0ed] text-[#a32323]"
            }`}>
              {message.text}
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              {profileRole === "cliente" ? (
                <RestaurantRatingForm
                  restaurantId={restaurant.id}
                  defaultRating={currentRating?.rating}
                  defaultComment={currentRating?.comment}
                  hasRating={Boolean(currentRating)}
                />
              ) : !user ? (
                <div className="rounded-lg bg-white p-5 shadow-lg shadow-black/5">
                  <Star className="text-[#d99800]" fill="#f9c74f" />
                  <p className="mt-3 font-black">¿Ya comiste aqui?</p>
                  <p className="mt-1 text-sm text-black/55">Inicia sesion como cliente para calificar.</p>
                  <Link href="/auth/login" className="mt-4 inline-flex h-10 items-center rounded-lg bg-[#211c18] px-4 text-sm font-black text-white">
                    Iniciar sesion
                  </Link>
                </div>
              ) : (
                <div className="rounded-lg bg-white p-5 text-sm font-bold text-black/55 shadow-lg shadow-black/5">
                  Las calificaciones se publican desde cuentas cliente.
                </div>
              )}
            </div>

            <div>
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare size={19} className="text-[#277da1]" />
                <h3 className="text-lg font-black">Lo que dicen los clientes</h3>
              </div>
              {reviews.length === 0 ? (
                <div className="rounded-lg border border-dashed border-black/15 bg-white/60 p-6 text-center">
                  <p className="font-black">Todavia no hay comentarios</p>
                  <p className="mt-1 text-sm text-black/50">La primera experiencia puede ser la tuya.</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {reviews.map((review) => (
                    <article key={review.id} className="rounded-lg bg-white p-4 shadow-lg shadow-black/5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="grid size-8 place-items-center rounded-full bg-[#eef5f8] text-xs font-black text-[#277da1]">U</span>
                          <p className="text-sm font-black">
                            {review.user_id === user?.id ? "Tu opinion" : "Cliente Ubifood"}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-black/40">{reviewDate(review.updated_at)}</span>
                      </div>
                      <div className="mt-2"><RatingStars value={Number(review.rating)} size={15} /></div>
                      <p className="mt-2 text-sm leading-6 text-black/65">{review.comment}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
