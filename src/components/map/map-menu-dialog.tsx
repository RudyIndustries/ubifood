"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { NotebookMenu } from "@/components/restaurants/notebook-menu";
import type { MenuItem, RestaurantTheme } from "@/lib/restaurants/types";

type MapMenuDialogProps = {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  restaurantSlug: string;
  items: MenuItem[];
  theme: Pick<RestaurantTheme, "primary_color" | "secondary_color" | "accent_color">;
};

export function MapMenuDialog({
  open,
  onClose,
  restaurantName,
  restaurantSlug,
  items,
  theme,
}: MapMenuDialogProps) {
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.body.style.overflow = "";
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-[#211c18]/70 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`Menu de ${restaurantName}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="menu-dialog-enter flex max-h-[calc(100dvh-24px)] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-[#f7f4ed] shadow-2xl sm:max-h-[calc(100dvh-48px)]">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black/10 bg-white px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase text-[#d62828]">Carta completa</p>
            <h2 className="truncate text-lg font-black">{restaurantName}</h2>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/restaurantes/${restaurantSlug}`}
              title="Abrir ficha del restaurante"
              className="grid size-10 place-items-center rounded-md text-black/55 hover:bg-black/5"
            >
              <ExternalLink size={18} />
            </Link>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar menu"
              className="grid size-10 place-items-center rounded-md text-black/60 hover:bg-black/5"
            >
              <X size={20} />
            </button>
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
          <NotebookMenu
            items={items}
            restaurantName={restaurantName}
            theme={theme}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
