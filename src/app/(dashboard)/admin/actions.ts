"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { RestaurantStatus } from "@/lib/restaurants/types";

const allowedStatuses: RestaurantStatus[] = ["pending", "approved", "blocked"];

export async function updateRestaurantStatusAction(formData: FormData) {
  await requireProfile(["admin"]);

  const restaurantId = String(formData.get("restaurantId") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as RestaurantStatus;

  if (!restaurantId || !allowedStatuses.includes(status)) {
    redirect("/admin?error=invalid-status");
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("restaurants")
    .update({ status })
    .eq("id", restaurantId);

  if (error) {
    redirect("/admin?error=status-save");
  }

  revalidatePath("/admin");
  revalidatePath("/cliente");
  redirect(`/admin?status=${status}`);
}

