import { supabase } from "@/integrations/supabase/client";

export async function listRestaurants() {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .order("rating", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getRestaurant(id: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function topRated(limit = 6) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("is_open", true)
    .order("rating", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
