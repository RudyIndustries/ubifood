import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CableCar,
  Download,
  Leaf,
  MapPinned,
  Search,
  Store,
  SunMedium,
} from "lucide-react";

const highlights = [
  {
    Icon: Search,
    color: "#f36f21",
    title: "Encuentra qué comer",
    text: "Busca restaurantes, platos y precios cerca de ti.",
  },
  {
    Icon: CableCar,
    color: "#00b7df",
    title: "Llega con una ruta clara",
    text: "Compara caminata, Mi Teleférico y PumaKatari.",
  },
  {
    Icon: Leaf,
    color: "#82c91e",
    title: "Crazy Hour",
    text: "Aprovecha ofertas del día antes de que se desperdicien.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f6f2] text-[#171a17]">
      <div className="h-2 w-full bg-[#f36f21]" aria-hidden="true" />
      <header className="border-b border-black/5 bg-white/95 px-4">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="ubifood-brand flex min-w-0 items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-black/5 bg-white">
              <Image
                src="/brand-logo-la-paz.png"
                alt="La Paz, capital del cielo"
                width={96}
                height={72}
                className="h-full w-full scale-125 object-contain"
                priority
              />
            </span>
            <span className="min-w-0">
              <span className="block text-xl font-black leading-none">UBIFOOD</span>
              <span className="mt-1 block text-[10px] font-bold uppercase text-black/45">
                Hecho para La Paz
              </span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1 sm:gap-2" aria-label="Acceso a Ubifood">
            <Link
              href="/auth/login"
              className="ubifood-action inline-flex h-10 items-center justify-center rounded-lg px-2 text-xs font-black text-[#171a17] hover:bg-black/5 sm:px-4 sm:text-sm"
            >
              Iniciar sesión
            </Link>
            <Link
              href="/auth/register"
              className="ubifood-action hidden h-10 items-center justify-center gap-2 rounded-lg bg-[#f36f21] px-4 text-sm font-black text-white sm:inline-flex"
            >
              Crear cuenta <ArrowRight size={16} />
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-[#171a17] px-4 text-white">
        <Image
          src="/banner-la-paz.jpg"
          alt="La ciudad de La Paz con el Illimani"
          fill
          sizes="100vw"
          className="-z-20 object-cover object-center"
          priority
        />
        <div className="absolute inset-0 -z-10 bg-[#101412]/65" aria-hidden="true" />
        <div className="absolute inset-y-0 left-0 w-2 bg-[#82c91e]" aria-hidden="true" />
        <div className="absolute inset-y-0 right-0 flex w-3 flex-col" aria-hidden="true">
          <span className="flex-1 bg-[#00b7df]" />
          <span className="flex-1 bg-[#ffca0a]" />
          <span className="flex-1 bg-[#c86ce8]" />
        </div>

        <div className="ubifood-reveal relative z-10 mx-auto flex min-h-[620px] max-w-4xl flex-col items-center justify-center py-14 text-center sm:min-h-[680px]">
          <div className="ubifood-soft-pulse mb-7 grid size-32 place-items-center overflow-hidden rounded-lg bg-white shadow-2xl shadow-black/25 sm:size-40">
            <Image
              src="/brand-logo-la-paz.png"
              alt="Logo de La Paz"
              width={320}
              height={240}
              className="h-full w-full scale-125 object-contain"
              priority
            />
          </div>

          <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-[#ffca0a]">
            <MapPinned size={16} /> Gastronomía y movilidad paceña
          </p>
          <h1 className="mt-4 text-5xl font-black sm:text-7xl">UBIFOOD</h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/70 sm:text-xl">
            Encuentra comida cerca, compara precios y descubre cómo llegar sin perder tiempo.
          </p>

          <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
            <Link
              href="/auth/login"
              className="ubifood-action inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-[#f36f21] px-5 text-sm font-black text-white"
            >
              Entrar a Ubifood <ArrowRight size={18} />
            </Link>
            <Link
              href="/auth/register"
              className="ubifood-action inline-flex h-12 flex-1 items-center justify-center rounded-lg border border-white/20 bg-white/10 px-5 text-sm font-black text-white"
            >
              Registrarme
            </Link>
            <a
              href="/downloads/UBIFOOD.apk"
              download="UBIFOOD.apk"
              className="ubifood-action inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-black text-[#171a17]"
            >
              <Download size={18} /> Descargar APK
            </a>
          </div>

          <div className="ubifood-stagger mt-9 flex flex-wrap justify-center gap-2 text-xs font-black text-white/75">
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
              <Store size={15} className="text-[#ffca0a]" /> Negocios locales
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
              <CableCar size={15} className="text-[#00b7df]" /> Rutas urbanas
            </span>
            <span className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-2">
              <SunMedium size={15} className="text-[#ffca0a]" /> UV de tu zona
            </span>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-16" aria-labelledby="ubifood-benefits">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase text-[#00a6cc]">Todo en un lugar</p>
            <h2 id="ubifood-benefits" className="mt-2 text-3xl font-black sm:text-4xl">
              Tu próxima comida empieza aquí
            </h2>
          </div>
          <div className="ubifood-stagger mt-9 grid gap-8 md:grid-cols-3">
            {highlights.map(({ Icon, color, title, text }) => (
              <article key={title} className="ubifood-lift border-t-4 pt-5" style={{ borderColor: color }}>
                <span
                  className="grid size-11 place-items-center rounded-lg text-white"
                  style={{ backgroundColor: color }}
                >
                  <Icon size={21} />
                </span>
                <h3 className="mt-4 text-xl font-black">{title}</h3>
                <p className="mt-2 text-sm font-semibold leading-6 text-black/55">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5 bg-[#f4f6f2] px-4 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-xs font-bold text-black/45">
          <span>UBIFOOD · La Paz, Bolivia</span>
          <Link href="/auth/login" className="text-[#f36f21]">Ingresar</Link>
        </div>
      </footer>
    </main>
  );
}
