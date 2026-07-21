"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleHomePath } from "@/lib/auth/redirects";
import type { AppRole, AuthFormState } from "@/lib/auth/types";

const defaultError =
  "No pudimos completar la acción. Revisa tus datos e inténtalo otra vez.";

function signupErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("rate limit")) {
    return "Se hicieron varios intentos. Espera unos minutos y vuelve a probar.";
  }
  if (normalized.includes("already") || normalized.includes("registered")) {
    return "Este correo ya tiene una cuenta. Intenta iniciar sesión.";
  }
  return defaultError;
}

function loginErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("email not confirmed")) {
    return "Confirma tu correo antes de iniciar sesión.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Se hicieron varios intentos. Espera unos minutos y vuelve a probar.";
  }
  if (normalized.includes("invalid login credentials")) {
    return "El correo o la contraseña no coinciden. Revisa los datos o restablece la contraseña.";
  }
  if (normalized.includes("fetch") || normalized.includes("network")) {
    return "No pudimos conectar con Supabase. Revisa internet e intenta nuevamente.";
  }
  return "No pudimos iniciar sesión ahora. Intenta nuevamente.";
}

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readPassword(formData: FormData) {
  return String(formData.get("password") ?? "");
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
  const password = readPassword(formData);

  if (!email || !password) {
    return {
      status: "error",
      message: "Escribe tu correo y contraseña.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message: loginErrorMessage(error.message),
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
  const password = readPassword(formData);
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
      message: "La contraseña debe tener al menos 6 caracteres.",
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
      message: signupErrorMessage(error.message),
    };
  }

  return {
    status: "success",
    message:
      "Cuenta creada. Ya puedes iniciar sesión. Si recibes un correo de confirmación, ábrelo primero.",
  };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/auth/login");
}
