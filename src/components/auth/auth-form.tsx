"use client";

import Link from "next/link";
import {
  Building2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { useActionState, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="ubifood-stagger space-y-4">
      {!isLogin && (
        <label className="block">
          <span className="text-sm font-bold text-black/65">Nombre</span>
          <span className="ubifood-search-shell relative mt-2 block rounded-lg">
            <UserRound
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
            />
            <input
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-10 pr-4 font-semibold outline-none ring-[#00b7df]/20 focus:border-[#00b7df] focus:ring-4"
              placeholder="Tu nombre o negocio"
            />
          </span>
        </label>
      )}

      <label className="block">
        <span className="text-sm font-bold text-black/65">Correo</span>
        <span className="ubifood-search-shell relative mt-2 block rounded-lg">
          <Mail
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="h-12 w-full rounded-lg border border-black/10 bg-white pl-10 pr-4 font-semibold outline-none ring-[#00b7df]/20 focus:border-[#00b7df] focus:ring-4"
            placeholder="correo@ejemplo.com"
          />
        </span>
      </label>

      <label className="block">
        <span className="text-sm font-bold text-black/65">Contraseña</span>
        <span className="ubifood-search-shell relative mt-2 block rounded-lg">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/35"
          />
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete={isLogin ? "current-password" : "new-password"}
            required
            minLength={6}
            className="h-12 w-full rounded-lg border border-black/10 bg-white pl-10 pr-12 font-semibold outline-none ring-[#00b7df]/20 focus:border-[#00b7df] focus:ring-4"
            placeholder="Mínimo 6 caracteres"
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="ubifood-icon-button absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-md text-black/40 hover:bg-black/5 hover:text-black"
          >
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        </span>
      </label>

      {!isLogin && (
        <label className="block">
          <span className="text-sm font-bold text-black/65">Tipo de cuenta</span>
          <span className="ubifood-search-shell relative mt-2 block rounded-lg">
            <Building2
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-black/35"
            />
            <select
              name="role"
              required
              defaultValue="cliente"
              className="h-12 w-full appearance-none rounded-lg border border-black/10 bg-white pl-10 pr-4 font-semibold outline-none ring-[#00b7df]/20 focus:border-[#00b7df] focus:ring-4"
            >
              <option value="cliente">Quiero encontrar comida</option>
              <option value="comercio">Tengo un restaurante</option>
            </select>
          </span>
        </label>
      )}

      {state.message && (
        <p
          className={`ubifood-search-pop rounded-lg px-4 py-3 text-sm font-semibold ${
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
        className="ubifood-action h-12 w-full rounded-lg bg-[#f36f21] px-4 font-black text-white shadow-lg shadow-[#f36f21]/20 transition hover:bg-[#dc5e13] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {pending ? "Procesando..." : isLogin ? "Entrar a Ubifood" : "Crear cuenta"}
      </button>

      <p className="text-center text-sm font-semibold text-black/60">
        {isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
        <Link
          href={isLogin ? "/auth/register" : "/auth/login"}
          className="font-black text-[#f36f21]"
        >
          {isLogin ? "Regístrate" : "Inicia sesión"}
        </Link>
      </p>
    </form>
  );
}
