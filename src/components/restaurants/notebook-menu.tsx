"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import type { MenuItem, RestaurantTheme } from "@/lib/restaurants/types";

type NotebookMenuProps = {
  items: MenuItem[];
  restaurantName: string;
  theme: Pick<
    RestaurantTheme,
    "primary_color" | "secondary_color" | "accent_color" | "notebook_style"
  >;
};

export function NotebookMenu({
  items,
  restaurantName,
  theme,
}: NotebookMenuProps) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))),
    [items],
  );
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const visibleItems = items.filter((item) => item.category === activeCategory);
  const notebookStyle = {
    "--menu-primary": theme.primary_color,
    "--menu-secondary": theme.secondary_color,
    "--menu-accent": theme.accent_color,
  } as CSSProperties;

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-black/20 bg-white p-8 text-center">
        <p className="font-black">Este restaurante esta preparando su menu.</p>
        <p className="mt-1 text-sm text-black/55">Vuelve pronto para conocer sus platos.</p>
      </div>
    );
  }

  return (
    <section style={notebookStyle} aria-label={`Menu de ${restaurantName}`}>
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 pl-1" role="tablist">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            onClick={() => {
              setActiveCategory(category);
              setExpandedItem(null);
            }}
            className="h-10 shrink-0 rounded-lg border px-4 text-sm font-black transition"
            style={
              activeCategory === category
                ? {
                    backgroundColor: theme.primary_color,
                    borderColor: theme.primary_color,
                    color: "white",
                  }
                : { backgroundColor: "white", borderColor: "rgb(0 0 0 / 10%)" }
            }
          >
            {category}
          </button>
        ))}
      </div>

      <div className={`spiral-notebook notebook-style-${theme.notebook_style} notebook-shadow relative pl-7 sm:pl-10`}>
        <div className="spiral-binding" aria-hidden="true">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className="spiral-ring" />
          ))}
        </div>
        <div
          key={activeCategory}
          className={`menu-page notebook-sheet overflow-hidden rounded-r-lg border border-black/10 bg-white ${
            theme.notebook_style === "minimal" ? "" : "notebook-paper"
          }`}
        >
          {theme.notebook_style === "andino" && (
            <div className="notebook-weave flex h-1.5" aria-hidden="true">
              {Array.from({ length: 9 }).map((_, index) => (
                <span
                  key={index}
                  className="flex-1"
                  style={{
                    backgroundColor:
                      index % 3 === 0
                        ? theme.primary_color
                        : index % 3 === 1
                          ? theme.secondary_color
                          : theme.accent_color,
                  }}
                />
              ))}
            </div>
          )}
          <header className="border-b-2 px-4 py-4 sm:px-6" style={{ borderColor: theme.accent_color }}>
            <p className="text-xs font-black uppercase" style={{ color: theme.secondary_color }}>
              Carta de la casa
            </p>
            <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-2xl font-black" style={{ color: theme.primary_color }}>
                {activeCategory}
              </h2>
              <span className="text-xs font-bold text-black/45">Precios en bolivianos</span>
            </div>
          </header>

          <div className="divide-y divide-[#277da1]/15 px-3 sm:px-6">
            {visibleItems.map((item) => {
              const expanded = expandedItem === item.id;

              return (
                <article key={item.id} className="py-4">
                  <button
                    type="button"
                    onClick={() => setExpandedItem(expanded ? null : item.id)}
                    className="grid w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-left sm:grid-cols-[auto_minmax(0,1fr)_auto]"
                    aria-expanded={expanded}
                  >
                    <span
                      className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#eef5f8]"
                      style={
                        item.image_url
                          ? {
                              backgroundImage: `url(${JSON.stringify(item.image_url).slice(1, -1)})`,
                              backgroundPosition: "center",
                              backgroundSize: "cover",
                            }
                          : undefined
                      }
                    >
                      {!item.image_url && <ImageIcon size={19} className="text-[#277da1]/55" />}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-black">{item.name}</span>
                      <span
                        className={`mt-0.5 block text-xs font-bold ${
                          item.is_available ? "text-[#18664f]" : "text-[#a32323]"
                        }`}
                      >
                        {item.is_available ? "Disponible ahora" : "Agotado por hoy"}
                      </span>
                    </span>
                    <span className="col-span-2 ml-[60px] flex items-center justify-between gap-2 sm:col-span-1 sm:ml-0">
                      <span
                        className="whitespace-nowrap text-lg font-black"
                        style={{ color: theme.primary_color }}
                      >
                        Bs {Number(item.price).toFixed(2)}
                      </span>
                      {item.description &&
                        (expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />)}
                    </span>
                  </button>
                  {expanded && item.description && (
                    <div className="ml-[60px] mt-3 border-l-2 pl-3 text-sm leading-6 text-black/60" style={{ borderColor: theme.accent_color }}>
                      {item.description}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          <footer className="flex items-center justify-between border-t border-black/10 px-4 py-3 text-[11px] font-bold text-black/40 sm:px-6">
            <span>{restaurantName}</span>
            <span>{visibleItems.length} platos</span>
          </footer>
        </div>
      </div>
    </section>
  );
}
