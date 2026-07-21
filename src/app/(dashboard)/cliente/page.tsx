import { CloudSun, MapPin, ShieldCheck } from "lucide-react";
import {
  RestaurantExplorer,
  type ExplorerRestaurant,
} from "@/components/restaurants/restaurant-explorer";
import {
  RescueDeals,
  type RescueDealWithRestaurant,
} from "@/components/restaurants/rescue-deals";
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
      <section className="grid gap-3 bg-[#211c18] p-5 text-white sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <p className="text-sm font-black text-[#f9c74f]">Hola, {profile.full_name || "foodie"}</p>
          <h1 className="mt-1 text-2xl font-black">¿Que comemos hoy en La Paz?</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/65">
            Compara opciones aprobadas, revisa sus precios y abre la carta completa.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-white/10 p-3">
            <CloudSun size={19} className="text-[#f9c74f]" />
            <p className="mt-2 font-black">UV pendiente</p>
            <p className="text-xs text-white/55">Se conectara al clima</p>
          </div>
          <div className="rounded-lg bg-white/10 p-3">
            {profile.role === "admin" ? (
              <ShieldCheck size={19} className="text-[#43aa8b]" />
            ) : (
              <MapPin size={19} className="text-[#43aa8b]" />
            )}
            <p className="mt-2 font-black">La Paz</p>
            <p className="text-xs text-white/55">Ubicacion inicial</p>
          </div>
        </div>
      </section>

      <RescueDeals deals={rescueDeals} />

      <div className="mt-5">
        <RestaurantExplorer restaurants={restaurants} />
      </div>
    </div>
  );
}
