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

function readOptionalUrl(formData: FormData, key: string) {
  const value = readString(formData, key);
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
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
  const coverUrlInput = readString(formData, "coverUrl");
  const coverUrl = readOptionalUrl(formData, "coverUrl");
  const latitude = readNumber(formData, "latitude", -16.5);
  const longitude = readNumber(formData, "longitude", -68.15);
  const priceLevel = Math.min(
    4,
    Math.max(1, Math.round(readNumber(formData, "priceLevel", 2))),
  );

  const isLaPazLocation =
    latitude >= -17.5 &&
    latitude <= -15.5 &&
    longitude >= -69 &&
    longitude <= -67.5;

  if (!name || !address || !zone || (coverUrlInput && !coverUrl)) {
    redirect("/comercio?error=missing-fields");
  }
  if (!isLaPazLocation) {
    redirect("/comercio?error=invalid-location");
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
    cover_url: coverUrl,
  };

  const { data: restaurant, error } = restaurantId
    ? await supabase
        .from("restaurants")
        .update(payload)
        .eq("id", restaurantId)
        .select("id,slug")
        .single()
    : await supabase
        .from("restaurants")
        .insert({
          ...payload,
          status: "pending",
        })
        .select("id,slug")
        .single();

  if (error || !restaurant) {
    redirect("/comercio?error=restaurant-save");
  }

  const themePayload = {
    restaurant_id: restaurant.id,
    primary_color: readString(formData, "primaryColor") || "#d62828",
    secondary_color: readString(formData, "secondaryColor") || "#277da1",
    accent_color: readString(formData, "accentColor") || "#f9c74f",
    notebook_style: ["andino", "clasico", "minimal"].includes(
      readString(formData, "notebookStyle"),
    )
      ? readString(formData, "notebookStyle")
      : "andino",
  };

  const { error: themeError } = await supabase
    .from("restaurant_theme")
    .upsert(themePayload);

  if (themeError) {
    redirect("/comercio?error=theme-save");
  }

  revalidatePath("/comercio");
  revalidatePath("/admin");
  revalidatePath("/cliente");
  revalidatePath(`/restaurantes/${restaurant.slug}`);
  redirect("/comercio?saved=1");
}

async function getOwnedRestaurantId() {
  const profile = await requireProfile(["comercio", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!restaurant) redirect("/comercio?error=restaurant-required");
  return { restaurantId: restaurant.id, supabase };
}

function refreshCommerceWorkspace() {
  revalidatePath("/comercio");
  revalidatePath("/comercio/menu");
  revalidatePath("/comercio/rescates");
  revalidatePath("/cliente");
}

export async function setDailyMenuAvailabilityAction(formData: FormData) {
  const { restaurantId, supabase } = await getOwnedRestaurantId();
  const isAvailable = readString(formData, "isAvailable") === "true";
  const { error } = await supabase
    .from("menu_items")
    .update({ is_available: isAvailable })
    .eq("restaurant_id", restaurantId);

  if (error) redirect("/comercio?error=daily-menu");
  refreshCommerceWorkspace();
  redirect(`/comercio?daily=${isAvailable ? "menu-open" : "menu-paused"}`);
}

export async function finishActiveRescuesAction() {
  const { restaurantId, supabase } = await getOwnedRestaurantId();
  const { error } = await supabase
    .from("rescue_deals")
    .update({ is_active: false })
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);

  if (error) redirect("/comercio?error=daily-rescues");
  refreshCommerceWorkspace();
  redirect("/comercio?daily=rescues-finished");
}
