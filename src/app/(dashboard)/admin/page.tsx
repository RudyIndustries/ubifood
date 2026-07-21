import { ShieldCheck, Store, UsersRound, type LucideIcon } from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AdminRestaurant, RestaurantStatus } from "@/lib/restaurants/types";
import { updateRestaurantStatusAction } from "./actions";

type AdminPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const statusStyles: Record<RestaurantStatus, string> = {
  pending: "bg-[#fff4e0] text-[#8a5a00]",
  approved: "bg-[#e8f5ef] text-[#18664f]",
  blocked: "bg-[#fff0ed] text-[#a32323]",
};

type MetricCard = {
  Icon: LucideIcon;
  title: string;
  value: number;
};

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function ownerLabel(restaurant: AdminRestaurant) {
  const profile = Array.isArray(restaurant.profiles)
    ? restaurant.profiles[0]
    : restaurant.profiles;

  return profile?.full_name || profile?.email || "Sin propietario";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const profile = await requireProfile(["admin"]);
  const params = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("restaurants")
    .select("*,profiles:owner_id(email,full_name)")
    .order("created_at", { ascending: false })
    .returns<AdminRestaurant[]>();
  const restaurants = data ?? [];

  const status = firstParam(params, "status");
  const error = firstParam(params, "error");
  const pendingCount = restaurants.filter(
    (restaurant) => restaurant.status === "pending",
  ).length;
  const approvedCount = restaurants.filter(
    (restaurant) => restaurant.status === "approved",
  ).length;
  const metricCards: MetricCard[] = [
    {
      Icon: Store,
      title: "Pendientes",
      value: pendingCount,
    },
    {
      Icon: ShieldCheck,
      title: "Aprobados",
      value: approvedCount,
    },
    {
      Icon: UsersRound,
      title: "Total",
      value: restaurants.length,
    },
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-[0.85fr_1fr]">
      <section className="rounded-lg bg-[#d62828] p-5 text-white shadow-2xl shadow-[#d62828]/20">
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-white/70">
          Panel admin
        </p>
        <h1 className="mt-2 text-3xl font-black">Control Ubifood</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Sesion admin: {profile.email}. Aprueba negocios para que aparezcan a
          clientes.
        </p>

        {status && (
          <p className="mt-4 rounded-2xl bg-white/15 px-4 py-3 text-sm font-bold">
            Estado actualizado a {status}.
          </p>
        )}
        {error && (
          <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-[#a32323]">
            No se pudo actualizar el restaurante.
          </p>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {metricCards.map(({ Icon, title, value }) => (
          <article
            key={title}
            className="rounded-lg bg-white p-4 shadow-xl shadow-black/5"
          >
            <Icon className="mb-3 text-[#d62828]" />
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-3xl font-black text-[#211c18]">{value}</p>
          </article>
        ))}
      </section>

      <section
        id="negocios"
        className="scroll-mt-20 rounded-lg bg-white p-5 shadow-xl shadow-black/5 lg:col-span-2"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[#d62828]">Restaurantes</p>
            <h2 className="text-2xl font-black">Revision de negocios</h2>
          </div>
          <span className="rounded-full bg-[#f7f4ed] px-3 py-1 text-sm font-black">
            {restaurants.length}
          </span>
        </div>

        {restaurants.length === 0 ? (
          <p className="rounded-lg bg-[#f7f4ed] p-5 text-sm font-bold text-black/60">
            Todavia no hay restaurantes registrados.
          </p>
        ) : (
          <div className="grid gap-3">
            {restaurants.map((restaurant) => (
              <article
                key={restaurant.id}
                className="grid gap-4 rounded-lg border border-black/5 bg-[#fbfaf7] p-4 md:grid-cols-[1fr_auto]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-black">{restaurant.name}</h3>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[restaurant.status]}`}
                    >
                      {restaurant.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-black/60">
                    {restaurant.zone} · {restaurant.address}
                  </p>
                  <p className="mt-1 text-sm text-black/55">
                    Propietario: {ownerLabel(restaurant)}
                  </p>
                  {restaurant.description && (
                    <p className="mt-2 text-sm leading-6 text-black/65">
                      {restaurant.description}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 md:w-80">
                  {(["pending", "approved", "blocked"] as RestaurantStatus[]).map(
                    (nextStatus) => (
                      <form
                        key={nextStatus}
                        action={updateRestaurantStatusAction}
                      >
                        <input
                          type="hidden"
                          name="restaurantId"
                          value={restaurant.id}
                        />
                        <input type="hidden" name="status" value={nextStatus} />
                        <button
                          className={`h-11 w-full rounded-lg px-3 text-xs font-black transition ${
                            restaurant.status === nextStatus
                              ? "bg-[#211c18] text-white"
                              : "bg-white text-[#211c18] hover:bg-[#fff4e0]"
                          }`}
                        >
                          {nextStatus}
                        </button>
                      </form>
                    ),
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
