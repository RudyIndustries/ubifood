import Link from "next/link";
import { Clock3, Leaf, MapPin } from "lucide-react";
import type {
  RescueDeal,
  RestaurantTheme,
} from "@/lib/restaurants/types";

export type RescueDealWithRestaurant = RescueDeal & {
  restaurants:
    | {
        id: string;
        name: string;
        slug: string;
        zone: string;
        status: "pending" | "approved" | "blocked";
        restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
      }
    | Array<{
        id: string;
        name: string;
        slug: string;
        zone: string;
        status: "pending" | "approved" | "blocked";
        restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
      }>;
};

function restaurantOf(deal: RescueDealWithRestaurant) {
  return Array.isArray(deal.restaurants) ? deal.restaurants[0] : deal.restaurants;
}

function expirationTime(value: string) {
  return new Intl.DateTimeFormat("es-BO", {
    timeZone: "America/La_Paz",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

export function RescueDeals({ deals }: { deals: RescueDealWithRestaurant[] }) {
  if (deals.length === 0) {
    return null;
  }

  return (
    <section
      id="crazy-hour"
      className="ubifood-reveal mt-5 scroll-mt-20"
      aria-labelledby="rescue-title"
    >
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-black text-[#18664f]">
            <Leaf size={17} /> Crazy Hour
          </p>
          <h2 id="rescue-title" className="text-2xl font-black">Ofertas por tiempo limitado</h2>
        </div>
        <span className="text-sm font-bold text-black/45">{deals.length} activas</span>
      </div>
      <div className="ubifood-stagger mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {deals.map((deal) => {
          const restaurant = restaurantOf(deal);
          if (!restaurant) return null;
          const discount = deal.original_price
            ? Math.round((1 - Number(deal.rescue_price) / Number(deal.original_price)) * 100)
            : 0;

          return (
            <article key={deal.id} className="ubifood-lift w-[285px] shrink-0 snap-start rounded-lg border-l-4 border-[#43aa8b] bg-white p-4 shadow-lg shadow-black/5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-[#18664f]">{restaurant.name}</p>
                  <h3 className="mt-1 line-clamp-2 font-black">{deal.title}</h3>
                </div>
                <span className="rounded-md bg-[#e8f5ef] px-2 py-1 text-xs font-black text-[#18664f]">-{discount}%</span>
              </div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-black/35 line-through">Bs {Number(deal.original_price).toFixed(2)}</p>
                  <p className="text-xl font-black text-[#18664f]">Bs {Number(deal.rescue_price).toFixed(2)}</p>
                </div>
                <p className="text-right text-xs font-bold text-black/50">{deal.quantity_available} porciones</p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/5 pt-3 text-xs font-bold text-black/50">
                <span className="flex items-center gap-1"><Clock3 size={14} /> hasta {expirationTime(deal.expires_at)}</span>
                <span className="flex min-w-0 items-center gap-1"><MapPin size={14} /> <span className="truncate">{restaurant.zone}</span></span>
              </div>
              <Link href={`/restaurantes/${restaurant.slug}`} className="ubifood-action mt-3 inline-flex h-9 w-full items-center justify-center rounded-lg bg-[#18664f] px-3 text-xs font-black text-white">
                Ver restaurante
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
