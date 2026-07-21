"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleHomePath } from "@/lib/auth/redirects";
import type { AppRole, AuthFormState } from "@/lib/auth/types";

const defaultError =
  "No pudimos completar la accion. Revisa tus datos e intentalo otra vez.";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isPublicSignupRole(
  role: string,
): role is Extract<AppRole, "cliente" | "comercio"> {
  return role === "cliente" || role === "comercio";
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");

  if (!email || !password) {
    return {
      status: "error",
      message: "Escribe tu correo y contrasena.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message: "Correo o contrasena incorrectos.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      status: "error",
      message: defaultError,
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: AppRole }>();

  redirect(roleHomePath(profile?.role));
}

export async function registerAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const fullName = readString(formData, "fullName");
  const email = readString(formData, "email").toLowerCase();
  const password = readString(formData, "password");
  const role = readString(formData, "role");

  if (!fullName || !email || !password || !role) {
    return {
      status: "error",
      message: "Completa todos los campos.",
    };
  }

  if (password.length < 6) {
    return {
      status: "error",
      message: "La contrasena debe tener al menos 6 caracteres.",
    };
  }

  if (!isPublicSignupRole(role)) {
    return {
      status: "error",
      message: "Solo puedes registrarte como cliente o comercio.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    return {
      status: "error",
      message: error.message || defaultError,
    };
  }

  return {
    status: "success",
    message:
      "Cuenta creada. Si Supabase pide confirmar correo, confirma antes de iniciar sesion.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}

