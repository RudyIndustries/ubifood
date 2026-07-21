import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { roleHomePath } from "./redirects";
import type { AppRole, Profile } from "./types";

export async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id,email,full_name,role")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return profile;
}

export async function requireProfile(allowedRoles?: AppRole[]) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/auth/login");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect(roleHomePath(profile.role));
  }

  return profile;
}
