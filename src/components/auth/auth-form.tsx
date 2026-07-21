"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction } from "@/app/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";

const initialState: AuthFormState = {
  status: "idle",
  message: "",
};

type AuthFormProps = {
  mode: "login" | "register";
};

export function AuthForm({ mode }: AuthFormProps) {
  const isLogin = mode === "login";
  const action = isLogin ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {!isLogin && (
        <label className="block">
          <span className="text-sm font-bold text-black/65">Nombre</span>
          <input
            name="fullName"
            type="text"
            required
            className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
            placeholder="Tu nombre o negocio"
          />
        </label>
      )}

      <label className="block">
        <span className="text-sm font-bold text-black/65">Correo</span>
        <input
          name="email"
          type="email"
          required
          className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
          placeholder="correo@ejemplo.com"
        />
      </label>

      <label className="block">
        <span className="text-sm font-bold text-black/65">Contrasena</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
          placeholder="Minimo 6 caracteres"
        />
      </label>

      {!isLogin && (
        <label className="block">
          <span className="text-sm font-bold text-black/65">Tipo de cuenta</span>
          <select
            name="role"
            required
            defaultValue="cliente"
            className="mt-2 h-12 w-full rounded-2xl border border-black/10 bg-white px-4 font-semibold outline-none ring-[#d62828]/20 focus:ring-4"
          >
            <option value="cliente">Cliente / estudiante</option>
            <option value="comercio">Restaurante / comercio</option>
          </select>
        </label>
      )}

      {state.message && (
        <p
          className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
            state.status === "success"
              ? "bg-[#e8f5ef] text-[#18664f]"
              : "bg-[#fff0ed] text-[#a32323]"
          }`}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-2xl bg-[#d62828] px-4 font-black text-white shadow-lg shadow-[#d62828]/20 transition hover:bg-[#b91f1f] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Procesando..." : isLogin ? "Entrar a Ubifood" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm font-semibold text-black/60">
        {isLogin ? "Aun no tienes cuenta?" : "Ya tienes cuenta?"}{" "}
        <Link
          href={isLogin ? "/auth/register" : "/auth/login"}
          className="text-[#d62828]"
        >
          {isLogin ? "Registrate" : "Inicia sesion"}
        </Link>
      </p>
    </form>
  );
}

