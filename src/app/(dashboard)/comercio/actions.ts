"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function readNumber(formData: FormData, key: string, fallback: number) {
  const value = Number(readString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

export async function saveRestaurantAction(formData: FormData) {
  const profile = await requireProfile(["comercio", "admin"]);
  const supabase = await createSupabaseServerClient();

  const restaurantId = readString(formData, "restaurantId");
  const name = readString(formData, "name");
  const address = readString(formData, "address");
  const zone = readString(formData, "zone");
  const category = readString(formData, "category") || "Comida";
  const phone = readString(formData, "phone") || null;
  const description = readString(formData, "description") || null;
  const openingHoursText = readString(formData, "openingHours") || "Lun-Dom 09:00-21:00";
  const latitude = readNumber(formData, "latitude", -16.5);
  const longitude = readNumber(formData, "longitude", -68.15);
  const priceLevel = Math.min(
    4,
    Math.max(1, Math.round(readNumber(formData, "priceLevel", 2))),
  );

  if (!name || !address || !zone) {
    redirect("/comercio?error=missing-fields");
  }

  const payload = {
    owner_id: profile.id,
    name,
    slug: restaurantId ? undefined : `${toSlug(name)}-${profile.id.slice(0, 8)}`,
    description,
    category,
    phone,
    address,
    zone,
    latitude,
    longitude,
    price_level: priceLevel,
    opening_hours: {
      display: openingHoursText,
    },
  };

  const { data: restaurant, error } = restaurantId
    ? await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", restaurantId)
        .select("id")
        .single()
    : await supabase
        .from("restaurants")
        .insert({
          ...payload,
          status: "pending",
        })
        .select("id")
        .single();

  if (error || !restaurant) {
    redirect("/comercio?error=restaurant-save");
  }

  const themePayload = {
    restaurant_id: restaurant.id,
    primary_color: readString(formData, "primaryColor") || "#d62828",
    secondary_color: readString(formData, "secondaryColor") || "#277da1",
    accent_color: readString(formData, "accentColor") || "#f9c74f",
    notebook_style: "andino",
  };

  const { error: themeError } = await supabase
    .from("restaurant_theme")
    .upsert(themePayload);

  if (themeError) {
    redirect("/comercio?error=theme-save");
  }

  revalidatePath("/comercio");
  revalidatePath("/admin");
  redirect("/comercio?saved=1");
}

