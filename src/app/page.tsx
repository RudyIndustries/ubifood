"use client";

import {
  Bike,
  BookOpen,
  Bus,
  ChevronDown,
  Clock3,
  CloudSun,
  Compass,
  LocateFixed,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  SunMedium,
  TramFront,
  UserRound,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";

const restaurants = [
  {
    id: 1,
    name: "Sajta Express",
    zone: "San Pedro",
    category: "Almuerzo",
    price: "Bs 18 - 28",
    minutes: 9,
    uv: 8,
    color: "#d62828",
    coords: { left: "30%", top: "48%" },
    menu: [
      ["Sajta de pollo", "Bs 22"],
      ["Sopa de mani", "Bs 14"],
      ["Refresco de linaza", "Bs 5"],
    ],
    rescue: "4 porciones con 35% off hasta las 19:30",
  },
  {
    id: 2,
    name: "Cafecito Illimani",
    zone: "Miraflores",
    category: "Cafe",
    price: "Bs 10 - 24",
    minutes: 13,
    uv: 6,
    color: "#277da1",
    coords: { left: "63%", top: "40%" },
    menu: [
      ["Sandwich paceño", "Bs 16"],
      ["Api morado", "Bs 8"],
      ["Torta de quinua", "Bs 12"],
    ],
    rescue: "Panaderia del dia con 25% off",
  },
  {
    id: 3,
    name: "Verde Valle Bowl",
    zone: "Sopocachi",
    category: "Saludable",
    price: "Bs 20 - 35",
    minutes: 7,
    uv: 9,
    color: "#43aa8b",
    coords: { left: "48%", top: "64%" },
    menu: [
      ["Bowl de tarwi", "Bs 28"],
      ["Ensalada andina", "Bs 24"],
      ["Jugo de tumbo", "Bs 9"],
    ],
    rescue: "2 bowls con 30% off",
  },
];

const transportSteps = [
  {
    icon: Bus,
    label: "Minibus",
    detail: "Toma linea Centro - San Pedro por 6 min",
  },
  {
    icon: TramFront,
    label: "Teleferico",
    detail: "Combina con linea Roja cuando carguemos tus rutas",
  },
  {
    icon: Bike,
    label: "Camina",
    detail: "Ultimos 350 m hasta la puerta del local",
  },
];

const setupSteps = [
  "Crear repo GitHub llamado ubifood sin README inicial.",
  "Crear proyecto Supabase ubifood y guardar las claves.",
  "Crear usuario admin@ubifood.bo en Supabase Auth.",
  "Ejecutar la migracion SQL inicial desde Supabase SQL Editor.",
];

export default function Home() {
  const [selectedId, setSelectedId] = useState(restaurants[0].id);
  const [menuOpen, setMenuOpen] = useState(true);

  const selected = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === selectedId)!,
    [selectedId],
  );

  const uvAdvice =
    selected.uv >= 8
      ? "UV alto: lleva paraguas, bloqueador y gorra."
      : "UV moderado: bloqueador ligero sera suficiente.";

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f4ed]">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col lg:grid lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="flex flex-col gap-5 px-4 pb-5 pt-5 sm:px-6 lg:max-h-screen lg:overflow-y-auto lg:py-7">
          <header className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d62828]">
                La Paz
              </p>
              <h1 className="mt-1 text-4xl font-black tracking-tight text-[#211c18]">
                Ubifood
              </h1>
            </div>
            <button
              aria-label="Abrir perfil"
              className="grid size-11 place-items-center rounded-full bg-[#211c18] text-white shadow-lg"
            >
              <UserRound size={20} />
            </button>
          </header>

          <div className="rounded-[28px] bg-[#211c18] p-4 text-white shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#f9c74f] text-[#211c18]">
                <LocateFixed size={24} />
              </div>
              <div>
                <p className="text-sm text-white/70">Tu punto de partida</p>
                <p className="font-semibold">UMSA Monoblock, La Paz</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Precio", "Distancia", "Categoria"].map((filter) => (
                <button
                  key={filter}
                  className="rounded-2xl border border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold"
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <section className="rounded-[28px] bg-white p-4 shadow-xl shadow-black/5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[#d62828]">
                  Restaurantes cerca
                </p>
                <h2 className="text-xl font-black">Menu de hoy</h2>
              </div>
              <ShoppingBag className="text-[#43aa8b]" />
            </div>
            <div className="space-y-3">
              {restaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => {
                    setSelectedId(restaurant.id);
                    setMenuOpen(true);
                  }}
                  className={`flex w-full items-center gap-3 rounded-3xl border p-3 text-left transition ${
                    selectedId === restaurant.id
                      ? "border-[#d62828] bg-[#fff4e0]"
                      : "border-black/5 bg-[#fbfaf7]"
                  }`}
                >
                  <span
                    className="grid size-12 place-items-center rounded-2xl text-white"
                    style={{ backgroundColor: restaurant.color }}
                  >
                    <Utensils size={22} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-black">
                      {restaurant.name}
                    </span>
                    <span className="text-sm text-black/60">
                      {restaurant.zone} · {restaurant.price}
                    </span>
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-[#277da1]">
                    {restaurant.minutes}m
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] bg-[#fffaf0] p-4 shadow-xl shadow-black/5">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-2xl bg-[#43aa8b] text-white">
                <Sparkles />
              </div>
              <div>
                <p className="text-sm font-bold text-[#43aa8b]">
                  Cero Desperdicio
                </p>
                <p className="font-semibold">{selected.rescue}</p>
              </div>
            </div>
          </section>
        </aside>

        <section className="relative flex min-h-[760px] flex-col bg-[#ece2d0] lg:min-h-screen">
          <div className="map-grid relative min-h-[390px] flex-1 overflow-hidden rounded-t-[36px] bg-[radial-gradient(circle_at_20%_20%,#fffaf0_0,#fffaf0_18%,transparent_19%),linear-gradient(135deg,#f9c74f_0%,#f6f0df_38%,#a8dadc_100%)] lg:rounded-l-[44px] lg:rounded-tr-none">
            <div className="absolute left-6 top-6 rounded-full bg-white/90 px-4 py-2 text-sm font-black shadow-lg">
              Mapa interactivo La Paz
            </div>
            <div className="absolute bottom-8 left-8 right-8 h-2 rotate-[-12deg] rounded-full bg-[#d62828]/80" />
            <div className="absolute bottom-28 left-20 right-20 h-2 rotate-[18deg] rounded-full bg-[#277da1]/70" />
            <div className="absolute left-1/3 top-12 h-[78%] w-2 rotate-[10deg] rounded-full bg-[#43aa8b]/70" />
            {restaurants.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => setSelectedId(restaurant.id)}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={restaurant.coords}
                aria-label={`Ver ${restaurant.name}`}
              >
                <span
                  className={`grid size-14 place-items-center rounded-full border-4 border-white text-white shadow-2xl transition ${
                    selectedId === restaurant.id ? "scale-110" : "scale-100"
                  }`}
                  style={{ backgroundColor: restaurant.color }}
                >
                  <MapPin fill="currentColor" size={26} />
                </span>
              </button>
            ))}
            <div className="absolute bottom-5 left-5 right-5 rounded-[28px] bg-white/92 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-[#d62828]">
                    Ruta sugerida
                  </p>
                  <h2 className="text-2xl font-black">{selected.name}</h2>
                  <p className="text-sm text-black/60">
                    {selected.zone} · {selected.category} · {selected.price}
                  </p>
                </div>
                <div className="grid size-14 place-items-center rounded-2xl bg-[#211c18] text-white">
                  <Compass />
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:p-6">
            <section className="rounded-[30px] bg-white p-4 shadow-xl shadow-black/5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#277da1]">
                    Como llegar
                  </p>
                  <h3 className="text-xl font-black">Auto y teleferico</h3>
                </div>
                <Bus className="text-[#d62828]" />
              </div>
              <div className="relative space-y-4 pl-7">
                <span className="route-line absolute bottom-5 left-[18px] top-5 w-1 rounded-full" />
                {transportSteps.map((step) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="relative flex gap-3">
                      <span className="absolute -left-7 grid size-7 place-items-center rounded-full bg-white ring-4 ring-[#f7f4ed]">
                        <Icon size={15} />
                      </span>
                      <div>
                        <p className="font-black">{step.label}</p>
                        <p className="text-sm text-black/60">{step.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-[30px] bg-[#211c18] p-4 text-white shadow-xl shadow-black/10">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#f9c74f]">Indice UV</p>
                  <h3 className="text-xl font-black">Cuidado al salir</h3>
                </div>
                <CloudSun className="text-[#f9c74f]" />
              </div>
              <div className="flex items-center gap-4">
                <div className="relative grid size-24 place-items-center rounded-full bg-[#f9c74f] text-[#211c18]">
                  <SunMedium size={44} />
                  <span className="absolute -right-2 -top-2 rounded-full bg-[#d62828] px-3 py-1 text-lg font-black text-white">
                    {selected.uv}
                  </span>
                </div>
                <p className="text-sm leading-6 text-white/78">{uvAdvice}</p>
              </div>
            </section>

            <section className="rounded-[30px] bg-[#fffaf0] p-4 shadow-xl shadow-black/5 sm:col-span-2">
              <button
                onClick={() => setMenuOpen((open) => !open)}
                className="flex w-full items-center justify-between"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-[#d62828] text-white">
                    <BookOpen />
                  </span>
                  <span className="text-left">
                    <span className="block text-sm font-bold text-[#d62828]">
                      Menu cuaderno
                    </span>
                    <span className="block text-xl font-black">
                      Personalizable por negocio
                    </span>
                  </span>
                </span>
                <ChevronDown
                  className={`transition ${menuOpen ? "rotate-180" : ""}`}
                />
              </button>

              {menuOpen && (
                <div className="menu-page notebook-shadow mt-4 rounded-2xl border border-[#d9b87e] bg-[#fff8e7] p-4">
                  <div className="mb-3 flex items-center justify-between border-b border-dashed border-[#d9b87e] pb-3">
                    <div>
                      <p className="text-lg font-black">{selected.name}</p>
                      <p className="text-sm text-black/60">
                        {selected.zone} · precios actualizados hoy
                      </p>
                    </div>
                    <Clock3 className="text-[#277da1]" />
                  </div>
                  <div className="space-y-3">
                    {selected.menu.map(([dish, price]) => (
                      <div
                        key={dish}
                        className="flex items-center justify-between rounded-2xl bg-white/70 px-3 py-2"
                      >
                        <span className="font-semibold">{dish}</span>
                        <span className="font-black text-[#d62828]">
                          {price}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-[30px] bg-white p-4 shadow-xl shadow-black/5 sm:col-span-2">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#43aa8b] text-white">
                  <ShieldCheck />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#43aa8b]">
                    Preparacion tecnica
                  </p>
                  <h3 className="text-xl font-black">Antes de conectar datos</h3>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {setupSteps.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-start gap-3 rounded-2xl bg-[#f7f4ed] p-3"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#211c18] text-sm font-black text-white">
                      {index + 1}
                    </span>
                    <p className="text-sm font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[30px] bg-white p-4 shadow-xl shadow-black/5 sm:col-span-2">
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[#f9c74f] text-[#211c18]">
                  <Store />
                </div>
                <div>
                  <p className="text-sm font-bold text-[#d62828]">
                    Accesos previstos
                  </p>
                  <h3 className="text-xl font-black">Cliente, comercio y admin</h3>
                </div>
              </div>
              <div className="grid gap-2 text-sm font-semibold sm:grid-cols-3">
                <p className="rounded-2xl bg-[#fff4e0] p-3">
                  Cliente: busca comida, rutas, precios y UV.
                </p>
                <p className="rounded-2xl bg-[#e8f4f6] p-3">
                  Comercio: administra menu, tema y excedentes.
                </p>
                <p className="rounded-2xl bg-[#e8f5ef] p-3">
                  Admin: aprueba y bloquea restaurantes.
                </p>
              </div>
            </section>
          </div>
        </section>
      </section>
    </main>
  );
}
