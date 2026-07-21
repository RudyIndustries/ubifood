import { Leaf, MapPin, Radio, ShieldCheck, Store } from "lucide-react";
import {
  RestaurantExplorer,
  type ExplorerRestaurant,
} from "@/components/restaurants/restaurant-explorer";
import {
  RescueDeals,
  type RescueDealWithRestaurant,
} from "@/components/restaurants/rescue-deals";
import { UvAdvisor } from "@/components/weather/uv-advisor";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ClientePage() {
  const profile = await requireProfile(["cliente", "admin"]);
  const supabase = await createSupabaseServerClient();
  const [restaurantResult, rescueResult] = await Promise.all([
    supabase
      .from("restaurants")
      .select("*,restaurant_theme(*),menu_items(*)")
      .eq("status", "approved")
      .order("name")
      .returns<ExplorerRestaurant[]>(),
    supabase
      .from("rescue_deals")
      .select(
        "*,restaurants!inner(id,name,slug,zone,status,restaurant_theme(*))",
      )
      .eq("is_active", true)
      .gt("quantity_available", 0)
      .gt("expires_at", new Date().toISOString())
      .eq("restaurants.status", "approved")
      .order("expires_at")
      .returns<RescueDealWithRestaurant[]>(),
  ]);
  const rescueDeals = rescueResult.data ?? [];
  const rescueCountByRestaurant = new Map<string, number>();
  rescueDeals.forEach((deal) => {
    const relationship = Array.isArray(deal.restaurants)
      ? deal.restaurants[0]
      : deal.restaurants;
    if (relationship) {
      rescueCountByRestaurant.set(
        relationship.id,
        (rescueCountByRestaurant.get(relationship.id) ?? 0) + 1,
      );
    }
  });
  const restaurants = (restaurantResult.data ?? []).map((restaurant) => ({
    ...restaurant,
    rescue_count: rescueCountByRestaurant.get(restaurant.id) ?? 0,
  }));

  return (
    <div>
      <section className="ubifood-reveal grid overflow-hidden border-b border-black/10 bg-white md:grid-cols-[1fr_390px]">
        <div className="flex flex-col justify-center px-4 py-5 sm:px-6 md:min-h-52">
          <div className="mb-3 flex w-fit items-center gap-2 text-xs font-black text-black/55">
            <span className="grid size-7 place-items-center rounded-md bg-[#eef5f8] text-[#277da1]">
              <MapPin size={15} />
            </span>
            La Paz, Bolivia
          </div>
          <p className="text-sm font-black text-[#d62828]">
            Hola, {profile.full_name || "foodie"}
          </p>
          <h1 className="mt-1 max-w-xl text-3xl font-black leading-tight sm:text-4xl">
            ¿Qué vas a comer hoy?
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-black/55">
            Encuentra comida cercana, compara precios y revisa la ruta antes de salir.
          </p>
          <div className="ubifood-stagger mt-4 flex flex-wrap gap-2 text-xs font-black">
            <span className="inline-flex items-center gap-2 rounded-md bg-[#f7f4ed] px-3 py-2">
              <Store size={15} className="text-[#d62828]" /> {restaurants.length} restaurantes
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-[#e8f5ef] px-3 py-2 text-[#18664f]">
              <Leaf size={15} className="text-[#43aa8b]" /> {rescueDeals.length} Crazy Hour
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-[#eef5f8] px-3 py-2 text-[#245f78]">
              <span className="ubifood-live-dot size-2 rounded-full bg-[#43aa8b]" />
              <Radio size={15} className="text-[#43aa8b]" /> La Paz ahora
            </span>
          </div>
        </div>
        <div
          id="clima"
          className="ubifood-panel-rise scroll-mt-20 bg-[#211c18] p-4 text-sm text-white sm:p-5"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-[#f9c74f]">Antes de salir</p>
              <h2 className="text-lg font-black">Clima en tu ruta</h2>
            </div>
            <span className="ubifood-live-dot size-2 rounded-full bg-[#43aa8b]" />
          </div>
          <UvAdvisor />
          <div className="mt-2 flex items-center gap-3 border-t border-white/10 pt-3">
            {profile.role === "admin" ? (
              <ShieldCheck size={19} className="text-[#43aa8b]" />
            ) : (
              <MapPin size={19} className="text-[#43aa8b]" />
            )}
            <div>
              <p className="font-black">La Paz</p>
              <p className="text-xs text-white/55">Pronostico segun tu ubicacion</p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-2">
        <RestaurantExplorer restaurants={restaurants} />
      </div>

      <RescueDeals deals={rescueDeals} />
    </div>
  );
}
