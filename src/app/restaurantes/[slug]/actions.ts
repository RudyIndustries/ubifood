"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function readString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function getRatingContext(formData: FormData) {
  const profile = await requireProfile(["cliente"]);
  const restaurantId = readString(formData, "restaurantId");
  const supabase = await createSupabaseServerClient();
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id,slug")
    .eq("id", restaurantId)
    .eq("status", "approved")
    .maybeSingle<{ id: string; slug: string }>();

  if (!restaurant) redirect("/cliente");
  return { profile, restaurant, supabase };
}

export async function saveRestaurantRatingAction(formData: FormData) {
  const { profile, restaurant, supabase } = await getRatingContext(formData);
  const rating = Number(readString(formData, "rating"));
  const rawComment = readString(formData, "comment");
  const comment = rawComment || null;
  const destination = `/restaurantes/${restaurant.slug}`;

  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || rawComment.length > 500) {
    redirect(`${destination}?rating=invalid#calificaciones`);
  }

  const { error } = await supabase.from("restaurant_ratings").upsert(
    {
      restaurant_id: restaurant.id,
      user_id: profile.id,
      rating,
      comment,
    },
    { onConflict: "restaurant_id,user_id" },
  );

  if (error) redirect(`${destination}?rating=error#calificaciones`);

  revalidatePath(destination);
  revalidatePath("/cliente");
  redirect(`${destination}?rating=saved#calificaciones`);
}

export async function deleteRestaurantRatingAction(formData: FormData) {
  const { profile, restaurant, supabase } = await getRatingContext(formData);
  const destination = `/restaurantes/${restaurant.slug}`;
  const { error } = await supabase
    .from("restaurant_ratings")
    .delete()
    .eq("restaurant_id", restaurant.id)
    .eq("user_id", profile.id);

  if (error) redirect(`${destination}?rating=error#calificaciones`);

  revalidatePath(destination);
  revalidatePath("/cliente");
  redirect(`${destination}?rating=deleted#calificaciones`);
}
