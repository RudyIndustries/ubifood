import Link from "next/link";
import { Store } from "lucide-react";
import { AuthForm } from "@/components/auth/auth-form";

export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f7f4ed] px-4 py-8">
      <section className="w-full max-w-md rounded-[32px] bg-white p-5 shadow-2xl shadow-black/10">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-black text-[#d62828]"
        >
          <Store size={18} />
          Ubifood
        </Link>
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#43aa8b]">
          Nueva cuenta
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Registrate</h1>
        <p className="mb-6 mt-2 text-sm leading-6 text-black/60">
          Crea una cuenta cliente o comercio. El rol admin solo se asigna desde
          Supabase.
        </p>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}

