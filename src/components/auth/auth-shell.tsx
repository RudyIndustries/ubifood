import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CableCar, Leaf, MapPinned } from "lucide-react";

type AuthShellProps = {
  mode: "login" | "register";
  children: React.ReactNode;
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const isLogin = mode === "login";

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f4f6f2] lg:grid lg:grid-cols-[minmax(340px,0.85fr)_minmax(480px,1.15fr)]">
      <aside className="relative hidden min-h-screen overflow-hidden bg-[#171a17] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <Image
          src="/banner-la-paz.jpg"
          alt="Vista nocturna de La Paz y el Illimani"
          fill
          sizes="45vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-[#101412]/65" aria-hidden="true" />
        <div className="absolute inset-y-0 right-0 z-20 flex w-2 flex-col" aria-hidden="true">
          <span className="flex-1 bg-[#f36f21]" />
          <span className="flex-1 bg-[#00b7df]" />
          <span className="flex-1 bg-[#82c91e]" />
          <span className="flex-1 bg-[#c86ce8]" />
        </div>

        <Link href="/" className="ubifood-brand relative z-10 flex items-center gap-3 self-start">
          <span className="grid size-14 place-items-center overflow-hidden rounded-lg bg-white">
            <Image
              src="/brand-logo-la-paz.png"
              alt="La Paz, capital del cielo"
              width={112}
              height={84}
              className="h-full w-full scale-125 object-contain"
              priority
            />
          </span>
          <span>
            <span className="block text-2xl font-black leading-none">UBIFOOD</span>
            <span className="mt-1 block text-[10px] font-bold uppercase text-white/45">
              Hecho para La Paz
            </span>
          </span>
        </Link>

        <div className="ubifood-reveal relative z-10 max-w-md">
          <p className="text-xs font-black uppercase text-[#ffca0a]">Come cerca. Llega mejor.</p>
          <h2 className="mt-3 text-4xl font-black leading-tight">
            La ciudad y su comida, en el mismo mapa.
          </h2>
          <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/60">
            Descubre sabores paceños, precios del día y la mejor forma de llegar.
          </p>
        </div>

        <div className="ubifood-stagger relative z-10 grid grid-cols-3 gap-3 text-xs font-black">
          <span className="border-t-2 border-[#f36f21] pt-3">
            <MapPinned className="mb-2 text-[#f36f21]" size={19} /> Cerca de ti
          </span>
          <span className="border-t-2 border-[#00b7df] pt-3">
            <CableCar className="mb-2 text-[#00b7df]" size={19} /> Rutas claras
          </span>
          <span className="border-t-2 border-[#82c91e] pt-3">
            <Leaf className="mb-2 text-[#82c91e]" size={19} /> Crazy Hour
          </span>
        </div>
      </aside>

      <section className="min-h-screen min-w-0">
        <div className="relative flex h-48 items-end overflow-hidden p-4 text-white lg:hidden">
          <Image
            src="/banner-la-paz.jpg"
            alt="Vista de La Paz y el Illimani"
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
          <div className="absolute inset-0 bg-[#101412]/55" aria-hidden="true" />
          <Link href="/" className="ubifood-brand relative z-10 flex items-center gap-3">
              <span className="grid size-12 place-items-center overflow-hidden rounded-lg bg-white">
                <Image
                  src="/brand-logo-la-paz.png"
                  alt="Logo de La Paz"
                  width={96}
                  height={72}
                  className="h-full w-full scale-125 object-contain"
                  priority
                />
              </span>
              <span>
                <span className="block text-xl font-black">UBIFOOD</span>
                <span className="text-[10px] font-bold uppercase text-white/70">Hecho para La Paz</span>
              </span>
          </Link>
        </div>

        <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-8 sm:px-8 lg:min-h-screen">
          <div className="ubifood-panel-rise min-w-0 max-w-full flex-1 sm:max-w-md">
            <Link
              href="/"
              className="ubifood-action mb-7 inline-flex h-9 items-center gap-2 rounded-lg px-2 text-xs font-black text-black/50 hover:bg-black/5 hover:text-black"
            >
              <ArrowLeft size={16} /> Volver al inicio
            </Link>
            <p className="text-xs font-black uppercase text-[#00a6cc]">
              {isLogin ? "Bienvenido" : "Nueva cuenta"}
            </p>
            <h1 className="mt-2 text-4xl font-black">
              {isLogin ? "Inicia sesión" : "Únete a Ubifood"}
            </h1>
            <p className="mb-8 mt-3 text-sm font-semibold leading-6 text-black/55">
              {isLogin
                ? "Continúa explorando restaurantes, rutas y ofertas en La Paz."
                : "Elige tu tipo de cuenta y empieza a disfrutar Ubifood."}
            </p>
            {children}
          </div>
        </div>
      </section>
    </main>
  );
}
