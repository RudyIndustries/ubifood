"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  LayoutList,
  Leaf,
  Map as MapIcon,
  MapPin,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import {
  RestaurantMap,
  type MapRestaurant,
} from "@/components/map/restaurant-map";
import type {
  MenuItem,
  Restaurant,
  RestaurantTheme,
} from "@/lib/restaurants/types";

export type ExplorerRestaurant = Restaurant & {
  restaurant_theme: RestaurantTheme | RestaurantTheme[] | null;
  menu_items: MenuItem[];
  rescue_count: number;
};

type RestaurantExplorerProps = {
  restaurants: ExplorerRestaurant[];
};

function primaryColor(restaurant: ExplorerRestaurant) {
  const relationship = Array.isArray(restaurant.restaurant_theme)
    ? restaurant.restaurant_theme[0]
    : restaurant.restaurant_theme;
  return relationship?.primary_color ?? "#d62828";
}

function restaurantTheme(restaurant: ExplorerRestaurant) {
  const relationship = Array.isArray(restaurant.restaurant_theme)
    ? restaurant.restaurant_theme[0]
    : restaurant.restaurant_theme;
  return {
    primary_color: relationship?.primary_color ?? "#d62828",
    secondary_color: relationship?.secondary_color ?? "#277da1",
    accent_color: relationship?.accent_color ?? "#f9c74f",
  };
}

export function RestaurantExplorer({ restaurants }: RestaurantExplorerProps) {
  const [query, setQuery] = useState("");
  const [priceLevel, setPriceLevel] = useState(0);
  const [view, setView] = useState<"map" | "list">("map");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");

    return restaurants.filter((restaurant) => {
      const matchesPrice = priceLevel === 0 || restaurant.price_level === priceLevel;
      const searchable = `${restaurant.name} ${restaurant.category} ${restaurant.zone}`.toLocaleLowerCase(
        "es",
      );
      return matchesPrice && (!needle || searchable.includes(needle));
    });
  }, [priceLevel, query, restaurants]);
  const mapRestaurants = useMemo<MapRestaurant[]>(
    () =>
      filtered.map((restaurant) => {
        const availableItems = restaurant.menu_items.filter(
          (item) => item.is_available,
        );
        return {
          id: restaurant.id,
          name: restaurant.name,
          slug: restaurant.slug,
          category: restaurant.category,
          zone: restaurant.zone,
          address: restaurant.address,
          latitude: Number(restaurant.latitude),
          longitude: Number(restaurant.longitude),
          color: primaryColor(restaurant),
          startingPrice: availableItems.length
            ? Math.min(...availableItems.map((item) => Number(item.price)))
            : null,
          availableItems: availableItems.length,
          rescueCount: restaurant.rescue_count,
          menuItems: restaurant.menu_items,
          theme: restaurantTheme(restaurant),
        };
      }),
    [filtered],
  );

  return (
    <section>
      <div className="grid gap-3 border-y border-black/10 py-4 sm:grid-cols-[1fr_auto]">
        <label className="relative block">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold outline-none ring-[#277da1]/20 focus:ring-4"
            placeholder="Buscar restaurante, comida o zona"
          />
        </label>
        <div className="flex gap-1 rounded-lg bg-white p-1" aria-label="Filtrar por precio">
          {[0, 1, 2, 3, 4].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setPriceLevel(level)}
              title={level === 0 ? "Todos los precios" : `Nivel de precio ${level}`}
              className={`h-9 min-w-10 rounded-md px-2 text-xs font-black transition ${
                priceLevel === level
                  ? "bg-[#211c18] text-white"
                  : "text-black/55 hover:bg-[#f7f4ed]"
              }`}
            >
              {level === 0 ? "Todos" : "$".repeat(level)}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[#d62828]">Cerca de ti</p>
          <h2 className="text-2xl font-black">Restaurantes aprobados</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-black/45">{filtered.length} resultados</span>
          <div className="flex rounded-lg bg-white p-1" aria-label="Vista de resultados">
            <button
              type="button"
              onClick={() => setView("map")}
              title="Ver mapa"
              aria-pressed={view === "map"}
              className={`grid size-9 place-items-center rounded-md ${
                view === "map" ? "bg-[#277da1] text-white" : "text-black/50"
              }`}
            >
              <MapIcon size={17} />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              title="Ver lista"
              aria-pressed={view === "list"}
              className={`grid size-9 place-items-center rounded-md ${
                view === "list" ? "bg-[#277da1] text-white" : "text-black/50"
              }`}
            >
              <LayoutList size={17} />
            </button>
          </div>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-4">
          <RestaurantMap restaurants={mapRestaurants} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-black/20 bg-white/60 p-8 text-center">
          <UtensilsCrossed className="mx-auto text-black/35" />
          <p className="mt-3 font-black">No encontramos coincidencias</p>
          <p className="mt-1 text-sm text-black/55">Prueba otra zona, comida o nivel de precio.</p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((restaurant) => {
            const availableItems = restaurant.menu_items.filter((item) => item.is_available);
            const startingPrice = availableItems.length
              ? Math.min(...availableItems.map((item) => Number(item.price)))
              : null;
            const color = primaryColor(restaurant);

            return (
              <article key={restaurant.id} className="overflow-hidden rounded-lg bg-white shadow-lg shadow-black/5">
                <div
                  className="relative flex aspect-[16/8] items-end bg-cover bg-center p-4 text-white"
                  style={{
                    backgroundColor: color,
                    backgroundImage: restaurant.cover_url
                      ? `url(${restaurant.cover_url})`
                      : undefined,
                  }}
                >
                  <span className="rounded-md bg-black/55 px-2 py-1 text-xs font-black backdrop-blur">
                    {restaurant.category}
                  </span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-black">{restaurant.name}</h3>
                      <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black/50">
                        <MapPin size={14} /> {restaurant.zone}
                      </p>
                    </div>
                    <span className="whitespace-nowrap text-sm font-black" style={{ color }}>
                      {startingPrice === null ? "Sin precios" : `Desde Bs ${startingPrice.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/5 pt-3">
                    <div className="text-xs font-bold text-black/45">
                      <span>{availableItems.length} platos disponibles</span>
                      {restaurant.rescue_count > 0 && (
                        <span className="ml-2 inline-flex items-center gap-1 text-[#18664f]">
                          <Leaf size={13} /> {restaurant.rescue_count} rescates
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/restaurantes/${restaurant.slug}`}
                      className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black text-white"
                      style={{ backgroundColor: color }}
                    >
                      <BookOpen size={15} /> Ver menu
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
