"use client";

import { useState, type CSSProperties } from "react";
import { BookOpen, ImageIcon, Palette } from "lucide-react";
import type { RestaurantTheme } from "@/lib/restaurants/types";

type RestaurantThemeEditorProps = {
  restaurantName: string;
  coverUrl: string;
  theme: RestaurantTheme;
};

const styles = [
  { id: "andino", label: "Andino" },
  { id: "clasico", label: "Clasico" },
  { id: "minimal", label: "Minimal" },
];

export function RestaurantThemeEditor({
  restaurantName,
  coverUrl: initialCoverUrl,
  theme: initialTheme,
}: RestaurantThemeEditorProps) {
  const [coverUrl, setCoverUrl] = useState(initialCoverUrl);
  const [primary, setPrimary] = useState(initialTheme.primary_color);
  const [secondary, setSecondary] = useState(initialTheme.secondary_color);
  const [accent, setAccent] = useState(initialTheme.accent_color);
  const [notebookStyle, setNotebookStyle] = useState(initialTheme.notebook_style);
  const previewStyle = {
    "--preview-primary": primary,
    "--preview-secondary": secondary,
    "--preview-accent": accent,
  } as CSSProperties;

  return (
    <section className="mt-6 border-t border-black/10 pt-5" style={previewStyle}>
      <div className="flex items-center gap-3">
        <Palette className="text-[#277da1]" />
        <div>
          <p className="text-sm font-bold text-[#277da1]">Identidad del negocio</p>
          <h3 className="text-xl font-black">Portada y menu cuaderno</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <label className="block">
            <span className="text-sm font-bold text-black/65">URL de portada</span>
            <div className="relative mt-2">
              <ImageIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={18} />
              <input
                name="coverUrl"
                type="url"
                maxLength={500}
                value={coverUrl}
                onChange={(event) => setCoverUrl(event.target.value)}
                className="h-11 w-full rounded-lg border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold outline-none ring-[#277da1]/20 focus:ring-4"
                placeholder="https://..."
              />
            </div>
          </label>

          <fieldset>
            <legend className="text-sm font-bold text-black/65">Estilo de la carta</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {styles.map((style) => (
                <label
                  key={style.id}
                  className={`grid h-11 cursor-pointer place-items-center rounded-lg border text-xs font-black transition ${
                    notebookStyle === style.id
                      ? "border-[#211c18] bg-[#211c18] text-white"
                      : "border-black/10 bg-white text-black/55"
                  }`}
                >
                  <input
                    type="radio"
                    name="notebookStyle"
                    value={style.id}
                    checked={notebookStyle === style.id}
                    onChange={() => setNotebookStyle(style.id)}
                    className="sr-only"
                  />
                  {style.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ["primaryColor", "Principal", primary, setPrimary],
              ["secondaryColor", "Secundario", secondary, setSecondary],
              ["accentColor", "Acento", accent, setAccent],
            ].map(([name, label, value, update]) => (
              <label key={String(name)} className="block">
                <span className="text-xs font-bold text-black/55">{String(label)}</span>
                <span className="mt-2 flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-2">
                  <input
                    name={String(name)}
                    type="color"
                    value={String(value)}
                    onChange={(event) => (update as (color: string) => void)(event.target.value)}
                    className="size-7 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <span className="truncate font-mono text-[11px] font-bold text-black/50">{String(value)}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-lg shadow-black/10">
          <div
            className="relative flex aspect-[16/7] items-end bg-cover bg-center p-3 text-white"
            style={{
              backgroundColor: primary,
              backgroundImage: coverUrl
                ? `linear-gradient(rgb(0 0 0 / 15%), rgb(0 0 0 / 65%)), url(${JSON.stringify(coverUrl)})`
                : undefined,
            }}
          >
            <div>
              <p className="text-[9px] font-black uppercase text-white/70">Vista previa</p>
              <p className="font-black">{restaurantName || "Tu restaurante"}</p>
            </div>
          </div>
          <div className={`theme-preview theme-preview-${notebookStyle} relative p-4 pl-8`}>
            <span className="absolute inset-y-0 left-4 w-px" style={{ backgroundColor: accent }} />
            <div className="flex items-center gap-2" style={{ color: primary }}>
              <BookOpen size={16} />
              <p className="text-sm font-black">Menu del dia</p>
            </div>
            <div className="mt-3 space-y-2 text-xs font-bold">
              <div className="flex justify-between gap-3"><span>Plato especial</span><span style={{ color: primary }}>Bs 25</span></div>
              <div className="flex justify-between gap-3"><span>Bebida de la casa</span><span style={{ color: secondary }}>Bs 8</span></div>
            </div>
            <div className="mt-4 flex h-1 overflow-hidden" aria-hidden="true">
              <span className="flex-1" style={{ backgroundColor: primary }} />
              <span className="flex-1" style={{ backgroundColor: secondary }} />
              <span className="flex-1" style={{ backgroundColor: accent }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
