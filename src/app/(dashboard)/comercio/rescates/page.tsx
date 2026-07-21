import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Clock3,
  Eye,
  EyeOff,
  Leaf,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import type { RescueDeal, Restaurant } from "@/lib/restaurants/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteRescueDealAction,
  saveRescueDealAction,
  toggleRescueDealAction,
} from "./actions";

type RescuePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none ring-[#43aa8b]/20 focus:ring-4";

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function savedMessage(value: string | undefined) {
  if (value === "created") return "Oferta publicada en Cero Desperdicio.";
  if (value === "updated") return "Oferta actualizada.";
  if (value === "status") return "Estado de la oferta actualizado.";
  if (value === "deleted") return "Oferta eliminada.";
  return null;
}

function errorMessage(value: string | undefined) {
  if (value === "restaurant-not-approved") {
    return "El restaurante debe estar aprobado antes de publicar rescates.";
  }
  if (value === "invalid-deal") {
    return "Revisa precios, cantidad y vencimiento. El descuento debe ser real y la hora futura.";
  }
  return value ? "No se pudo completar la accion. Intenta nuevamente." : null;
}

function boliviaDateTime(value: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/La_Paz",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(" ", "T");
}

function RescueFields({ deal }: { deal?: RescueDeal }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="dealId" value={deal?.id ?? ""} />
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-black/65">Nombre de la oferta</span>
        <input
          name="title"
          required
          maxLength={100}
          defaultValue={deal?.title ?? ""}
          className={inputClass}
          placeholder="Ej. 2 almuerzos de rescate"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Precio original (Bs)</span>
        <input
          name="originalPrice"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={deal?.original_price ? Number(deal.original_price).toFixed(2) : ""}
          className={inputClass}
          placeholder="30.00"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Precio rescate (Bs)</span>
        <input
          name="rescuePrice"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={deal ? Number(deal.rescue_price).toFixed(2) : ""}
          className={inputClass}
          placeholder="15.00"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Porciones disponibles</span>
        <input
          name="quantity"
          type="number"
          min="1"
          step="1"
          required
          defaultValue={deal?.quantity_available ?? 1}
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Disponible hasta</span>
        <input
          name="expiresAt"
          type="datetime-local"
          required
          defaultValue={deal ? boliviaDateTime(deal.expires_at) : ""}
          className={inputClass}
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-black/65">Detalle</span>
        <textarea
          name="description"
          maxLength={300}
          defaultValue={deal?.description ?? ""}
          className="mt-2 min-h-20 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none ring-[#43aa8b]/20 focus:ring-4"
          placeholder="Que incluye y como se recoge"
        />
      </label>
    </div>
  );
}

export default async function ComercioRescatesPage({ searchParams }: RescuePageProps) {
  const profile = await requireProfile(["comercio", "admin"]);
  const params = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id,name,status")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<Restaurant, "id" | "name" | "status">>();

  if (!restaurant) {
    return (
      <section className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow-xl shadow-black/5">
        <Leaf className="text-[#43aa8b]" />
        <h1 className="mt-4 text-2xl font-black">Primero registra tu restaurante</h1>
        <p className="mt-2 text-sm text-black/60">Las ofertas deben pertenecer a un negocio.</p>
        <Link href="/comercio" className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white">
          <ArrowLeft size={18} /> Ir al restaurante
        </Link>
      </section>
    );
  }

  const { data } = await supabase
    .from("rescue_deals")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("created_at", { ascending: false })
    .returns<RescueDeal[]>();
  const deals = data ?? [];
  // Server snapshot used only to label already expired offers in this request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const activeCount = deals.filter(
    (deal) => deal.is_active && new Date(deal.expires_at).getTime() > now,
  ).length;
  const message = savedMessage(firstParam(params, "saved"));
  const error = errorMessage(firstParam(params, "error"));

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <header className="lg:col-span-2">
        <Link href="/comercio" className="inline-flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black">
          <ArrowLeft size={17} /> Restaurante
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-[#43aa8b]">Cero Desperdicio</p>
            <h1 className="text-3xl font-black">Rescates de {restaurant.name}</h1>
          </div>
          <span className="rounded-lg bg-[#e8f5ef] px-3 py-2 text-sm font-black text-[#18664f]">
            {activeCount} activas
          </span>
        </div>
        {message && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#e8f5ef] px-4 py-3 text-sm font-bold text-[#18664f]">
            <Check size={18} /> {message}
          </p>
        )}
        {error && <p className="mt-3 rounded-lg bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a32323]">{error}</p>}
      </header>

      <section className="self-start rounded-lg bg-[#eef8f3] p-5 shadow-xl shadow-black/5 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-[#43aa8b] text-white"><Plus size={20} /></span>
          <div>
            <p className="text-sm font-bold text-[#18664f]">Accion rapida</p>
            <h2 className="text-xl font-black">Publicar excedente</h2>
          </div>
        </div>
        <form action={saveRescueDealAction} className="mt-5">
          <RescueFields />
          <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#18664f] px-4 text-sm font-black text-white hover:bg-[#124f3d]">
            <Leaf size={18} /> Publicar rescate
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Clock3 className="text-[#43aa8b]" />
          <h2 className="text-xl font-black">Ofertas publicadas</h2>
        </div>
        {deals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/20 bg-white/60 p-8 text-center">
            <Leaf className="mx-auto text-black/35" />
            <p className="mt-3 font-black">Todavia no publicaste rescates</p>
            <p className="mt-1 text-sm text-black/55">Usa el formulario cuando tengas excedentes.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {deals.map((deal) => {
              const expired = new Date(deal.expires_at).getTime() <= now;
              const discount = deal.original_price
                ? Math.round((1 - Number(deal.rescue_price) / Number(deal.original_price)) * 100)
                : 0;
              return (
                <article key={deal.id} className="rounded-lg bg-white p-4 shadow-lg shadow-black/5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-black">{deal.title}</h3>
                        <span className="rounded-md bg-[#e8f5ef] px-2 py-1 text-xs font-black text-[#18664f]">-{discount}%</span>
                      </div>
                      {deal.description && <p className="mt-1 text-sm text-black/55">{deal.description}</p>}
                      <p className="mt-2 text-xs font-bold text-black/45">
                        {deal.quantity_available} porciones · hasta {boliviaDateTime(deal.expires_at).replace("T", " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-black/35 line-through">Bs {Number(deal.original_price).toFixed(2)}</p>
                      <p className="text-xl font-black text-[#18664f]">Bs {Number(deal.rescue_price).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
                    <form action={toggleRescueDealAction}>
                      <input type="hidden" name="dealId" value={deal.id} />
                      <input type="hidden" name="isActive" value={String(deal.is_active)} />
                      <button className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${deal.is_active && !expired ? "bg-[#e8f5ef] text-[#18664f]" : "bg-[#f0efec] text-black/55"}`}>
                        {deal.is_active && !expired ? <Eye size={16} /> : <EyeOff size={16} />}
                        {expired ? "Vencida" : deal.is_active ? "Activa" : "Pausada"}
                      </button>
                    </form>
                    <details>
                      <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg bg-[#eef5f8] px-3 text-xs font-black text-[#245f78]">
                        <Pencil size={15} /> Editar
                      </summary>
                      <form action={saveRescueDealAction} className="mt-3 rounded-lg bg-[#f7f4ed] p-4">
                        <RescueFields deal={deal} />
                        <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white">
                          <Check size={17} /> Guardar cambios
                        </button>
                      </form>
                    </details>
                    <form action={deleteRescueDealAction} className="ml-auto">
                      <input type="hidden" name="dealId" value={deal.id} />
                      <button title="Eliminar oferta" aria-label={`Eliminar ${deal.title}`} className="grid size-9 place-items-center rounded-lg bg-[#fff0ed] text-[#a32323] hover:bg-[#ffe2dc]">
                        <Trash2 size={16} />
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
