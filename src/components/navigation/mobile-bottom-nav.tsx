"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CloudSun,
  Compass,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPinned,
  ShieldCheck,
  Store,
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";

type MobileBottomNavProps = {
  role: "admin" | "cliente" | "comercio";
};

const roleItems = {
  cliente: [
    { href: "/cliente#explorar", label: "Explorar", Icon: Compass },
    { href: "/cliente#rescates", label: "Rescates", Icon: Leaf },
    { href: "/cliente#clima", label: "Clima", Icon: CloudSun },
  ],
  comercio: [
    { href: "/comercio", label: "Panel", Icon: LayoutDashboard },
    { href: "/comercio/menu", label: "Carta", Icon: BookOpen },
    { href: "/comercio/rescates", label: "Rescates", Icon: Leaf },
  ],
  admin: [
    { href: "/cliente", label: "Mapa", Icon: MapPinned },
    { href: "/admin", label: "Control", Icon: ShieldCheck },
    { href: "/admin#negocios", label: "Negocios", Icon: Store },
  ],
} as const;

function itemIsActive(pathname: string, hash: string, href: string, index: number) {
  const [path, itemHash = ""] = href.split("#");
  if (pathname !== path) return false;
  if (itemHash) return hash === `#${itemHash}` || (!hash && index === 0);
  return !hash;
}

export function MobileBottomNav({ role }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const updateHash = () => setHash(window.location.hash);
    updateHash();
    window.addEventListener("hashchange", updateHash);
    return () => window.removeEventListener("hashchange", updateHash);
  }, [pathname]);

  return (
    <nav
      aria-label="Navegacion principal"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[#181715]/95 px-2 pt-2 text-white shadow-[0_-12px_32px_rgba(0,0,0,0.16)] backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "max(0.55rem, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {roleItems[role].map(({ href, label, Icon }, index) => {
          const active = itemIsActive(pathname, hash, href, index);
          return (
            <Link
              key={`${href}-${label}`}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`group flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-bold transition active:scale-95 ${
                active ? "text-white" : "text-white/55 hover:text-white"
              }`}
            >
              <span
                className={`grid size-9 place-items-center rounded-lg transition ${
                  active
                    ? "bg-white text-[#181715] shadow-lg shadow-black/25"
                    : "group-hover:bg-white/10"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
              </span>
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}

        <form action={logoutAction} className="min-w-0">
          <button
            type="submit"
            aria-label="Cerrar sesion"
            className="flex w-full flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-[10px] font-bold text-white/55 transition hover:text-white active:scale-95"
          >
            <span className="grid size-9 place-items-center rounded-lg bg-[#d62828] text-white">
              <LogOut size={19} />
            </span>
            <span>Salir</span>
          </button>
        </form>
      </div>
    </nav>
  );
}
