import { supabase } from "@/integrations/supabase/client";

export async function listFavourites(userId: string) {
  const { data, error } = await supabase
    .from("favourites")
    .select("id, restaurant_id, created_at")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function isFavourite(userId: string, restaurantId: string) {
  const { data, error } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function addFavourite(userId: string, restaurantId: string) {
  const { error } = await supabase
    .from("favourites")
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error && !error.message.includes("duplicate")) throw error;
}

export async function removeFavourite(userId: string, restaurantId: string) {
  const { error } = await supabase
    .from("favourites")
    .delete()
    .eq("user_id", userId)
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
}
