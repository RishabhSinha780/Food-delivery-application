import { supabase } from "@/integrations/supabase/client";

export async function listRestaurantReviews(restaurantId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, customer_id, profiles:customer_id(display_name)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function submitReview(input: {
  customerId: string;
  restaurantId: string;
  rating: number;
  comment?: string;
}) {
  const { error } = await supabase.from("reviews").insert({
    customer_id: input.customerId,
    restaurant_id: input.restaurantId,
    rating: input.rating,
    comment: input.comment ?? null,
  });
  if (error) throw error;
}

export async function averageRating(restaurantId: string) {
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("restaurant_id", restaurantId);
  if (error) throw error;
  if (!data || data.length === 0) return { avg: 0, count: 0 };
  const avg = data.reduce((s, r) => s + r.rating, 0) / data.length;
  return { avg, count: data.length };
}
