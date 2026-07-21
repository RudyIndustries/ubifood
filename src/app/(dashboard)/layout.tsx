import Link from "next/link";
import {
  BookOpen,
  Leaf,
  MapPin,
  ShieldCheck,
  Store,
  Utensils,
} from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { MobileBottomNav } from "@/components/navigation/mobile-bottom-nav";
import { requireProfile } from "@/lib/auth/session";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await requireProfile();

  return (
    <main className="min-h-screen bg-[#f7f4ed]">
      <nav className="sticky top-0 z-40 border-b border-black/5 bg-white/90 px-4 py-2.5 backdrop-blur-xl md:py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="ubifood-brand flex items-center gap-2 font-black">
            <span className="grid size-9 place-items-center rounded-lg bg-[#d62828] text-white md:size-10">
              <Utensils size={20} />
            </span>
            <span className="tracking-[0.08em]">UBIFOOD</span>
          </Link>
          <div className="hidden items-center gap-2 md:flex">
            {(profile.role === "cliente" || profile.role === "admin") && (
              <Link
                href="/cliente"
                aria-label="Panel cliente"
                title="Explorar restaurantes"
                className="ubifood-icon-button grid size-10 place-items-center rounded-lg bg-[#f7f4ed] text-[#277da1]"
              >
                <MapPin size={18} />
              </Link>
            )}
            {profile.role === "comercio" && (
              <>
                <Link
                  href="/comercio"
                  aria-label="Panel comercio"
                  title="Mi restaurante"
                  className="ubifood-icon-button grid size-10 place-items-center rounded-lg bg-[#f7f4ed] text-[#43aa8b]"
                >
                  <Store size={18} />
                </Link>
                <Link
                  href="/comercio/menu"
                  aria-label="Gestionar menu"
                  title="Gestionar menu"
                  className="ubifood-icon-button grid size-10 place-items-center rounded-lg bg-[#f7f4ed] text-[#d62828]"
                >
                  <BookOpen size={18} />
                </Link>
                <Link
                  href="/comercio/rescates"
                  aria-label="Cero Desperdicio"
                  title="Cero Desperdicio"
                  className="ubifood-icon-button grid size-10 place-items-center rounded-lg bg-[#e8f5ef] text-[#18664f]"
                >
                  <Leaf size={18} />
                </Link>
              </>
            )}
            {profile.role === "admin" && (
              <Link
                href="/admin"
                aria-label="Panel admin"
                title="Panel administrador"
                className="ubifood-icon-button grid size-10 place-items-center rounded-lg bg-[#f7f4ed] text-[#d62828]"
              >
                <ShieldCheck size={18} />
              </Link>
            )}
            <form action={logoutAction}>
              <button className="ubifood-action h-10 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white">
                Salir
              </button>
            </form>
          </div>
        </div>
      </nav>
      <section className="mx-auto max-w-6xl px-3 pb-28 pt-3 sm:px-4 md:py-5">
        {children}
      </section>
      <MobileBottomNav role={profile.role} />
    </main>
  );
}
