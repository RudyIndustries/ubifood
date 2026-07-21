"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readNumber(formData: FormData, key: string) {
  return Number(readString(formData, key).replace(",", "."));
}

function readBoliviaDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}:00-04:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getRestaurantContext() {
  const profile = await requireProfile(["comercio", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id,status")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: "pending" | "approved" | "blocked" }>();

  if (!restaurant) {
    redirect("/comercio?error=restaurant-required");
  }

  return { restaurant, supabase };
}

function refreshRescuePaths() {
  revalidatePath("/comercio/rescates");
  revalidatePath("/cliente");
}

export async function saveRescueDealAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const dealId = readString(formData, "dealId");
  const title = readString(formData, "title");
  const description = readString(formData, "description") || null;
  const originalPrice = readNumber(formData, "originalPrice");
  const rescuePrice = readNumber(formData, "rescuePrice");
  const quantity = Math.floor(readNumber(formData, "quantity"));
  const expiresAt = readBoliviaDate(readString(formData, "expiresAt"));

  if (
    !title ||
    !Number.isFinite(originalPrice) ||
    !Number.isFinite(rescuePrice) ||
    originalPrice <= 0 ||
    rescuePrice < 0 ||
    rescuePrice >= originalPrice ||
    !Number.isFinite(quantity) ||
    quantity < 1 ||
    !expiresAt ||
    expiresAt.getTime() <= Date.now()
  ) {
    redirect("/comercio/rescates?error=invalid-deal");
  }

  if (!dealId && restaurant.status !== "approved") {
    redirect("/comercio/rescates?error=restaurant-not-approved");
  }

  const payload = {
    title,
    description,
    original_price: originalPrice,
    rescue_price: rescuePrice,
    quantity_available: quantity,
    expires_at: expiresAt.toISOString(),
  };
  const query = dealId
    ? supabase
        .from("rescue_deals")
        .update(payload)
        .eq("id", dealId)
        .eq("restaurant_id", restaurant.id)
    : supabase.from("rescue_deals").insert({
        ...payload,
        restaurant_id: restaurant.id,
        is_active: true,
      });
  const { data, error } = await query.select("id").maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/rescates?error=deal-save");
  }

  refreshRescuePaths();
  redirect(`/comercio/rescates?saved=${dealId ? "updated" : "created"}`);
}

export async function toggleRescueDealAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const dealId = readString(formData, "dealId");
  const isActive = readString(formData, "isActive") === "true";

  if (!dealId) {
    redirect("/comercio/rescates?error=invalid-deal");
  }

  const { data, error } = await supabase
    .from("rescue_deals")
    .update({ is_active: !isActive })
    .eq("id", dealId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/rescates?error=deal-toggle");
  }

  refreshRescuePaths();
  redirect("/comercio/rescates?saved=status");
}

export async function deleteRescueDealAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const dealId = readString(formData, "dealId");

  if (!dealId) {
    redirect("/comercio/rescates?error=invalid-deal");
  }

  const { data, error } = await supabase
    .from("rescue_deals")
    .delete()
    .eq("id", dealId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/rescates?error=deal-delete");
  }

  refreshRescuePaths();
  redirect("/comercio/rescates?saved=deleted");
}
