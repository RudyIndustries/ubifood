"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function readPrice(formData: FormData) {
  const value = Number(readString(formData, "price").replace(",", "."));
  return Number.isFinite(value) ? value : Number.NaN;
}

function isValidImageUrl(value: string) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function getRestaurantContext() {
  const profile = await requireProfile(["comercio", "admin"]);
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (!restaurant) {
    redirect("/comercio?error=restaurant-required");
  }

  return { restaurant, supabase };
}

function refreshMenuPaths() {
  revalidatePath("/comercio/menu");
  revalidatePath("/cliente");
}

export async function saveMenuItemAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const menuItemId = readString(formData, "menuItemId");
  const name = readString(formData, "name");
  const category = readString(formData, "category") || "Menu del dia";
  const description = readString(formData, "description") || null;
  const imageUrl = readString(formData, "imageUrl");
  const price = readPrice(formData);

  if (!name || !Number.isFinite(price) || price < 0 || !isValidImageUrl(imageUrl)) {
    redirect("/comercio/menu?error=invalid-item");
  }

  const payload = {
    name,
    category,
    description,
    price,
    image_url: imageUrl || null,
  };

  const query = menuItemId
    ? supabase
        .from("menu_items")
        .update(payload)
        .eq("id", menuItemId)
        .eq("restaurant_id", restaurant.id)
    : supabase.from("menu_items").insert({
        ...payload,
        restaurant_id: restaurant.id,
        is_available: true,
      });

  const { data, error } = await query.select("id").maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/menu?error=item-save");
  }

  refreshMenuPaths();
  redirect(`/comercio/menu?saved=${menuItemId ? "updated" : "created"}`);
}

export async function toggleMenuItemAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const menuItemId = readString(formData, "menuItemId");
  const isAvailable = readString(formData, "isAvailable") === "true";

  if (!menuItemId) {
    redirect("/comercio/menu?error=invalid-item");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .update({ is_available: !isAvailable })
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/menu?error=availability-save");
  }

  refreshMenuPaths();
  redirect("/comercio/menu?saved=availability");
}

export async function deleteMenuItemAction(formData: FormData) {
  const { restaurant, supabase } = await getRestaurantContext();
  const menuItemId = readString(formData, "menuItemId");

  if (!menuItemId) {
    redirect("/comercio/menu?error=invalid-item");
  }

  const { data, error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", menuItemId)
    .eq("restaurant_id", restaurant.id)
    .select("id")
    .maybeSingle<{ id: string }>();

  if (error || !data) {
    redirect("/comercio/menu?error=item-delete");
  }

  refreshMenuPaths();
  redirect("/comercio/menu?saved=deleted");
}
