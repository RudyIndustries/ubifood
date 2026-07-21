import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { requireProfile } from "@/lib/auth/session";
import type { MenuItem, Restaurant } from "@/lib/restaurants/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  deleteMenuItemAction,
  saveMenuItemAction,
  toggleMenuItemAction,
} from "./actions";

type MenuPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

type RestaurantSummary = Pick<
  Restaurant,
  "id" | "name" | "status" | "restaurant_theme"
>;

const inputClass =
  "mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-semibold outline-none ring-[#d62828]/20 focus:ring-4";

function firstParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function savedMessage(value: string | undefined) {
  if (value === "created") return "Plato agregado al menu.";
  if (value === "updated") return "Cambios del plato guardados.";
  if (value === "availability") return "Disponibilidad actualizada.";
  if (value === "deleted") return "Plato eliminado.";
  return null;
}

function MenuItemFields({ item }: { item?: MenuItem }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="menuItemId" value={item?.id ?? ""} />
      <label className="block">
        <span className="text-sm font-bold text-black/65">Plato</span>
        <input
          name="name"
          required
          maxLength={100}
          defaultValue={item?.name ?? ""}
          className={inputClass}
          placeholder="Ej. Sajta de pollo"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Categoria</span>
        <input
          name="category"
          required
          maxLength={60}
          defaultValue={item?.category ?? "Menu del dia"}
          className={inputClass}
          placeholder="Almuerzo, bebidas..."
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">Precio (Bs)</span>
        <input
          name="price"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={item ? Number(item.price).toFixed(2) : ""}
          className={inputClass}
          placeholder="25.00"
        />
      </label>
      <label className="block">
        <span className="text-sm font-bold text-black/65">URL de imagen</span>
        <input
          name="imageUrl"
          type="url"
          maxLength={500}
          defaultValue={item?.image_url ?? ""}
          className={inputClass}
          placeholder="https://..."
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-sm font-bold text-black/65">Descripcion</span>
        <textarea
          name="description"
          maxLength={300}
          defaultValue={item?.description ?? ""}
          className="mt-2 min-h-20 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
          placeholder="Ingredientes, acompanamiento o detalle del plato"
        />
      </label>
    </div>
  );
}

export default async function ComercioMenuPage({ searchParams }: MenuPageProps) {
  const profile = await requireProfile(["comercio", "admin"]);
  const params = searchParams ? await searchParams : {};
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id,name,status,restaurant_theme(*)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<RestaurantSummary>();

  if (!restaurant) {
    return (
      <section className="mx-auto max-w-xl rounded-lg bg-white p-6 shadow-xl shadow-black/5">
        <UtensilsCrossed className="text-[#d62828]" />
        <h1 className="mt-4 text-2xl font-black">Primero registra tu restaurante</h1>
        <p className="mt-2 text-sm leading-6 text-black/60">
          Necesitamos el negocio antes de asociar platos, precios y disponibilidad.
        </p>
        <Link
          href="/comercio"
          className="mt-5 inline-flex h-11 items-center gap-2 rounded-lg bg-[#d62828] px-4 text-sm font-black text-white"
        >
          <ArrowLeft size={18} />
          Ir al restaurante
        </Link>
      </section>
    );
  }

  const { data } = await supabase
    .from("menu_items")
    .select("*")
    .eq("restaurant_id", restaurant.id)
    .order("category")
    .order("name")
    .returns<MenuItem[]>();
  const items = data ?? [];
  const availableCount = items.filter((item) => item.is_available).length;
  const message = savedMessage(firstParam(params, "saved"));
  const error = firstParam(params, "error");

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <header className="lg:col-span-2">
        <Link
          href="/comercio"
          className="inline-flex items-center gap-2 text-sm font-bold text-black/60 hover:text-black"
        >
          <ArrowLeft size={17} />
          Restaurante
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-[#d62828]">Menu del negocio</p>
            <h1 className="text-3xl font-black">{restaurant.name}</h1>
          </div>
          <div className="flex gap-2 text-sm font-black">
            <span className="rounded-lg bg-white px-3 py-2">{items.length} platos</span>
            <span className="rounded-lg bg-[#e8f5ef] px-3 py-2 text-[#18664f]">
              {availableCount} disponibles
            </span>
          </div>
        </div>
        {message && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-[#e8f5ef] px-4 py-3 text-sm font-bold text-[#18664f]">
            <Check size={18} /> {message}
          </p>
        )}
        {error && (
          <p className="mt-3 rounded-lg bg-[#fff0ed] px-4 py-3 text-sm font-bold text-[#a32323]">
            No se pudo completar la accion. Revisa los datos e intenta nuevamente.
          </p>
        )}
      </header>

      <section className="self-start rounded-lg bg-[#fffaf0] p-5 shadow-xl shadow-black/5 lg:sticky lg:top-24">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-lg bg-[#d62828] text-white">
            <Plus size={20} />
          </span>
          <div>
            <p className="text-sm font-bold text-[#d62828]">Nuevo plato</p>
            <h2 className="text-xl font-black">Agregar al menu</h2>
          </div>
        </div>
        <form action={saveMenuItemAction} className="mt-5">
          <MenuItemFields />
          <button className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#d62828] px-4 text-sm font-black text-white hover:bg-[#b91f1f]">
            <Plus size={18} />
            Agregar plato
          </button>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <BookOpen className="text-[#277da1]" />
          <h2 className="text-xl font-black">Platos cargados</h2>
        </div>
        {items.length === 0 ? (
          <div className="rounded-lg border border-dashed border-black/20 bg-white/60 p-8 text-center">
            <UtensilsCrossed className="mx-auto text-black/35" />
            <p className="mt-3 font-black">Tu menu todavia esta vacio</p>
            <p className="mt-1 text-sm text-black/55">Agrega el primer plato desde el formulario.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {items.map((item) => (
              <article key={item.id} className="menu-page rounded-lg bg-white p-4 shadow-lg shadow-black/5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black">{item.name}</h3>
                      <span className="rounded-md bg-[#f7f4ed] px-2 py-1 text-xs font-bold text-black/60">
                        {item.category}
                      </span>
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm leading-5 text-black/55">{item.description}</p>
                    )}
                  </div>
                  <p className="whitespace-nowrap text-xl font-black text-[#d62828]">
                    Bs {Number(item.price).toFixed(2)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-black/5 pt-3">
                  <form action={toggleMenuItemAction}>
                    <input type="hidden" name="menuItemId" value={item.id} />
                    <input type="hidden" name="isAvailable" value={String(item.is_available)} />
                    <button
                      title={item.is_available ? "Marcar agotado" : "Marcar disponible"}
                      className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-black ${
                        item.is_available
                          ? "bg-[#e8f5ef] text-[#18664f]"
                          : "bg-[#f0efec] text-black/55"
                      }`}
                    >
                      {item.is_available ? <Eye size={16} /> : <EyeOff size={16} />}
                      {item.is_available ? "Disponible" : "Agotado"}
                    </button>
                  </form>
                  <details className="group">
                    <summary className="inline-flex h-9 cursor-pointer list-none items-center gap-2 rounded-lg bg-[#eef5f8] px-3 text-xs font-black text-[#245f78]">
                      <Pencil size={15} /> Editar
                    </summary>
                    <form action={saveMenuItemAction} className="mt-3 rounded-lg bg-[#f7f4ed] p-4">
                      <MenuItemFields item={item} />
                      <button className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-[#211c18] px-4 text-sm font-black text-white">
                        <Check size={17} /> Guardar cambios
                      </button>
                    </form>
                  </details>
                  <form action={deleteMenuItemAction} className="ml-auto">
                    <input type="hidden" name="menuItemId" value={item.id} />
                    <button
                      title="Eliminar plato"
                      aria-label={`Eliminar ${item.name}`}
                      className="grid size-9 place-items-center rounded-lg bg-[#fff0ed] text-[#a32323] hover:bg-[#ffe2dc]"
                    >
                      <Trash2 size={16} />
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
